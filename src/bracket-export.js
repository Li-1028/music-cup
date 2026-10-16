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
  const l = bracketLayout(t);
  const covers = new Map();
  await Promise.all(t.songs.map(async song => {
    if (!song.artwork || !song.artwork.startsWith('https://')) return;
    const img = new Image(); img.crossOrigin = 'anonymous';
    await new Promise(resolve => {
      const timer = setTimeout(()=>{img.src='';resolve();},8000);
      img.onload = () => {clearTimeout(timer);covers.set(song.id,img);resolve();};
      img.onerror = () => {clearTimeout(timer);resolve();}; img.src=song.artwork;
    });
  }));
  const c=document.createElement('canvas');c.width=l.width;c.height=l.height;
  const x=c.getContext('2d');
  const gradient=x.createLinearGradient(0,0,c.width,c.height);gradient.addColorStop(0,'#20152e');gradient.addColorStop(1,'#080b14');
  x.fillStyle=gradient;x.fillRect(0,0,c.width,c.height);
  x.strokeStyle='#ffffff08';x.lineWidth=1;
  for(let i=0;i<c.width;i+=32){x.beginPath();x.moveTo(i,0);x.lineTo(i,c.height);x.stroke();}
  for(let i=0;i<c.height;i+=32){x.beginPath();x.moveTo(0,i);x.lineTo(c.width,i);x.stroke();}
  function text(value,px,py,size=16,color='#eee7f7',max=280){x.font=`${size}px "Microsoft YaHei", Arial, sans-serif`;x.fillStyle=color;x.fillText(value,px,py,max);}
  text('MUSIC CUP',48,64,32,'#e8d4ff',600);
  text(`${t.songs[0]?.artist || ''} · ${t.songs.length} 首歌 · 我的冠军之路`,48,102,18,'#b7a5cb',900);
  const win=t.songs.find(s=>s.id===t.winners[`${Math.log2(t.songs.length)-1}-0`]);
  x.textAlign='center';text('THE FINAL · 总决赛',c.width/2,154,20,'#d7bbff',320);x.textAlign='left';
  for(const e of l.edges){x.strokeStyle=e.active?'#bd8df5':'#514368';x.lineWidth=2;x.beginPath();x.moveTo(e.x1,e.y1);x.lineTo((e.x1+e.x2)/2,e.y1);x.lineTo((e.x1+e.x2)/2,e.y2);x.lineTo(e.x2,e.y2);x.stroke();}
  for(const n of l.nodes){
    x.fillStyle='#15121f';x.fillRect(n.x,n.y,300,124);x.strokeStyle=n.r===Math.log2(t.songs.length)-1?'#e0baff':'#685076';x.strokeRect(n.x,n.y,300,124);
    for(const [i,song] of n.teams.entries()){
      const y=n.y+i*62;
      if(song?.id===n.winner){x.fillStyle='#422958';x.fillRect(n.x+2,y+2,296,58);x.fillStyle='#c99cf8';x.fillRect(n.x+2,y+2,3,58);}
      const cover=covers.get(song?.id);
      if(cover)x.drawImage(cover,n.x+12,y+9,44,44);
      else {x.fillStyle='#534063';x.fillRect(n.x+12,y+9,44,44);text('♫',n.x+24,y+38,24,'#dfc5ff',32);}
      text(song?.name||'待定',n.x+66,y+27,15,'#f5edff',222);
      text(song?.album||n.title,n.x+66,y+47,10,'#bdabc9',222);
    }
  }
  text(`CHAMPION  /  ${win?.name||'待定'}`,48,c.height-30,18,'#dbb8ff',c.width-96);
  return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('图片生成失败')),'image/png'));
}
