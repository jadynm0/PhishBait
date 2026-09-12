import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

const MANIFEST_PATH = path.join(process.cwd(), "content", "clones", "index.json");

export async function GET() {
  try {
    const raw = await fs.readFile(MANIFEST_PATH, "utf-8");
    const manifest = JSON.parse(raw);
    return NextResponse.json({ clones: manifest });
  } catch {
    return NextResponse.json({ clones: [] });
  }
}
