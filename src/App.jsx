import React, { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  ArrowUpRight,
  ArrowRight,
  Check,
  ChevronLeft,
  Disc3,
  Download,
  ExternalLink,
  LoaderCircle,
  Music2,
  Search,
  Shuffle,
  Sparkles,
  Trophy,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import {
  draw,
  advance,
  rounds,
  validTournament,
  sanitizeSong,
  safeUrl,
} from "./domain.js";
import { searchArtists, loadCatalog } from "./catalog.js";
import { originalsOnly } from "./originals.js";
import { Cover, Tournament, Winner, downloadBlob } from "./components.jsx";
const KEY = "music-cup:v1";
function restore() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!d) return {};
    if (d.tournament && !validTournament(d.tournament))
      return { restoreError: true };
    return {
      ...d,
      songs: originalsOnly(Array.isArray(d.songs) ? d.songs : []),
      tournament: d.tournament
        ? { ...d.tournament, songs: d.tournament.songs.map(sanitizeSong) }
        : null,
    };
  } catch {
    return { restoreError: true };
  }
}
function sharedWinner() {
  try {
    const p = new URLSearchParams(location.hash.slice(1));
    const name = p.get("champion");
    if (!name) return null;
    return {
      song: {
        name: name.slice(0, 499),
        artist: (p.get("artist") || "").slice(0, 499),
      },
      size: [16, 32, 64].includes(Number(p.get("size")))
        ? Number(p.get("size"))
        : 16,
    };
  } catch {
    return null;
  }
}
export default function App() {
  const [saved] = useState(restore),
    [artist, setArtist] = useState(saved.artist || null),
    [songs, setSongs] = useState(
      Array.isArray(saved.songs)
        ? saved.songs
            .filter(
              (s) =>
                s &&
                typeof s.id === "string" &&
                typeof s.name === "string" &&
                typeof s.artist === "string",
            )
            .map(sanitizeSong)
        : [],
    ),
    [selected, setSelected] = useState(
      Array.isArray(saved.selected) ? saved.selected : [],
    ),
    [size, setSize] = useState(
      [16, 32, 64].includes(saved.size) ? saved.size : 16,
    ),
    [t, setT] = useState(saved.tournament || null),
    [stage, setStage] = useState(saved.tournament ? "bracket" : "setup");
  const [query, setQuery] = useState(""),
    [artists, setArtists] = useState([]),
    [searching, setSearching] = useState(false),
    [searched, setSearched] = useState(false),
    [country, setCountry] = useState(saved.country || "hk"),
    [filter, setFilter] = useState(""),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [info, setInfo] = useState(saved.info || ""),
    [error, setError] = useState(""),
    [errorSource, setErrorSource] = useState("search"),
    [toast, setToast] = useState(
      saved.restoreError ? "无法读取旧存档，请导入备份或重新开始" : "",
    ),
    [storageOK, setStorageOK] = useState(!saved.restoreError),
    [history, setHistory] = useState([]),
    [showWinner, setShowWinner] = useState(false),
    [shared, setShared] = useState(sharedWinner),
    [showHelp, setShowHelp] = useState(false),
    [visible, setVisible] = useState(40);
  const searchRef = useRef(null),
    loadRef = useRef(null),
    fileRef = useRef(null),
    searchInput = useRef(null);
  const notify = (text) => setToast(text);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          artist,
          songs,
          selected,
          size,
          tournament: t,
          country,
          info,
        }),
      );
      setStorageOK(true);
    } catch {
      setStorageOK(false);
    }
  }, [artist, songs, selected, size, t, country, info]);
  useEffect(
    () => () => {
      searchRef.current?.abort();
      loadRef.current?.abort();
    },
    [],
  );
  const rs = t ? rounds(t) : [],
    champion = t?.songs.find((s) => s.id === t.winners[`${rs.length - 1}-0`]);
  const count = selected.filter((id) => songs.some((s) => s.id === id)).length;
  const filtered = songs.filter((s) =>
    `${s.name} ${s.album}`
      .toLocaleLowerCase()
      .includes(filter.toLocaleLowerCase()),
  );
  async function search(value = query) {
    setErrorSource("search");
    if (!value.trim()) return;
    searchRef.current?.abort();
    const c = new AbortController();
    searchRef.current = c;
    setQuery(value);
    setSearching(true);
    setArtists([]);
    setError("");
    setSearched(false);
    try {
      const result = await searchArtists(value, country, c.signal);
      if (c.signal.aborted) return;
      setArtists(result);
      setSearched(true);
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message);
    } finally {
      if (!c.signal.aborted) setSearching(false);
    }
  }
  async function choose(a) {
    setErrorSource("catalog");
    loadRef.current?.abort();
    const c = new AbortController();
    loadRef.current = c;
    setArtist(a);
    setSongs([]);
    setSelected([]);
    setArtists([]);
    setSearched(false);
    setBusy(true);
    setError("");
    setInfo("");
    setFilter("");
    setVisible(40);
    setStatus("正在读取歌曲…");
    try {
      const data = await loadCatalog(a, country, c.signal, (p) => {
        if (c.signal.aborted) return;
        setSongs(p.songs);
        setStatus(p.label);
      });
      if (c.signal.aborted) return;
      setSongs(data.songs);
      setInfo(
        `${data.albumCount} 张专辑 · 已合并重复发行${data.failures ? " · 部分请求失败，可重新加载" : ""}${data.capped ? " · 已达到专辑查询上限" : ""}`,
      );
      if (!data.songs.length)
        setError("该地区暂未找到歌曲，请切换地区后重新搜索歌手。");
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message);
    } finally {
      if (!c.signal.aborted) {
        setBusy(false);
        setStatus("");
      }
    }
  }
  function cancelLoad() {
    loadRef.current?.abort();
    setBusy(false);
    setStatus("");
    setInfo("已停止补全 · 当前显示已获取歌曲");
  }
  function start() {
    if (t && !confirm("开始新的抽签会替换当前赛事。建议先导出备份，是否继续？"))
      return;
    try {
      setT(
        draw(
          songs.filter((s) => selected.includes(s.id)),
          size,
        ),
      );
      setHistory([]);
      setStage("bracket");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      notify(e.message);
    }
  }
  function pick(r, m, id) {
    const next = advance(t, r, m, id);
    if (next === t) return;
    setHistory((h) => [...h.slice(-62), t]);
    setT(next);
    if (next.winners[`${Math.log2(next.songs.length) - 1}-0`])
      setShowWinner(true);
  }
  function exportState() {
    downloadBlob(
      new Blob([JSON.stringify(t, null, 2)], { type: "application/json" }),
      "music-cup-tournament.json",
    );
    notify("赛事备份已导出");
  }
  async function importState(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error("备份文件过大");
      const data = JSON.parse(await file.text());
      if (!validTournament(data))
        throw new Error("这不是有效的 MUSIC CUP 赛事备份");
      if (t && !confirm("导入将替换当前赛事，是否继续？")) return;
      setT({ ...data, songs: data.songs.map(sanitizeSong) });
      setHistory([]);
      setStage("bracket");
      notify("赛事已恢复");
    } catch (err) {
      notify(err.message === "Unexpected token" ? "无法解析备份" : err.message);
    }
  }
  return (
    <div className="app">
      <header className="topbar">
        <a
          className="logo"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setStage("setup");
          }}
        >
          <span className="logo-icon">
            <AudioLines size={23} />
          </span>
          MUSIC<span>CUP</span>
          <i>BETA 01</i>
        </a>
        <nav>
          <button
            className={stage === "setup" ? "nav-active" : ""}
            onClick={() => setStage("setup")}
          >
            创建赛事
          </button>
          <button
            disabled={!t}
            className={stage === "bracket" ? "nav-active" : ""}
            onClick={() => setStage("bracket")}
          >
            我的赛场{t && <span className="nav-dot" />}
          </button>
        </nav>
        <button className="help-button" onClick={() => setShowHelp(true)}>
          玩法说明 <ArrowUpRight size={14} />
        </button>
      </header>
      {stage === "setup" ? (
        <main className="main">
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="live-dot" /> LET YOUR TASTE TAKE THE STAGE
              </div>
              <h1>
                每一首都喜欢。
                <br />
                但冠军，<span>只有一首。</span>
              </h1>
              <p>
                让心动单曲同台对决。每一次选择，
                <br className="mobile-break" />
                都更接近你的本命之歌。
              </p>
              <div className="hero-meta">
                <span>
                  <Music2 size={14} />
                  真实音乐曲库
                </span>
                <span>
                  <Shuffle size={14} />
                  随机抽签
                </span>
                <span>
                  <Trophy size={14} />
                  完整赛树导出
                </span>
              </div>
            </div>
            <div className="record-scene" aria-hidden="true">
              <div className="signal-grid" /><div className="spectrum">{Array.from({length:32},(_,i)=><i key={i} style={{"--bar":`${18 + Math.abs(Math.sin(i*1.7))*58}px`,"--delay":`${i*.08}s`}} />)}</div>
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="record">
                <div className="record-label">
                  <AudioLines size={42} />
                  <b>MUSIC CUP</b>
                  <span>SIDE A · YOUR FAVORITES</span>
                </div>
              </div>
              <div className="floating-label">
                <span className="live-dot" /> NOW SELECTING
                <br />
                <b>YOUR NEXT CHAMPION</b>
              </div>
              <span className="scene-coordinate">
                33⅓ RPM / INFINITE POSSIBILITIES
              </span>
            </div>
          </section>
          <div className="steps">
            <span className="active">
              <b>01</b> 寻找歌手
            </span>
            <i />
            <span className={songs.length ? "active" : ""}>
              <b>02</b> 选择歌曲
            </span>
            <i />
            <span>
              <b>03</b> 冠军诞生
            </span>
            <small>YOUR MUSIC. YOUR RULES.</small>
          </div>
          <div className="workspace">
            <section className="library">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">THE LINEUP</div>
                  <h2>
                    谁的歌，值得一场对决<span>？</span>
                  </h2>
                </div>
                <span className="section-number">01—02</span>
              </div>
              <form
                className="search-box"
                onSubmit={(e) => {
                  e.preventDefault();
                  search();
                }}
              >
                <Search size={20} />
                <input
                  ref={searchInput}
                  aria-label="搜索歌手"
                  placeholder="搜索你喜欢的歌手…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <select
                  aria-label="音乐曲库地区"
                  value={country}
                  onChange={(e) => {
                    loadRef.current?.abort();
                    searchRef.current?.abort();
                    setCountry(e.target.value);
                    setArtist(null);
                    setSongs([]);
                    setSelected([]);
                    setArtists([]);
                    setSearching(false);
                    setSearched(false);
                    setBusy(false);
                    setInfo("");
                    setStatus("");
                    setError("");
                  }}
                >
                  <option value="us">美国曲库</option>
                  <option value="hk">香港曲库</option>
                  <option value="tw">台湾曲库</option>
                  <option value="jp">日本曲库</option>
                </select>
                <button type="submit" aria-label="搜索" disabled={searching}>
                  {searching ? (
                    <LoaderCircle className="spin" size={18} />
                  ) : (
                    <ArrowRight size={20} />
                  )}
                </button>
              </form>
              <div className="quick-search">
                <span>试试</span>
                {["周杰伦", "Taylor Swift", "陈奕迅", "林俊杰"].map((name) => (
                  <button key={name} onClick={() => search(name)}>
                    {name}
                    <ArrowUpRight size={11} />
                  </button>
                ))}
              </div>
              {error && (
                <div className="error" role="alert">
                  {error}
                  <button
                    onClick={() =>
                      errorSource === "catalog" && artist
                        ? choose(artist)
                        : search()
                    }
                  >
                    重试
                  </button>
                </div>
              )}
              {searching && (
                <div className="loading-state">
                  <LoaderCircle size={22} className="spin" />
                  正在寻找音乐人…
                </div>
              )}
              {artists.length > 0 && (
                <div className="artist-results" aria-label="歌手搜索结果">
                  {artists.map((a) => (
                    <button key={a.id} onClick={() => choose(a)}>
                      <span className="artist-avatar">
                        {a.name.slice(0, 1)}
                      </span>
                      <span>
                        <strong>{a.name}</strong>
                        <small>{a.genre}</small>
                      </span>
                      <ArrowUpRight size={19} />
                    </button>
                  ))}
                </div>
              )}
              {searched && !artists.length && !searching && (
                <p className="empty-note">
                  没有找到这位歌手，试试英文名或切换地区。
                </p>
              )}
              {artist ? (
                <>
                  <div className="artist-summary">
                    <div className="artist-avatar large">
                      {artist.name.slice(0, 1)}
                    </div>
                    <div>
                      <h3>{artist.name}</h3>
                      <p>
                        {songs.length} 首歌曲{" "}
                        <span>· {busy ? status : info || "已恢复歌库"}</span>
                      </p>
                    </div>
                    {busy ? (
                      <button className="text-button" onClick={cancelLoad}>
                        停止补全
                      </button>
                    ) : (
                      <button
                        className="text-button"
                        onClick={() => choose(artist)}
                      >
                        重新加载
                      </button>
                    )}
                  </div>
                  {busy && <div className="loading-line" />}
                  <div className="song-toolbar">
                    <div>
                      <Search size={15} />
                      <input
                        aria-label="筛选歌曲"
                        placeholder="在歌库中筛选…"
                        value={filter}
                        onChange={(e) => {
                          setFilter(e.target.value);
                          setVisible(40);
                        }}
                      />
                    </div>
                    <button onClick={() => setSelected(songs.map((s) => s.id))}>
                      全选
                    </button>
                    <button onClick={() => setSelected([])}>清空</button>
                  </div>
                  <div className="list-label">
                    <span>歌曲 / 专辑</span>
                    <span>已选 {count} 首</span>
                  </div>
                  <div className="song-list">
                    {filtered.slice(0, visible).map((song, index) => (
                      <div
                        className={`song-row ${selected.includes(song.id) ? "selected" : ""}`}
                        key={song.id}
                      >
                        <span className="track-number">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <Cover song={song} />
                        <label className="song-label">
                          <strong>{song.name}</strong>
                          <small>{song.album}</small>
                          <input
                            type="checkbox"
                            checked={selected.includes(song.id)}
                            onChange={() =>
                              setSelected((s) =>
                                s.includes(song.id)
                                  ? s.filter((id) => id !== song.id)
                                  : [...s, song.id],
                              )
                            }
                          />
                          <span className="checkbox">
                            {selected.includes(song.id) && <Check size={14} />}
                          </span>
                        </label>
                        {safeUrl(song.url) && (
                          <a
                            className="song-store"
                            href={safeUrl(song.url)}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`在 iTunes 查看 ${song.name}`}
                            title="在 iTunes 查看"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                  {!filtered.length && (
                    <p className="empty-note">
                      {busy ? "歌曲正在路上…" : "没有符合条件的歌曲"}
                    </p>
                  )}
                  {filtered.length > visible && (
                    <button
                      className="load-more"
                      onClick={() => setVisible((v) => v + 40)}
                    >
                      再显示 40 首 · 共 {filtered.length} 首
                    </button>
                  )}
                  <p className="source-note">
                    曲目与封面来自
                    iTunes。仅保留专辑原版：过滤现场、混音、伴奏和重制版本，合并重复发行并优先普通专辑。版本识别依据曲名和专辑标签，平台信息不全时可能仍有遗漏。
                  </p>
                </>
              ) : (
                <div className="empty-library">
                  <div className="empty-icon">
                    <Disc3 size={38} />
                  </div>
                  <h3>先找到你心中的主角</h3>
                  <p>
                    搜索并选择歌手，真实歌曲和专辑封面
                    <br />
                    将在这里自动汇集。
                  </p>
                  <span>GOOD MUSIC DESERVES A GREAT MATCH.</span>
                </div>
              )}
            </section>
            <aside className="setup-card">
              <div className="card-heading">
                <span className="eyebrow">TOURNAMENT SETUP</span>
                <Sparkles size={17} />
              </div>
              <h2>组建你的音乐杯</h2>
              <p>一场只听从内心的淘汰赛。</p>
              <label className="field-label">
                参赛规模 <span>单败淘汰制</span>
              </label>
              <div className="size-options">
                {[16, 32, 64].map((n) => (
                  <button
                    aria-pressed={size === n}
                    className={size === n ? "chosen" : ""}
                    onClick={() => setSize(n)}
                    key={n}
                  >
                    <b>{n}</b>
                    <span>首歌曲</span>
                    {size === n && (
                      <span className="size-check">
                        <Check size={11} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="selection-stat">
                <span>已选择歌曲</span>
                <div>
                  <b>{count}</b>
                  <span>/ {size}</span>
                </div>
              </div>
              <div className="progress">
                <span
                  style={{ width: `${Math.min(count / size, 1) * 100}%` }}
                />
              </div>
              <p className="selection-hint">
                {count >= size
                  ? `准备就绪${count > size ? `，将从 ${count} 首中随机抽取 ${size} 首` : ""}`
                  : `再选 ${size - count} 首，开启你的音乐对决`}
              </p>
              <button
                className="random-select"
                disabled={songs.length < size}
                onClick={() => {
                  setSelected(draw(songs, size).songs.map((s) => s.id));
                  notify(`已随机选出 ${size} 首歌曲`);
                }}
              >
                <Shuffle size={16} />
                帮我随机选 {size} 首
              </button>
              <button
                className="primary start-button"
                disabled={count < size}
                onClick={start}
              >
                抽签，开启对战 <ArrowRight size={18} />
              </button>
              <div className="setup-details">
                <span>
                  <Check size={13} /> {Math.log2(size)} 轮晋级
                </span>
                <span>
                  <Check size={13} /> {size - 1} 次心动选择
                </span>
              </div>
              <div className="save-note">
                <span className={storageOK ? "save-dot" : "warning-dot"} />
                {storageOK
                  ? "进度自动保存在此浏览器"
                  : "无法自动保存，请导出备份"}
              </div>
              <button
                className="import-button"
                onClick={() => fileRef.current.click()}
              >
                <Upload size={13} />
                导入赛事备份
              </button>
            </aside>
          </div>
        </main>
      ) : (
        <main className="arena">
          <div className="arena-heading">
            <div>
              <button className="back-button" onClick={() => setStage("setup")}>
                <ChevronLeft size={15} />
                返回歌库
              </button>
              <div className="eyebrow">THE ARENA / {t.songs.length} TRACKS</div>
              <h1>
                每一次选择，<span>都算数。</span>
              </h1>
              <p>逐场二选一 · 选出冠军后查看完整赛树</p>
              {originalsOnly(t.songs).length !== t.songs.length && (
                <p className="originals-notice">
                  此为旧赛事，含已过滤版本。请返回歌库重新抽签，使用专辑原版歌单。
                </p>
              )}
            </div>
            <div className="arena-actions">
              <span className="pill">
                {Object.keys(t.winners).length} / {t.songs.length - 1} 场已完成
              </span>
              <button
                disabled={!history.length}
                onClick={() => {
                  setT(history.at(-1));
                  setHistory((h) => h.slice(0, -1));
                  setShowWinner(false);
                }}
              >
                <Undo2 size={16} />
                撤销
              </button>
              <button onClick={exportState}>
                <Download size={16} />
                备份
              </button>
              {champion && (
                <button className="primary" onClick={() => setShowWinner(true)}>
                  <Trophy size={16} />
                  查看冠军
                </button>
              )}
            </div>
          </div>
          <div className="arena-progress">
            <span
              style={{
                width: `${(Object.keys(t.winners).length / (t.songs.length - 1)) * 100}%`,
              }}
            />
          </div>
          <div className="canvas-shell">
            <Tournament t={t} onChoose={pick} />
          </div>
          <div className="arena-footer">
            <span>
              <span className={storageOK ? "save-dot" : "warning-dot"} />
              {storageOK ? "所有选择已自动保存" : "保存失败，请点击备份"}
            </span>
            <span>MAKE EVERY MATCH PERSONAL.</span>
          </div>
        </main>
      )}
      <div
        className="mobile-launch"
        style={{
          display: stage === "setup" && songs.length ? undefined : "none",
        }}
      >
        <button
          onClick={() =>
            document
              .querySelector(".setup-card")
              .scrollIntoView({ behavior: "smooth" })
          }
        >
          已选 {count} / {size} · 赛事设置
        </button>
        <button className="primary" disabled={count < size} onClick={start}>
          开启对战 <ArrowRight size={16} />
        </button>
      </div>
      <footer>
        <a className="footer-logo" href="#" onClick={(e) => e.preventDefault()}>
          <AudioLines size={16} /> MUSIC CUP
        </a>
        <span>为热爱而选，为心动加冕。</span>
        <button onClick={() => setShowHelp(true)}>
          关于曲库与隐私 <ArrowUpRight size={12} />
        </button>
      </footer>
      <input
        type="file"
        accept="application/json,.json"
        hidden
        ref={fileRef}
        onChange={importState}
      />
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {showWinner && champion && (
        <Winner
          song={champion}
          size={t.songs.length}
          onClose={() => setShowWinner(false)}
          notify={notify}
        />
      )}{" "}
      {shared && (
        <Winner
          {...shared}
          shared
          onClose={() => {
            setShared(null);
            window.history.replaceState(
              null,
              "",
              location.pathname + location.search,
            );
          }}
          notify={notify}
        />
      )}
      {showHelp && (
        <div className="modal-backdrop">
          <section
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-label="玩法说明"
          >
            <button
              className="close"
              aria-label="关闭玩法说明"
              onClick={() => setShowHelp(false)}
              autoFocus
            >
              <X size={20} />
            </button>
            <div className="eyebrow">HOW TO PLAY</div>
            <h2>听自己的，就对了。</h2>
            <ol>
              <li>搜索歌手并选择正确的音乐人；曲库会自动补全。</li>
              <li>勾选歌曲，选择 16 / 32 / 64 首规模并抽签。</li>
              <li>每场点击更喜欢的歌曲卡片，自动进入下一场；冠军产生后可查看并保存带封面的完整赛树。</li>
              <li>导出原创冠军海报，或分享冠军链接给朋友。</li>
            </ol>
            <p>
              数据来自 Apple iTunes
              公开曲库，地区不同、收录不同。搜索与专辑补全可能受接口限流影响，可停止补全使用已加载歌曲。本站不提供完整音频播放。
            </p>
            <p>
              赛事仅保存在当前设备的此浏览器。清除浏览器数据会清除进度；可导出
              JSON
              备份后在其他设备导入。分享链接只包含冠军名称、歌手和参赛规模。
            </p>
            <a
              href="https://performance-partners.apple.com/search-api"
              target="_blank"
              rel="noreferrer"
            >
              iTunes 数据来源与使用说明 ↗
            </a>
          </section>
        </div>
      )}
    </div>
  );
}
