import { promises as fs } from "node:fs";
import path from "node:path";
import { extOf, mediaTypeOf } from "./formats.js";

export async function walkMediaFiles(root: string): Promise<string[]> {
  const acc: string[] = [];
  async function visit(dir: string) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await visit(full);
      else if (mediaTypeOf(extOf(e.name))) acc.push(full);
    }
  }
  await visit(root);
  return acc;
}
