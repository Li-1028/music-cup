import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTracks } from "../src/catalog.js";
test("artist display aliases do not duplicate the same title", () => {
  const items = [
    {
      kind: "song",
      artistId: 1,
      trackId: 10,
      trackName: "Same",
      artistName: "A",
    },
    {
      kind: "song",
      artistId: 1,
      trackId: 11,
      trackName: "Same",
      artistName: "Alias A",
    },
  ];
  assert.equal(normalizeTracks(items, { id: "1", name: "A" }).length, 1);
});
test("catalog excludes other artists and dedupes album reissues", () => {
  const item = {
    kind: "song",
    artistId: 1,
    trackId: 10,
    trackName: "Test",
    artistName: "A",
    artworkUrl100: "https://example.com/100x100bb.jpg",
  };
  const s = normalizeTracks(
    [item, { ...item, trackId: 11 }, { ...item, artistId: 2, trackId: 12 }],
    { id: "1" },
  );
  assert.equal(s.length, 1);
  assert.match(s[0].artwork, /400x400/);
});
