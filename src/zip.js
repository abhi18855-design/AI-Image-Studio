// Minimal ZIP (stored entries): image codecs already compress the data.
// UTF-8 names, CRC-32 integrity, no runtime dependency.
function crc32(data) {
  let c = 0xffffffff;
  for (const b of data) {
    c ^= b;
    for (let j = 0; j < 8; j++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}
export async function zipImages(items) {
  if (items.reduce((n, i) => n + i.blob.size, 0) > 300 * 1048576)
    throw new Error(
      "This batch is too large to package safely. Download images individually.",
    );
  const parts = [],
    directory = [];
  let offset = 0;
  for (const item of items) {
    const name = new TextEncoder().encode(item.name),
      data = new Uint8Array(await item.blob.arrayBuffer()),
      crc = crc32(data);
    const header = new Uint8Array(30 + name.length),
      v = new DataView(header.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0x800, true);
    v.setUint16(12, 0x21, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, data.length, true);
    v.setUint32(22, data.length, true);
    v.setUint16(26, name.length, true);
    header.set(name, 30);
    parts.push(header, data);
    const central = new Uint8Array(46 + name.length),
      c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x800, true);
    c.setUint16(14, 0x21, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true);
    c.setUint32(24, data.length, true);
    c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.set(name, 46);
    directory.push(central);
    offset += header.length + data.length;
  }
  const end = new Uint8Array(22),
    e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, items.length, true);
  e.setUint16(10, items.length, true);
  e.setUint32(
    12,
    directory.reduce((n, d) => n + d.length, 0),
    true,
  );
  e.setUint32(16, offset, true);
  return new Blob([...parts, ...directory, end], { type: "application/zip" });
}
