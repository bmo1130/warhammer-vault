import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {digest} from '../runtime-evidence/contract.mjs';
export const folder='tools/wh3-importer/recruitment/';
export function encodeSource(source){return {format:'ca-recruitment-source-gzip-json-v1',expandedHash:digest(source),gzipBase64:gzipSync(Buffer.from(JSON.stringify(source)),{level:9}).toString('base64')};}
export function decodeSource(envelope){assert.equal(envelope.format,'ca-recruitment-source-gzip-json-v1');const s=JSON.parse(gunzipSync(Buffer.from(envelope.gzipBase64,'base64')));assert.equal(digest(s),envelope.expandedHash,'Recruitment expanded source drift');return s;}
export const loadSource=()=>decodeSource(JSON.parse(fs.readFileSync(folder+'catalog.source.json')));
