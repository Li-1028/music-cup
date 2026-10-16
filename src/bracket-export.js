import { rounds } from './domain.js';

export function bracketLayout(t) {
  const rs = rounds(t), last = rs.length - 1;
  const cardWidth = 300, cardHeight = 124, step = 360, margin = 48, top = 200;
  const width = margin * 2 + step * last * 2 + cardWidth;
  const fieldHeight = t.songs.length / 4 * 160;
  const nodes = rs.flatMap((round, r) => round.seeds.map((seed, m) => {
    const half = round.seeds.length / 2, right = m >= half && r < last;
    const local = right ? m - half : m;
    return { ...seed, r, m, right, title: round.title,
      x: r === last ? margin + last * step : right ? width - margin - cardWidth - r * step : margin + r * step,
      y: top + (r === last ? fieldHeight / 2 : (local + .5) * 160 * 2 ** r) - cardHeight / 2 };
  }));
  const edges = nodes.filter(n => n.r < last).map(n => {
    const next = nodes.find(p => p.r === n.r + 1 && p.m === Math.floor(n.m / 2));
    return { from: n.id, to: next.id, x1: n.x + (n.right ? 0 : cardWidth), y1: n.y + cardHeight / 2,
      x2: next.x + (n.right ? cardWidth : 0), y2: next.y + cardHeight / 2, active: !!n.winner };
  });
  return { width, height: top + fieldHeight + 80, cardWidth, cardHeight, nodes, edges };
}
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function bracketSvg(t) {
  const l = bracketLayout(t);
  const text = (x,y,value,size=16,color='#ece6fa',extra='') => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" ${extra}>${escape(value)}</text>`;
  const fitted = (x,y,value,size,color) => text(x,y,value,size,color,Array.from(String(value)).reduce((n,c)=>n+(c.charCodeAt(0)>255?size:size*.6),0)>258?'textLength="258" lengthAdjust="spacingAndGlyphs"':'');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${l.width}" height="${l.height}" viewBox="0 0 ${l.width} ${l.height}"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#141023"/><stop offset="1" stop-color="#080a12"/></linearGradient><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#a788d0" stroke-opacity=".06"/></pattern></defs><rect width="100%" height="100%" fill="url(#bg)"/><rect width="100%" height="100%" fill="url(#grid)"/><g font-family="Arial, Microsoft YaHei, sans-serif">${text(48,66,'MUSIC CUP',32)}${text(48,103,`${t.songs[0]?.artist || '我的音乐'} · ${t.songs.length} 首单曲 · ${Object.keys(t.winners).length}/${t.songs.length-1} 场已完成`,16,'#b6a4ce')}${text(l.width/2,154,'THE FINAL · 总决赛',20,'#d5b4ff','text-anchor="middle"')}${l.edges.map(e=>`<path d="M${e.x1} ${e.y1}H${(e.x1+e.x2)/2}V${e.y2}H${e.x2}" fill="none" stroke="${e.active?'#b989ff':'#514368'}" stroke-width="2"/>`).join('')}${l.nodes.map(n=>`<g data-match="${n.id}"><rect x="${n.x}" y="${n.y}" width="300" height="124" rx="12" fill="#14121f" stroke="${n.r===Math.log2(t.songs.length)-1?'#dab9ff':'#504060'}"/>${n.teams.map((s,i)=>`${s&&s.id===n.winner?`<rect x="${n.x+2}" y="${n.y+i*62+2}" width="296" height="58" rx="10" fill="#392454"/>`:''}${fitted(n.x+18,n.y+i*62+27,s?.name||'等待上一轮胜者',16,s?.id===n.winner?'#eee0ff':'#ded6ea')}${fitted(n.x+18,n.y+i*62+48,s?.album||n.title,11,'#a99bbb')}`).join('')}</g>`).join('')}${text(48,l.height-28,'YOUR MUSIC. YOUR RULES.   /   左右汇聚 · 一个冠军',12,'#a497b6')}</g></svg>`;
}

export async function bracketPng(t) {
  const url = URL.createObjectURL(new Blob([bracketSvg(t)], {type:'image/svg+xml;charset=utf-8'}));
  try {
    const img = new Image();
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('图片生成失败'));img.src=url;});
    const c = document.createElement('canvas'); c.width=img.width;c.height=img.height;
    c.getContext('2d').drawImage(img,0,0);
    return await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('图片生成失败')),'image/png'));
  } finally { URL.revokeObjectURL(url); }
}
