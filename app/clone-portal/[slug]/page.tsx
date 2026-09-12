import fs from "node:fs/promises";
import path from "node:path";
import { sanitizeClone } from "@/lib/sanitizeClone";
import { notFound } from "next/navigation";
import ClonedFormRenderer from "@/components/ClonedFormRenderer";

export default async function ClonePortalPage({
  params,
}: {
  params: { slug: string };
}) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.slug)) notFound();
  const filePath = path.join(process.cwd(), "content", "clones", `${params.slug}.html`);

  let html: string;
  try {
    html = await fs.readFile(filePath, "utf-8");
  } catch {
    notFound();
  }

  return <ClonedFormRenderer html={sanitizeClone(html!)} />;
}
