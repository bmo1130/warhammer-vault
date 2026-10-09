import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeSource,encodeSource} from '../missile-rules/source.mjs';
const folder='tools/wh3-importer/speed-second/';
const stored=decodeSource(JSON.parse(fs.readFileSync(folder+'stored.source.json')));
const commit='8a4f7e64714cf971b44988a4b59f218af6d04ff2';
const rows=[],files=[];
for(const table of ['land_units','mounts','battlefield_engines','land_unit_articulated_vehicles','battle_entities']){
  const url=`https://raw.githubusercontent.com/Shazbot/WH3-Dump/${commit}/db/${table}_tables/data__.tsv`;
  const response=await fetch(url);if(!response.ok)throw Error(url+' '+response.status);
  const text=await response.text(),lines=text.trimEnd().split(/\r?\n/),fields=lines.shift().split('\t');
  const keys=new Set(stored.rows.filter(r=>r.row.table===table+'_tables').map(r=>r.row.row.key));
  const selected=lines.filter(l=>!l.startsWith('#')).map(l=>Object.fromEntries(l.split('\t').map((v,i)=>[fields[i],v]))).filter(r=>keys.has(r.key));
  rows.push(...selected.map(row=>({table:table+'_tables',row,url})));
  files.push({url,sha256:createHash('sha256').update(text).digest('hex'),fields,selected:selected.length});
}
const url='https://twwstats.com/assets/index-Dqz5hPOf.js',code=await(await fetch(url)).text();
const selector=code.match(/function dY\(e\)\{[^}]+\}/)?.[0],display=code.match(/Object\.defineProperty\(this,"speed",\{get:\(\)=>this\.fly_speed\|\|this\.run_speed,enumerable:!0\}\)/)?.[0];
if(!selector||!display)throw Error('Independent implementation changed');
const capture={format:'independent-speed-implementation-v1',accessedAt:new Date().toISOString(),gameExecuted:false,
  patch:'9.0.0',commit,files,rows,implementation:{url,sha256:createHash('sha256').update(code).digest('hex'),selector,display,
    limitation:'Independent site implementation; not CA engine implementation. Fatigue/rounding implementation is not adopted.'}};
fs.writeFileSync(folder+'independent.source.json',JSON.stringify(encodeSource(capture))+'\n');
console.log({rows:rows.length,files:files.map(f=>({url:f.url,selected:f.selected}))});
