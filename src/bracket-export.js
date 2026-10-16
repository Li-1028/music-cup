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

export function portraitLayout(t) {
  const rs=rounds(t),nodes=[],edges=[];
  function visit(r,m,depth,parent) {
    const node={...rs[r].seeds[m],r,m,title:rs[r].title,x:28+depth*30,y:210+nodes.length*204};
    nodes.push(node);
    if(parent) edges.push({x1:parent.x+14,y1:parent.y+176,x2:node.x,y2:node.y+88,active:true});
    if(r>0){visit(r-1,m*2,depth+1,node);visit(r-1,m*2+1,depth+1,node);}
  }
  visit(rs.length-1,0,0,null);
  return {width:720,height:280+nodes.length*204,nodes,edges};
}

// A portrait tournament poster: two compact sides flow into a single champion.
// It intentionally mirrors the way people read a music-cup recap on a phone.
export function referenceLayout(t) {
  const rs = rounds(t);
  const total = t.songs.length;
  const last = rs.length - 1;
  const width = 1080;
  const cardWidth = 202;
  const cardHeight = 58;
  const sideSongs = total / 2;
  const slot = total === 64 ? 78 : total === 32 ? 116 : 176;
  const height = Math.max(2300, sideSongs * slot + 540);
  const top = (height - sideSongs * slot) / 2 + 100;
  const centerY = height / 2;
  const stage = 152;
  const left = 30;
  const right = width - left - cardWidth;
  const leaves = [];
  const progress = [];
  const byMatch = new Map();
  const songById = new Map(t.songs.map(song => [song.id, song]));
  const matchSide = (r, m) => m < rs[r].seeds.length / 2 ? 'left' : 'right';

  rs[0].seeds.forEach((seed, m) => {
    const side = matchSide(0, m);
    const start = side === 'left' ? m * 2 : (m - rs[0].seeds.length / 2) * 2;
    seed.teams.forEach((song, index) => leaves.push({
      id: `leaf-${m}-${index}`, song, side, winner: seed.winner === song?.id,
      x: side === 'left' ? left : right, y: top + (start + index) * slot,
    }));
  });

  function sourceY(r, m, side) {
    if (r === 0) {
      const offset = side === 'left' ? m * 2 : (m - rs[0].seeds.length / 2) * 2;
      return top + (offset + .5) * slot - cardHeight / 2;
    }
    const node = byMatch.get(`${r - 1}-${m * 2}`);
    const sibling = byMatch.get(`${r - 1}-${m * 2 + 1}`);
    return ((node?.y || 0) + (sibling?.y || 0)) / 2 + cardHeight / 2;
  }

  for (let r = 0; r < last; r++) {
    rs[r].seeds.forEach((seed, m) => {
      const side = matchSide(r, m);
      const song = songById.get(seed.winner) || null;
      const y = r === 0 ? sourceY(0, m, side) : sourceY(r, m, side) - cardHeight / 2;
      const x = side === 'left' ? left + stage * (r + 1) : right - stage * (r + 1);
      const node = { id: `${r}-${m}`, song, side, x, y, winner: !!song, round: r };
      progress.push(node);
      byMatch.set(node.id, node);
    });
  }
  return { width, height, cardWidth, cardHeight, centerY, leaves, progress, byMatch, last };
}

export async function bracketPng(t) {
  const l = referenceLayout(t);
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
  const gradient=x.createLinearGradient(0,0,c.width,c.height);gradient.addColorStop(0,'#26132f');gradient.addColorStop(.45,'#0c0a12');gradient.addColorStop(1,'#06070c');
  x.fillStyle=gradient;x.fillRect(0,0,c.width,c.height);
  const halo=x.createRadialGradient(c.width/2,l.centerY,20,c.width/2,l.centerY,520);halo.addColorStop(0,'#8022ca44');halo.addColorStop(1,'#00000000');x.fillStyle=halo;x.fillRect(0,0,c.width,c.height);
  x.strokeStyle='#ffffff08';x.lineWidth=1;
  for(let i=0;i<c.width;i+=36){x.beginPath();x.moveTo(i,0);x.lineTo(i,c.height);x.stroke();}
  for(let i=0;i<c.height;i+=36){x.beginPath();x.moveTo(0,i);x.lineTo(c.width,i);x.stroke();}
  function text(value,px,py,size=16,color='#eee7f7',max=280,align='left',weight=500){x.font=`${weight} ${size}px "Microsoft YaHei", Arial, sans-serif`;x.fillStyle=color;x.textAlign=align;x.fillText(value,px,py,max);}
  function roundRect(px,py,w,h,r,fill,stroke){x.beginPath();x.roundRect(px,py,w,h,r);if(fill){x.fillStyle=fill;x.fill();}if(stroke){x.strokeStyle=stroke;x.lineWidth=2;x.stroke();}}
  function cover(song,px,py,size){const img=covers.get(song?.id);if(img){x.save();x.beginPath();x.roundRect(px,py,size,size,8);x.clip();x.drawImage(img,px,py,size,size);x.restore();}else{roundRect(px,py,size,size,8,'#453359');text('♫',px+size/2,py+size*.68,size*.55,'#dcc4ff',size,'center',700);}}
  function miniCard(node, emphasized=false){if(!node.song)return;const {x:px,y:py}=node;roundRect(px,py,l.cardWidth,l.cardHeight,15,'#1c1a25',emphasized?'#d178ff':'#4b4656');cover(node.song,px+8,py+8,42);text(node.song.name,px+60,py+25,16,'#f4eff8',l.cardWidth-70,'left',700);text(node.song.album||node.song.artist,px+60,py+45,11,'#a9a1b1',l.cardWidth-70,'left',500);}
  text('MUSIC CUP',c.width/2,82,38,'#b55eff',600,'center',800);
  text(`${t.songs[0]?.artist || '我的歌单'} · 歌曲世界杯`,c.width/2,128,28,'#fff',800,'center',800);
  const win=t.songs.find(s=>s.id===t.winners[`${Math.log2(t.songs.length)-1}-0`]);
  text('ROAD TO THE FINAL',c.width/2,174,13,'#b79acb',360,'center',700);
  // Wire the first pairs into the first result column.
  for(const leaf of l.leaves){
    const source=Number(leaf.id.split('-')[1]);
    const target=l.byMatch.get(`0-${source}`);
    if(!target)continue;
    const x1=leaf.side==='left'?leaf.x+l.cardWidth:leaf.x;
    const x2=target.side==='left'?target.x:target.x+l.cardWidth;
    const y1=leaf.y+l.cardHeight/2,y2=target.y+l.cardHeight/2,mid=(x1+x2)/2;
    x.strokeStyle=leaf.winner?'#a956ff':'#3f3949';x.lineWidth=leaf.winner?3:2;x.beginPath();x.moveTo(x1,y1);x.lineTo(mid,y1);x.lineTo(mid,y2);x.lineTo(x2,y2);x.stroke();
  }
  for(const node of l.progress){
    if(node.round>=l.last-1)continue;
    const next=l.byMatch.get(`${node.round+1}-${Math.floor(node.id.split('-')[1]/2)}`);
    if(!next)continue;
    const x1=node.side==='left'?node.x+l.cardWidth:node.x;
    const x2=next.side==='left'?next.x:next.x+l.cardWidth;
    const y1=node.y+l.cardHeight/2,y2=next.y+l.cardHeight/2,mid=(x1+x2)/2;
    x.strokeStyle=node.winner?'#a956ff':'#423b4c';x.lineWidth=node.winner?3:2;x.beginPath();x.moveTo(x1,y1);x.lineTo(mid,y1);x.lineTo(mid,y2);x.lineTo(x2,y2);x.stroke();
  }
  const finalists=l.progress.filter(n=>n.round===l.last-1);
  for(const node of finalists){const x1=node.side==='left'?node.x+l.cardWidth:node.x;const x2=c.width/2;const y1=node.y+l.cardHeight/2;x.strokeStyle=node.winner?'#b466ff':'#494151';x.lineWidth=3;x.beginPath();x.moveTo(x1,y1);x.lineTo((x1+x2)/2,y1);x.lineTo((x1+x2)/2,l.centerY);x.lineTo(x2,l.centerY);x.stroke();}
  l.leaves.forEach(leaf=>miniCard(leaf,leaf.winner));
  l.progress.forEach(node=>miniCard(node,node.round===l.last-1 && node.winner));
  if(win){const size=224,cx=c.width/2-size/2,cy=l.centerY-165;roundRect(cx-14,cy-14,size+28,size+28,28,'#19131f','#9d54de');cover(win,cx,cy,size);text('♛',cx+size-26,cy+22,58,'#ffcc58',70,'center',700);roundRect(cx-96,cy+size+22,416,52,26,'#d650d5');text('🏆  冠军 · CHAMPION',c.width/2,cy+size+57,22,'#fff',390,'center',800);text(win.name,c.width/2,cy+size+128,38,'#fff',500,'center',800);text(win.album||win.artist,c.width/2,cy+size+165,16,'#c6afdc',440,'center',600);}
  text('YOUR MUSIC. YOUR CHAMPION.',c.width/2,c.height-40,13,'#a58cb9',440,'center',600);
  return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('图片生成失败')),'image/png'));
}
