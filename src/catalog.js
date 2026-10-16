import { dedupe } from "./domain.js";
let seq = 0;
const cache = new Map();
export function request(params, signal) {
  const key = new URLSearchParams(params).toString();
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  return new Promise((resolve, reject) => {
    if (signal?.aborted)
      return reject(new DOMException("Aborted", "AbortError"));
    const callback = `musicCup_${Date.now()}_${seq++}`;
    const script = document.createElement("script");
    const cleanup = () => {
      clearTimeout(timer);
      script.remove();
      delete window[callback];
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("曲库连接超时，请重试或切换地区"));
    }, 18000);
    window[callback] = (data) => {
      cleanup();
      if (!Array.isArray(data.results))
        return reject(new Error("曲库返回异常"));
      cache.set(key, data.results);
      resolve(data.results);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("暂时无法连接 iTunes 曲库，请稍后重试"));
    };
    signal?.addEventListener("abort", abort, { once: true });
    const { endpoint = "lookup", ...query } = params;
    script.src = `https://itunes.apple.com/${endpoint}?${new URLSearchParams({ ...query, callback })}`;
    document.head.appendChild(script);
  });
}
export async function searchArtists(term, country, signal) {
  return (
    await request(
      { endpoint: "search", term, entity: "musicArtist", limit: 24, country },
      signal,
    )
  )
    .filter((a) => a.artistId)
    .map((a) => ({
      id: String(a.artistId),
      name: a.artistName,
      genre: a.primaryGenreName || "音乐人",
      url: a.artistLinkUrl,
    }));
}
export function normalizeTracks(items, artist) {
  return dedupe(
    items
      .filter(
        (s) => s.kind === "song" && String(s.artistId) === String(artist.id),
      )
      .map((s) => ({
        id: String(s.trackId),
        name: s.trackName,
        artist: artist.name || s.artistName,
        album: s.collectionName || "单曲",
        artwork: (s.artworkUrl100 || "").replace("100x100bb", "400x400bb"),
        url: s.trackViewUrl || "",
        duration: s.trackTimeMillis || 0,
      })),
  );
}
const pause = (ms, signal) =>
  new Promise((resolve, reject) => {
    const done = () => {
      signal?.removeEventListener("abort", abort);
      resolve();
    };
    const timer = setTimeout(done, ms);
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
  });
export async function loadCatalog(artist, country, signal, onProgress) {
  let items = [],
    failures = 0,
    albumCount = 0;
  // Songs are shown immediately; album lookup expands beyond the first 200 results.
  try {
    items = [
      ...(await request(
        { id: artist.id, entity: "song", limit: 200, country },
        signal,
      )),
    ];
  } catch (e) {
    if (e.name === "AbortError") throw e;
    failures++;
  }
  onProgress({
    songs: normalizeTracks(items, artist),
    label: "正在查找专辑…",
    done: false,
    failures,
  });
  let albums;
  try {
    albums = (
      await request(
        { id: artist.id, entity: "album", limit: 200, country },
        signal,
      )
    ).filter((a) => a.collectionId);
  } catch (e) {
    if (e.name === "AbortError") throw e;
    if (!items.length) throw e;
    return {
      songs: normalizeTracks(items, artist),
      failures: failures + 1,
      albumCount: 0,
      capped: false,
    };
  }
  const ids = [...new Set(albums.map((a) => a.collectionId))];
  albumCount = ids.length;
  for (let i = 0; i < ids.length; i += 5) {
    onProgress({
      songs: normalizeTracks(items, artist),
      label: `补全专辑 ${Math.min(i + 5, ids.length)} / ${ids.length}`,
      done: false,
      failures,
    });
    await pause(3100, signal);
    try {
      const batch = await request(
        {
          id: ids.slice(i, i + 5).join(","),
          entity: "song",
          limit: 200,
          country,
        },
        signal,
      );
      items.push(...batch);
      // Some storefronts return album metadata but no playable track metadata.
      // Expose that incompleteness instead of implying a successful full import.
      if (
        ids
          .slice(i, i + 5)
          .some(
            (id) =>
              !batch.some((s) => s.kind === "song" && s.collectionId === id),
          )
      )
        failures++;
    } catch (e) {
      if (e.name === "AbortError") throw e;
      failures++;
    }
  }
  return {
    songs: normalizeTracks(items, artist),
    failures,
    albumCount,
    capped: ids.length >= 200,
  };
}
