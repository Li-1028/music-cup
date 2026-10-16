import test from 'node:test';
import assert from 'node:assert/strict';
import { bracketLayout, bracketSvg, referenceLayout } from '../src/bracket-export.js';
import { advance } from '../src/domain.js';
for (const size of [16,32,64]) test(`${size} songs: symmetric tree exports every match and edge`,()=>{
 const t={version:1,songs:Array.from({length:size},(_,i)=>({id:String(i),name:`Song ${i}`,artist:'Artist',album:'Album'})),winners:{}};
 const l=bracketLayout(t);
 assert.equal(l.nodes.length,size-1);assert.equal(l.edges.length,size-2);
 assert.equal(new Set(l.nodes.map(n=>n.id)).size,size-1);
 for(const n of l.nodes) { assert.ok(n.x>=0&&n.x+300<=l.width);assert.ok(n.y>=0&&n.y+124<=l.height); }
 const final=l.nodes.at(-1);assert.equal(final.x+150,l.width/2);
 for(const e of l.edges) {const a=l.nodes.find(n=>n.id===e.from),b=l.nodes.find(n=>n.id===e.to);assert.equal(b.m,Math.floor(a.m/2));assert.equal(b.r,a.r+1);}
 const right=l.nodes.find(n=>n.r===0&&n.right);const changed=advance(t,right.r,right.m,right.teams[0].id);
 assert.equal(changed.winners[right.id],right.teams[0].id);
 assert.equal((bracketSvg(t).match(/data-match=/g)||[]).length,size-1);
});
test('export escapes song metadata and contains complete names',()=>{
 const t={songs:Array.from({length:16},(_,i)=>({id:String(i),name:'A & <B> "C"',artist:'Artist',album:'Original'})),winners:{}};
 const svg=bracketSvg(t);assert.ok(svg.includes('A &amp; &lt;B&gt; &quot;C&quot;'));assert.ok(!svg.includes('<B>'));
});
import {portraitLayout} from '../src/bracket-export.js';
for(const size of [16,32,64]) test(`${size} portrait tree fits fixed mobile width with all branches`,()=>{
 const t={songs:Array.from({length:size},(_,i)=>({id:String(i),name:`Song ${i}`,artist:'Test'})),winners:{}};
 const l=portraitLayout(t);assert.equal(l.width,720);assert.equal(l.nodes.length,size-1);assert.equal(l.edges.length,size-2);
 assert.ok(l.height>l.width);assert.ok(l.height<16384);
 for(const n of l.nodes){assert.ok(n.x+510<=l.width);assert.ok(n.y+176<l.height);}
 for(let i=1;i<l.nodes.length;i++)assert.ok(l.nodes[i].y>=l.nodes[i-1].y+176);
});

test('reference tree keeps a balanced two-sided route to champion',()=>{
 const t={songs:Array.from({length:16},(_,i)=>({id:String(i),name:`Song ${i}`,artist:'Artist'})),winners:{}};
 const l=referenceLayout(t);
 assert.equal(l.width,1080); assert.ok(l.height>=2300); assert.equal(l.leaves.length,16);
 assert.equal(l.progress.length,14); assert.equal(l.progress.filter(x=>x.side==='left').length,7);
 assert.equal(l.progress.filter(x=>x.side==='right').length,7);
 assert.ok(l.leaves.every(n=>n.x>=0 && n.x+l.cardWidth<=l.width));
});
