import { VictimPersona } from "./types";

// Well-known, publicly documented issuer test card numbers (Stripe/Visa/etc.).
// These are not real accounts and are the standard numbers used industry-wide
// for testing payment flows. Using this fixed list instead of asking a model
// to generate novel checksum-valid numbers avoids producing new, previously
// unpublished card numbers that happen to pass Luhn validation.
const TEST_CARDS = [
  { number: "4242424242424242", label: "Stripe test Visa" },
  { number: "4000056655665556", label: "Stripe test Visa (debit)" },
  { number: "5555555555554444", label: "Stripe test Mastercard" },
  { number: "378282246310005", label: "Stripe test Amex" },
  { number: "6011111111111117", label: "Stripe test Discover" },
];

function randomTestCard() {
  const card = TEST_CARDS[Math.floor(Math.random() * TEST_CARDS.length)];
  const mm = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
  const yy = String(new Date().getFullYear() % 100 + 2 + Math.floor(Math.random() * 3));
  const cvv = String(Math.floor(Math.random() * 900) + 100);
  return {
    number: card.number,
    exp: `${mm}/${yy}`,
    cvv,
    label: card.label,
  };
}

interface RawPersonaShape {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  ssnOrId: string;
  notes: string;
}

/**
 * Generates synthetic (non-real) persona records via the Anthropic API, then attaches
 * a well-known payment-industry test card number locally (never LLM-generated).
 */
export async function generateVictimPersonas(
  targetUrl: string,
  count: number = 5
): Promise<VictimPersona[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("Server is missing ANTHROPIC_API_KEY.");
  if (!Number.isInteger(count) || count < 1 || count > 10) {
    throw new Error("Persona count must be an integer between 1 and 10.");
  }

  const prompt = `Generate ${count} completely fictional, clearly-synthetic decoy identity records for use as junk/noise data in a security demo.
None of these should resemble any real person. Output MUST be a valid JSON array of objects with exactly these fields:
- fullName (string, invented full name)
- email (string, invented address using the reserved domain example.com)
- phone (string, standard 10-digit North American format, using a clearly fake exchange like 555)
- address (string, a plausible-looking but invented street/city/postal code)
- ssnOrId (string, a placeholder identifier in the format 000-00-0000, never a real-looking SSN)
- notes (string, a short, mildly rambling, good-natured message from an "elderly/confused" fictional persona, e.g. "Hope this reaches the right department, my grandson set up this computer for me")

Keep everything obviously fictional and lighthearted. Return ONLY the raw JSON array, no markdown fences, no commentary.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const detail = response.status === 401
      ? "Check ANTHROPIC_API_KEY in .env.local. Use a key from your Anthropic API account."
      : response.status === 402
        ? "Check credits on the Anthropic account associated with your API key."
        : response.status === 429
          ? "Anthropic rate limit reached. Wait a moment and try again."
          : "Check your Anthropic account, model access and service status.";
    throw new Error(`Anthropic API error (${response.status}). ${detail}`);
  }
  const res = await response.json() as {
    content?: { type: string; text?: string }[];
    stop_reason?: string;
  };
  if (res.stop_reason === "max_tokens") {
    throw new Error("Claude's persona response was cut short. Try a smaller fleet.");
  }
  const raw = res.content?.filter(block => block.type === "text").map(block => block.text || "").join("") || "";
  const cleaned = raw.replace(/```json|```/g, "").trim();

  let parsedRaw: unknown;
  try {
    parsedRaw = JSON.parse(cleaned);
  } catch {
    throw new Error("Claude returned invalid persona JSON. Try again.");
  }
  const fields = ["fullName", "email", "phone", "address", "ssnOrId", "notes"] as const;
  if (!Array.isArray(parsedRaw) || parsedRaw.length !== count ||
      !parsedRaw.every(p => p && fields.every(field => typeof p[field] === "string"))) {
    throw new Error("Claude returned incomplete persona records. Try again.");
  }

  return (parsedRaw as RawPersonaShape[]).map((p) => ({
    ...p,
    creditCard: randomTestCard(),
  }));
}
