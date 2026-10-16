import React, { useState, useEffect } from "react";
import {
  Trophy,
  Music2,
  Plus,
  Minus,
  Maximize,
  Check,
  Download,
  Share2,
  X,
  ExternalLink,
} from "lucide-react";
import { bracketPng } from "./bracket-export.js";
import { rounds, safeUrl, nextMatch } from "./domain.js";
export function Cover({ song, className = "" }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`cover ${className}`}>
      {song?.artwork && !failed ? (
        <img
          src={safeUrl(song.artwork)}
          alt={`${song.album || song.name} 专辑封面`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <Music2 size={22} />
      )}
    </span>
  );
}
export function Tournament({ t, onChoose, onImageReady }) {
  const match = nextMatch(t);
  const champion = t.winners[`${Math.log2(t.songs.length)-1}-0`];
  const [chosen, setChosen] = useState(null);
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => { setChosen(null); }, [t]);
  useEffect(() => {
    if (!chosen || !match) return;
    const timer = setTimeout(() => onChoose(match.r, match.m, chosen), 360);
    return () => clearTimeout(timer);
  }, [chosen, t]);
  useEffect(() => {
    setImage(null); onImageReady(null); setError("");
    if (!champion) return;
    let cancelled = false, url;
    bracketPng(t).then(blob => {
      if (cancelled) return;
      url = URL.createObjectURL(blob); setImage({blob,url}); onImageReady({blob,url});
    }).catch(() => { if (!cancelled) setError("赛树图片生成失败，请重试"); });
    return () => { cancelled=true; if(url) URL.revokeObjectURL(url); };
  }, [t, champion, retry]);
  if (!champion && match) return <section className="duel" aria-label="歌曲二选一">
    <div className="eyebrow">{match.title} · 第 {match.m+1} / {match.count} 场</div>
    <h2>这一刻，哪首更让你心动？</h2>
    <p>点击封面选择 · 自动进入下一场</p>
    <div className="duel-pair" key={match.id}>
      {match.teams.map((song,i)=><React.Fragment key={song.id}>
        {i===1 && <span className="duel-vs" aria-hidden="true">VS</span>}
        <button className={`duel-card ${chosen===song.id ? "picked" : ""} ${chosen && chosen!==song.id ? "passed" : ""}`} disabled={!!chosen} onClick={()=>setChosen(song.id)} aria-label={`选择 ${song.name}`}>
          <div className="duel-art"><Cover song={song}/><span className="duel-side">{i===0?"SIDE A":"SIDE B"}</span>{chosen===song.id && <span className="duel-check"><Check size={28}/></span>}</div>
          <div className="duel-caption"><h3>{song.name}</h3><p>{song.album}</p><span>{song.artist}</span><div className="duel-choose">{chosen===song.id ? "已选中 · 晋级" : "选这首"} <ArrowIcon/></div></div>
        </button>
      </React.Fragment>)}
    </div>
  </section>;
  return <section className="tree-result">
    <div className="tree-result-heading"><div><div className="eyebrow">THE COMPLETE JOURNEY</div><h2>冠军之路，每一步都算数。</h2></div>
      </div>
    <p>包含全部专辑封面与晋级结果 · 竖版适配手机 · 长按图片可保存</p>
    {error && <p role="alert">{error} <button onClick={()=>setRetry(x=>x+1)}>重新生成</button></p>}
    {!image && !error && <p role="status">正在生成带封面的完整赛树…</p>}
    {image && <div className="final-tree-scroll"><img className="final-tree-image" src={image.url} alt="完整音乐淘汰赛树，包含专辑封面和每场晋级结果" /></div>}
  </section>;
}
function ArrowIcon() { return <span aria-hidden="true">↗</span>; }
export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export function Winner({ song, size, onClose, notify, shared = false, treeImage }) {
  async function saveTree() {
    const file = new File([treeImage.blob], "music-cup-full-bracket.png", {type:"image/png"});
    try {
      if (navigator.canShare?.({files:[file]})) await navigator.share({files:[file],title:"我的 MUSIC CUP 完整赛树"});
      else downloadBlob(treeImage.blob,file.name);
    } catch(e) { if(e.name!=="AbortError") notify("请关闭冠军弹窗，长按赛树图片保存"); }
  }
  async function share() {
    const u = new URL(location.href);
    u.hash = new URLSearchParams({
      champion: song.name,
      artist: song.artist,
      size: String(size),
    }).toString();
    try {
      if (navigator.share)
        await navigator.share({
          title: "MUSIC CUP · 我的冠军",
          text: `${song.artist} · ${song.name}`,
          url: u.href,
        });
      else {
        await navigator.clipboard.writeText(u.href);
        notify("冠军分享链接已复制");
      }
    } catch (e) {
      if (e.name !== "AbortError") notify("复制失败，请导出冠军海报分享");
    }
  }
  function poster() {
    const c = document.createElement("canvas");
    c.width = 1080;
    c.height = 1440;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 1080, 1440);
    g.addColorStop(0, "#0b0911");
    g.addColorStop(0.65, "#271044");
    g.addColorStop(1, "#09080e");
    x.fillStyle = g;
    x.fillRect(0, 0, 1080, 1440);
    for (let i = 0; i < 12; i++) {
      x.strokeStyle = `rgba(180,110,255,${0.15 + i * 0.02})`;
      x.lineWidth = 2;
      x.beginPath();
      x.arc(540, 600, 130 + i * 18, 0, Math.PI * 2);
      x.stroke();
    }
    x.textAlign = "center";
    x.fillStyle = "#c291ff";
    x.font = "24px sans-serif";
    x.fillText("M U S I C   C U P", 540, 120);
    x.font = "96px sans-serif";
    x.fillText("♛", 540, 600);
    x.fillStyle = "#fff";
    let font = 64;
    while (font > 20) {
      x.font = `bold ${font}px sans-serif`;
      if (x.measureText(song.name).width < 900) break;
      font -= 2;
    }
    x.fillText(song.name, 540, 1000);
    x.font = "30px sans-serif";
    x.fillStyle = "#d7c5ed";
    x.fillText(song.artist.slice(0, 40), 540, 1070);
    x.font = "22px sans-serif";
    x.fillText(`${size} 首歌曲 · 只留一个心动答案`, 540, 1180);
    x.fillText("MY ONE & ONLY CHAMPION", 540, 1320);
    c.toBlob((b) => b && downloadBlob(b, "music-cup-champion.png"));
  }
  return (
    <div className="modal-backdrop">
      <section
        className="winner-card"
        role="dialog"
        aria-modal="true"
        aria-label="冠军展示"
      >
        <button
          className="close"
          onClick={onClose}
          aria-label="关闭冠军展示"
          autoFocus
        >
          <X size={20} />
        </button>
        <div className="eyebrow">
          {shared ? "SHARED CHAMPION" : "YOUR ONE & ONLY"}
        </div>
        <div className="winner-art">
          <div className="winner-halo" />
          {song.artwork ? <Cover song={song} /> : <Trophy size={90} />}
          <Trophy className="crown" size={30} />
        </div>
        <div className="eyebrow">
          {shared ? "朋友的音乐冠军" : "属于你的冠军单曲"}
        </div>
        <h2>{song.name}</h2>
        <p>{song.artist}</p>
        <span className="pill">从 {size} 首歌中，脱颖而出</span>
        {safeUrl(song.url) && (
          <a
            className="store-link"
            href={safeUrl(song.url)}
            target="_blank"
            rel="noreferrer"
          >
            在 iTunes 查看 <ExternalLink size={12} />
          </a>
        )}
        {!shared && <button className="primary winner-tree-save" disabled={!treeImage} onClick={saveTree}><Download size={17}/>{treeImage ? "保存完整赛树" : "正在生成赛树…"}</button>}
        <div className="winner-actions">
          <button className="primary" onClick={poster}>
            <Download size={17} />
            导出海报
          </button>
          <button onClick={share}>
            <Share2 size={17} />
            分享冠军
          </button>
        </div>
        <small>音乐没有标准答案，你的喜欢就是。</small>
      </section>
    </div>
  );
}
