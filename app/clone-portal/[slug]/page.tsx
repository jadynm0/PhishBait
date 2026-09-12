import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import ClonedFormRenderer from "@/components/ClonedFormRenderer";

export default async function ClonePortalPage({
  params,
}: {
  params: { slug: string };
}) {
  const filePath = path.join(process.cwd(), "content", "clones", `${params.slug}.html`);

  let html: string;
  try {
    html = await fs.readFile(filePath, "utf-8");
  } catch {
    notFound();
  }

  return <ClonedFormRenderer html={html!} />;
}
