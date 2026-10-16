export function dedupe(songs) {
  const seen = new Set();
  return songs.filter((s) => {
    if (!s?.id || !s.name) return false;
    const key = [s.artist || "", s.name]
      .map((v) =>
        v.normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, " "),
      )
      .join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
export function draw(songs, size, random = Math.random) {
  const pool = dedupe(songs);
  if (
    ![16, 32, 64].includes(size) ||
    pool.length < size ||
    new Set(pool.map((s) => s.id)).size !== pool.length
  )
    throw new Error("请选择足够的不重复歌曲");
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return {
    version: 1,
    songs: pool.slice(0, size),
    winners: {},
    createdAt: new Date().toISOString(),
  };
}
export function rounds(t) {
  const result = [];
  for (let r = 0; r < Math.log2(t.songs.length); r++) {
    const count = t.songs.length / 2 ** (r + 1);
    result.push({
      title:
        count === 1 ? "总决赛" : count === 2 ? "半决赛" : `${count * 2} 强赛`,
      seeds: Array.from({ length: count }, (_, m) => {
        const teams =
          r === 0
            ? t.songs.slice(m * 2, m * 2 + 2)
            : [0, 1].map((i) => {
                const id = t.winners[`${r - 1}-${m * 2 + i}`];
                return t.songs.find((s) => s.id === id) || null;
              });
        return { id: `${r}-${m}`, teams, winner: t.winners[`${r}-${m}`] };
      }),
    });
  }
  return result;
}
export function advance(t, r, m, id) {
  const match = rounds(t)[r]?.seeds[m];
  if (
    !match ||
    match.teams.some((s) => !s) ||
    !match.teams.some((s) => s.id === id)
  )
    throw new Error("请先完成上一轮对战");
  if (t.winners[`${r}-${m}`] === id) return t;
  const winners = { ...t.winners, [`${r}-${m}`]: id };
  for (
    let next = r + 1, index = Math.floor(m / 2);
    next < Math.log2(t.songs.length);
    next++, index = Math.floor(index / 2)
  )
    delete winners[`${next}-${index}`];
  return { ...t, winners };
}
export function validTournament(t) {
  if (
    !t ||
    t.version !== 1 ||
    !Array.isArray(t.songs) ||
    ![16, 32, 64].includes(t.songs.length) ||
    !t.winners ||
    typeof t.winners !== "object" ||
    Array.isArray(t.winners)
  )
    return false;
  if (
    !t.songs.every(
      (s) =>
        s &&
        typeof s.id === "string" &&
        typeof s.name === "string" &&
        s.name.length > 0 &&
        s.name.length < 500 &&
        typeof s.artist === "string",
    ) ||
    new Set(t.songs.map((s) => s.id)).size !== t.songs.length
  )
    return false;
  const map = new Map(
    rounds(t)
      .flatMap((r) => r.seeds)
      .map((m) => [m.id, m]),
  );
  return Object.entries(t.winners).every(([key, id]) => {
    const m = map.get(key);
    return m && m.teams.every(Boolean) && m.teams.some((s) => s.id === id);
  });
}
export function safeUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
}
export function sanitizeSong(s) {
  return {
    id: String(s.id),
    name: s.name.slice(0, 499),
    artist: s.artist.slice(0, 499),
    album: String(s.album || "").slice(0, 499),
    artwork: safeUrl(s.artwork),
    url: safeUrl(s.url),
  };
}

export function nextMatch(t) {
  for (const [r, round] of rounds(t).entries()) {
    const m = round.seeds.findIndex(seed => !seed.winner && seed.teams.every(Boolean));
    if (m >= 0) return {...round.seeds[m], r, m, title:round.title, count:round.seeds.length};
  }
  return null;
}
