import test from "node:test";
import assert from "node:assert/strict";
import { dimensions, bytes, formats } from "../src/image.js";
import { styles } from "../src/styles.js";
test("rejects invalid or excessive canvas allocations", () => {
  for (const size of [
    [0, 100],
    [1.5, 100],
    [8193, 1],
    [6000, 6000],
    [NaN, 1],
    [-1, 1],
  ])
    assert.throws(() => dimensions(...size));
  assert.doesNotThrow(() => dimensions(1920, 1080));
});
test("reports readable file sizes and correct extension", () => {
  assert.equal(bytes(1024), "1.0 KB");
  assert.equal(bytes(1048576), "1.00 MB");
  assert.equal(formats["image/jpeg"], "jpg");
});
test("exactly ten unique creative styles", () => {
  assert.equal(styles.length, 10);
  assert.equal(new Set(styles.map((s) => s[0])).size, 10);
});
