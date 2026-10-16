import test from "node:test";
import assert from "node:assert/strict";
import {
  draw,
  advance,
  rounds,
  dedupe,
  validTournament,
} from "../src/domain.js";
const songs = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: String(i),
    name: `Song ${i}`,
    artist: "Artist",
    album: "Album",
    artwork: "",
    url: "",
  }));
for (const n of [16, 32, 64])
  test(`${n} draw is unique and complete`, () => {
    const t = draw(songs(n), n, () => 0.5);
    assert.equal(t.songs.length, n);
    assert.equal(new Set(t.songs.map((s) => s.id)).size, n);
    assert.equal(rounds(t).flatMap((r) => r.seeds).length, n - 1);
    assert.ok(validTournament(t));
  });
test("reject insufficient, unsupported and duplicate entries", () => {
  assert.throws(() => draw(songs(15), 16));
  assert.throws(() => draw(songs(16), 8));
  assert.throws(() => draw(Array(16).fill(songs(1)[0]), 16));
});
test("cannot advance unresolved match or unrelated song", () => {
  const t = draw(songs(16), 16);
  assert.throws(() => advance(t, 1, 0, "0"));
  assert.throws(() => advance(t, 0, 0, "missing"));
});
test("champion and change propagation preserve other branches", () => {
  let t = draw(songs(16), 16, () => 0.99);
  for (let r = 0; r < 4; r++)
    for (let m = 0; m < 16 / 2 ** (r + 1); m++)
      t = advance(t, r, m, rounds(t)[r].seeds[m].teams[0].id);
  assert.equal(t.winners["3-0"], "0");
  t = advance(t, 0, 0, "1");
  assert.equal(t.winners["0-0"], "1");
  assert.equal(t.winners["0-1"], "2");
  assert.equal(t.winners["1-0"], undefined);
  assert.equal(t.winners["3-0"], undefined);
  assert.equal(t.winners["2-1"], "8");
});
test("same choice preserves downstream results", () => {
  let t = draw(songs(16), 16, () => 0.99);
  t = advance(t, 0, 0, "0");
  t = advance(t, 0, 1, "2");
  t = advance(t, 1, 0, "0");
  assert.deepEqual(advance(t, 0, 0, "0"), t);
});
test("dedupe reissues but preserve live versions", () => {
  const s = songs(3);
  s[0].name = "Hello";
  s[1].name = " hello ";
  s[2].name = "Hello (Live)";
  assert.equal(dedupe(s).length, 2);
});
test("reject corrupt saved matches", () => {
  const t = draw(songs(16), 16);
  assert.equal(validTournament({ ...t, winners: { "3-0": "0" } }), false);
  assert.equal(validTournament({ ...t, songs: [] }), false);
  assert.equal(validTournament(null), false);
});
