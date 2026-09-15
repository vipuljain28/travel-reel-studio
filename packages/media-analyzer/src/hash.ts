import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
export async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  const stream = createReadStream(filePath);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest("hex");
}
export function simpleDHashFromBytes(bytes: Uint8Array): string {
  const sample = bytes.length < 64 ? bytes : bytes.subarray(0, 64);
  return createHash("sha1").update(sample).digest("hex").slice(0, 16);
}
