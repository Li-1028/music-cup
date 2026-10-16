import test from 'node:test';
import assert from 'node:assert/strict';
import {nextMatch,advance} from '../src/domain.js';
for(const size of [16,32,64]) test(`${size} sequential choices reach champion without skipping matches`,()=>{
 let t={version:1,songs:Array.from({length:size},(_,i)=>({id:String(i),name:`Song ${i}`,artist:'Test',album:'Album'})),winners:{}};
 for(let i=0;i<size-1;i++){const m=nextMatch(t);assert.ok(m);assert.ok(m.teams.every(Boolean));t=advance(t,m.r,m.m,m.teams[0].id);assert.equal(Object.keys(t.winners).length,i+1);}
 assert.equal(nextMatch(t),null);assert.equal(t.winners[`${Math.log2(size)-1}-0`],'0');
});
