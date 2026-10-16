// Match version annotations, not ordinary titles such as "Live Forever".
const alternate =
  /\b(?:live|remix(?:ed)?|remaster(?:ed)?|acoustic|unplugged|demo|instrumental|karaoke|re-?record(?:ed|ing)?|sped[ -]?up|slowed|radio edit)\b|現場|现场|演唱會|演唱会|伴奏|混音|重混|重錄|重录|重新錄製|重新录制|重製|重制|不插電|不插电|清唱|純音樂|纯音乐|加速版|慢速版/i;
const concertAlbum =
  /演唱會|演唱会|音樂會|音乐会|巡迴|巡回|現場|现场|\b(?:concert|unplugged|world tours?|concert tours?)\b|\blive (?:at|in|from|on)\b|^live$|[([][^)\]]*\blive\b/i;
const specialAlbum =
  /精選|精选|合輯|合辑|\b(?:greatest hits|best of|compilation|karaoke|instrumental|remix|remastered|remaster)\b/i;
const normalize = (value) =>
  String(value || "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ");
export function originalTitle(name) {
  return normalize(name)
    .replace(
      /\s*[([](?:album version|original version|original mix|studio version|專輯版|专辑版|原版|錄音室版|录音室版)[)\]]/gi,
      "",
    )
    .replace(
      /\s*[-–—]\s*(?:album version|original version|studio version)$/i,
      "",
    )
    .trim();
}
export function isOriginal(song) {
  const name = normalize(song.name),
    album = normalize(song.album);
  const annotations = name.match(/[([][^)\]]*[)\]]|\s[-–—]\s.+$/g) || [];
  if (
    annotations.some((part) => alternate.test(part)) ||
    /\blive (?:at|in|from)\b/.test(name)
  )
    return false;
  if (concertAlbum.test(album) || specialAlbum.test(album)) return false;
  return !alternate.test((album.match(/[([][^)\]]*[)\]]/g) || []).join(" "));
}
function editionRank(song) {
  const album = normalize(song.album);
  if (
    /deluxe|anniversary|expanded|special edition|豪華|豪华|紀念|纪念/.test(
      album,
    )
  )
    return 2;
  if (/(?:^|[-–—]\s*)(?:single|ep)$/.test(album) || album === "单曲") return 1;
  return 0;
}
export function originalsOnly(songs) {
  const chosen = new Map();
  for (const song of songs) {
    if (!song?.id || typeof song.name !== "string" || !isOriginal(song))
      continue;
    const key = `${normalize(song.artist)}|${originalTitle(song.name)}`;
    const existing = chosen.get(key);
    if (!existing || editionRank(song) < editionRank(existing))
      chosen.set(key, song);
  }
  return [...chosen.values()];
}
