import test from "node:test";
import assert from "node:assert/strict";
import { originalsOnly } from "../src/originals.js";
const song = (id, name = "晴天", album = "葉惠美", extra = {}) => ({
  id,
  name,
  album,
  artist: "周杰倫",
  ...extra,
});
test("excludes live tracks and concert albums even without track suffix", () => {
  const items = [
    song("1"),
    song("2", "晴天 (Live)"),
    song("3", "晴天", "2004無與倫比演唱會"),
    song("4", "晴天", "The World Tour 2007"),
    song("5", "晴天 - Live at Wembley"),
    song("6", "晴天（現場版）"),
    song("7", "晴天", "MTV Unplugged"),
  ];
  assert.deepEqual(
    originalsOnly(items).map((s) => s.id),
    ["1"],
  );
});
test("excludes alternate recordings and remasters, preserves album version", () => {
  const variants = [
    "Remix",
    "Acoustic Version",
    "Demo",
    "Instrumental",
    "Karaoke",
    "2011 Remaster",
    "重新錄製版",
    "伴奏版",
  ];
  assert.deepEqual(
    originalsOnly([
      song("1"),
      ...variants.map((v, i) => song(String(i + 2), `晴天 (${v})`)),
    ]).map((s) => s.id),
    ["1"],
  );
});
test("prefers original album over single, deluxe, compilation regardless of arrival order", () => {
  const items = [
    song("single", "晴天", "晴天 - Single"),
    song("deluxe", "晴天", "葉惠美 (Deluxe Edition)"),
    song("best", "晴天", "Greatest Hits"),
    song("original", "晴天 (Album Version)"),
  ];
  for (const input of [items, [...items].reverse()])
    assert.deepEqual(
      originalsOnly(input).map((s) => s.id),
      ["original"],
    );
});
test("does not treat real titles Live Forever and Alive as concert versions", () => {
  assert.equal(
    originalsOnly([
      song("1", "Live Forever", "Definitely Maybe"),
      song("2", "Alive", "Ten"),
      song("3", "Remix Your Life", "Original Album"),
    ]).length,
    3,
  );
});
test("old saved library is filtered, IDs and meaningful title qualifiers preserved", () => {
  const data = [
    song("a"),
    song("b", " 晴天 "),
    song("c", "晴天 (Live)"),
    song("d", "晴天 (English Version)"),
  ];
  assert.deepEqual(
    originalsOnly(data).map((s) => s.id),
    ["a", "d"],
  );
});
