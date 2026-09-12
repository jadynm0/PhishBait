export function steelCreationError(error: unknown): string {
  const detail = error instanceof Error ? error.message : "Unknown session creation error.";
  let safe = detail.replace(/apiKey=[^&\s"']+/gi, "apiKey=[redacted]");
  for (const key of [process.env.STEEL_API_KEY, process.env.ANTHROPIC_API_KEY]) {
    if (key) safe = safe.split(key).join("[redacted]");
  }
  return `Steel could not create this session: ${safe.slice(0, 1500)}`;
}
