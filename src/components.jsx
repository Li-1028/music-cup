import React, { useState } from "react";
import { Bracket, Seed, SeedItem } from "@oliverlooney/react-brackets";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
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
import { rounds, safeUrl } from "./domain.js";
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
export function Tournament({ t, onChoose }) {
  const rs = rounds(t);
  const renderSeed = ({ seed, breakpoint, roundIndex, seedIndex }) => (
    <Seed
      mobileBreakpoint={breakpoint}
      style={{ fontSize: 13, padding: "14px 24px", width: 280 }}
    >
      <SeedItem
        style={{
          background: "transparent",
          boxShadow: "none",
          borderRadius: 12,
        }}
      >
        <div className="match" data-match={seed.id}>
          {seed.teams.map((song, i) => (
            <button
              key={i}
              className={`match-song ${song && seed.winner === song.id ? "won" : ""}`}
              disabled={!song || seed.teams.some((s) => !s)}
              onClick={() => onChoose(roundIndex, seedIndex, song.id)}
              aria-label={song ? `晋级 ${song.name}` : "等待上一轮胜者"}
            >
              {song ? (
                <>
                  <Cover song={song} />
                  <span>
                    <strong>{song.name}</strong>
                    <small>{song.album}</small>
                  </span>
                  {seed.winner === song.id && <Check size={16} />}
                </>
              ) : (
                <>
                  <span className="pending-mark">?</span>
                  <span className="muted">等待上一轮胜者</span>
                </>
              )}
            </button>
          ))}
        </div>
      </SeedItem>
    </Seed>
  );
  return (
    <TransformWrapper
      initialScale={0.8}
      minScale={0.15}
      maxScale={1.7}
      limitToBounds={false}
      centerOnInit={false}
      initialPositionX={12}
      initialPositionY={20}
      panning={{ excluded: ["button", "a"] }}
      doubleClick={{ disabled: true }}
      wheel={{ step: 0.08 }}
    >
      {({ zoomIn, zoomOut, resetTransform, centerView }) => (
        <>
          <div className="canvas-controls">
            <span>拖动画布 · 双指缩放</span>
            <button aria-label="缩小赛树" onClick={() => zoomOut()}>
              <Minus size={17} />
            </button>
            <button aria-label="放大赛树" onClick={() => zoomIn()}>
              <Plus size={17} />
            </button>
            <button aria-label="赛树全景" onClick={() => centerView(0.25)}>
              <Maximize size={17} />
            </button>
            <button onClick={() => resetTransform()}>重置视图</button>
          </div>
          <TransformComponent
            wrapperClass="bracket-viewport"
            contentClass="bracket-content"
          >
            <Bracket
              rounds={rs}
              mobileBreakpoint={0}
              renderSeedComponent={renderSeed}
              roundTitleComponent={(title, index) => (
                <div className="round-title">
                  <span>ROUND 0{index + 1}</span>
                  <strong>{title}</strong>
                </div>
              )}
            />
          </TransformComponent>
        </>
      )}
    </TransformWrapper>
  );
}
export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
export function Winner({ song, size, onClose, notify, shared = false }) {
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
