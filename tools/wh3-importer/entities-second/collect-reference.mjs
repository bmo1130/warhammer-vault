import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {encodeSource,decodeSource} from '../missile-rules/source.mjs';
const folder='tools/wh3-importer/entities-second/';
const old=JSON.parse(fs.readFileSync('tools/wh3-importer/unit-entities/rules-report.json'));
const stored=decodeSource(JSON.parse(fs.readFileSync(folder+'stored.source.json')));
const url='https://twdatabase.com/raw/units.json',d=await(await fetch(url)).json();assert.equal(d.patch,'9.0.2');
const keys=new Set(old.catalog.map(c=>c.mainKey));
const upstream=await fetch('https://api.github.com/repos/Shazbot/WH3-Dump/commits/'+d.source.commit);
const cards=d.units.filter(u=>keys.has(u.k)).map(u=>({mainKey:u.k,name:u.n,count:u.men,totalHealth:u.hp,page:'https://twdatabase.com'+u.page}));assert.equal(cards.length,1110);
const codeUrl='https://twwstats.com/assets/index-Dqz5hPOf.js',code=await(await fetch(codeUrl)).text();
const health=code.match(/function The\(e\)\{[^}]+\}/)?.[0],count=code.match(/function Dhe\(e\)\{[^}]+\}/)?.[0];assert(health&&count);
const commit='8a4f7e64714cf971b44988a4b59f218af6d04ff2',rows=[],files=[];
for(const table of ['main_units','land_units','mounts','battlefield_engines','land_unit_articulated_vehicles','battle_entities']){
  const u=`https://raw.githubusercontent.com/Shazbot/WH3-Dump/${commit}/db/${table}_tables/data__.tsv`;
  const r=await fetch(u);assert(r.ok,u+' '+r.status);const text=await r.text(),lines=text.trimEnd().split(/\r?\n/),fields=lines.shift().split('\t');
  const wanted=new Set(stored.rows.filter(r=>r.row.table===table+'_tables').map(r=>r.row.row.key??r.row.row.unit));
  const selected=lines.filter(l=>!l.startsWith('#')).map(l=>Object.fromEntries(l.split('\t').map((v,i)=>[fields[i],v]))).filter(r=>wanted.has(r.key??r.unit));
  rows.push(...selected.map(row=>({table:table+'_tables',row,url:u})));files.push({url:u,sha256:createHash('sha256').update(text).digest('hex'),fields,selected:selected.length});
}
const capture={format:'independent-ultra-hp-count-reference-v1',accessedAt:new Date().toISOString(),gameExecuted:false,
  publisher:{url,patch:d.patch,source:d.source,upstreamCommitHttpStatus:upstream.status,cards,
    limitation:'Derived website cards; unresolved claimed upstream commit. Never substitutes for missing CA 9.0.2 rows.'},
  implementation:{url:codeUrl,sha256:createHash('sha256').update(code).digest('hex'),health,count,limitation:'Independent website implementation, not CA executable code; scaling/rounding not adopted.'},
  independent:{patch:'9.0.0',commit,files,rows,limitation:'Separate fixed-commit version; cross-check only, not Production raw source.'}};
fs.writeFileSync(folder+'reference.source.json',JSON.stringify(encodeSource(capture))+'\n');console.log({cards:cards.length,rows:rows.length,upstream:upstream.status});
