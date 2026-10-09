import fs from 'node:fs';
import assert from 'node:assert/strict';
import {encodeSource} from '../missile-rules/source.mjs';
const url='https://twdatabase.com/raw/units.json';
const data=await(await fetch(url)).json();assert.equal(data.patch,'9.0.2');
const old=JSON.parse(fs.readFileSync('tools/wh3-importer/speed-rules/report.json'));
const keys=new Set(old.catalog.map(t=>t.mainKey));
const commitResponse=await fetch('https://api.github.com/repos/Shazbot/WH3-Dump/commits/'+data.source.commit);
const capture={format:'independent-game-facing-speed-reference-v1',url,accessedAt:new Date().toISOString(),
  patch:data.patch,source:data.source,upstreamCommitHttpStatus:commitResponse.status,
  confidenceLimit:'Publisher-derived cards, not direct measurements by this agent; stated upstream commit cannot currently be resolved. Not sufficient alone to recover absent 9.0.2 raw entities.',
  methodology:'https://twdatabase.com/how-we-verify',gameExecuted:false,
  cards:data.units.filter(u=>keys.has(u.k)).map(u=>({mainKey:u.k,name:u.n,speed:u.speed,page:'https://twdatabase.com'+u.page}))};
fs.writeFileSync('tools/wh3-importer/speed-second/reference.source.json',JSON.stringify(encodeSource(capture))+'\n');
console.log({cards:capture.cards.length,upstreamCommitHttpStatus:capture.upstreamCommitHttpStatus});
