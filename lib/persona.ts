import OpenAI from "openai";
import { VictimPersona } from "./types";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

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
 * Generates synthetic (non-real) persona records via OpenRouter, then attaches
 * a well-known payment-industry test card number locally (never LLM-generated).
 */
export async function generateVictimPersonas(
  targetUrl: string,
  count: number = 5
): Promise<VictimPersona[]> {
  const prompt = `Generate ${count} completely fictional, clearly-synthetic decoy identity records for use as junk/noise data in a security demo.
None of these should resemble any real person. Output MUST be a valid JSON array of objects with exactly these fields:
- fullName (string, invented full name)
- email (string, invented address using a common consumer domain like gmail.com, yahoo.com, comcast.net)
- phone (string, standard 10-digit North American format, using a clearly fake exchange like 555)
- address (string, a plausible-looking but invented street/city/postal code)
- ssnOrId (string, a placeholder identifier in the format 000-00-0000, never a real-looking SSN)
- notes (string, a short, mildly rambling, good-natured message from an "elderly/confused" fictional persona, e.g. "Hope this reaches the right department, my grandson set up this computer for me")

Keep everything obviously fictional and lighthearted. Return ONLY the raw JSON array, no markdown fences, no commentary.`;

  const res = await openrouter.chat.completions.create({
    model: "anthropic/claude-3.5-sonnet",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.9,
  });

  const raw = res.choices[0]?.message?.content || "[]";
  const cleaned = raw.replace(/```json|```/g, "").trim();

  let parsedRaw: RawPersonaShape[];
  try {
    parsedRaw = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse persona JSON from OpenRouter: ${err}`);
  }

  return parsedRaw.map((p) => ({
    ...p,
    creditCard: randomTestCard(),
  }));
}
