export function pngSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24) return null;
  if (buf.toString("ascii", 1, 4) !== "PNG") return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (!width || !height) return null;
  return { width, height };
}
export function jpegSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) { offset += 1; continue; }
    const marker = buf[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
    const size = buf.readUInt16BE(offset + 2);
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      if (width && height) return { width, height };
      return null;
    }
    if (size < 2) return null;
    offset += 2 + size;
  }
  return null;
}
export function imageSizeFromBuffer(buf: Buffer): { width: number; height: number } | null {
  return pngSize(buf) ?? jpegSize(buf);
}
export function jpegExifDate(buf: Buffer): Date | null {
  if (buf.length < 12 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < buf.length) {
    if (buf[offset] !== 0xff) break;
    const marker = buf[offset + 1];
    const size = buf.readUInt16BE(offset + 2);
    if (marker === 0xe1) {
      const start = offset + 4;
      if (buf.toString("ascii", start, start + 4) !== "Exif") return null;
      return parseTiffDate(buf.subarray(start + 6, offset + 2 + size));
    }
    if (size < 2) break;
    offset += 2 + size;
  }
  return null;
}
function parseTiffDate(tiff: Buffer): Date | null {
  if (tiff.length < 8) return null;
  const le = tiff.toString("ascii", 0, 2) === "II";
  const u32 = (o: number) => (le ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o));
  return readIfdDate(tiff, u32(4), le);
}
function readIfdDate(tiff: Buffer, ifd: number, le: boolean): Date | null {
  if (ifd + 2 > tiff.length) return null;
  const u16 = (o: number) => (le ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o));
  const u32 = (o: number) => (le ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o));
  const count = u16(ifd);
  let exifOffset: number | null = null;
  for (let i = 0; i < count; i++) {
    const e = ifd + 2 + i * 12;
    if (e + 12 > tiff.length) break;
    const tag = u16(e);
    const type = u16(e + 2);
    const val = u32(e + 8);
    if (tag === 0x0132 && type === 2) {
      const d = readAsciiDate(tiff, val);
      if (d) return d;
    }
    if (tag === 0x8769) exifOffset = val;
  }
  if (exifOffset != null) {
    const n = u16(exifOffset);
    for (let i = 0; i < n; i++) {
      const e = exifOffset + 2 + i * 12;
      if (e + 12 > tiff.length) break;
      const tag = u16(e);
      const type = u16(e + 2);
      const val = u32(e + 8);
      if (tag === 0x9003 && type === 2) {
        const d = readAsciiDate(tiff, val);
        if (d) return d;
      }
    }
  }
  return null;
}
function readAsciiDate(tiff: Buffer, off: number): Date | null {
  if (off + 19 > tiff.length) return null;
  const raw = tiff.toString("ascii", off, off + 19);
  const m = raw.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}
