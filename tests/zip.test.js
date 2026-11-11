import test from "node:test";
import assert from "node:assert/strict";
import { zipImages } from "../src/zip.js";
test("ZIP preserves entry payload, size, and central directory offsets", async () => {
  const blob = await zipImages([
    { name: "01-a.png", blob: new Blob(["abc"]) },
    { name: "02-b.jpg", blob: new Blob(["xyz"]) },
  ]);
  const data = new Uint8Array(await blob.arrayBuffer()),
    view = new DataView(data.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(14, true), 0x352441c2);
  assert.equal(view.getUint32(18, true), 3);
  const nameLen = view.getUint16(26, true);
  assert.equal(
    new TextDecoder().decode(data.slice(30 + nameLen, 33 + nameLen)),
    "abc",
  );
  const end = data.length - 22;
  assert.equal(view.getUint32(end, true), 0x06054b50);
  assert.equal(view.getUint16(end + 10, true), 2);
  assert.equal(
    view.getUint32(view.getUint32(end + 16, true), true),
    0x02014b50,
  );
});
