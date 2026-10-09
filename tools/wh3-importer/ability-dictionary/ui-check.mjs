// Execute through cua_repl with the documented tab binding, after inspecting
// the Sternsmen Production page. No separate browser driver or hidden app state.
import assert from 'node:assert/strict';
const samples=[['공포 유발','공포 효과는 누적되지 않습니다.'],['돌격 방어 전문가','대비 중'],['은신 (숲)','너무 가까이'],['언데드','패주'],['재생','0.1 % / 적용 주기'],['붕괴','28 HP / 적용 주기'],['분해','133 HP / 적용 주기']];
export async function verifyPriority(tab,mode){
 const results=[];
 for(const [name,expected]of samples){
  await tab.playwright.getByRole('button',{name,exact:true}).click();
  await tab.playwright.domSnapshot();
  const text=await tab.playwright.getByRole('dialog',{name,exact:true}).innerText();assert(text.includes(expected),`${mode} ${name}: ${expected}`);
  const state=await tab.playwright.evaluate(()=>{const d=document.querySelector('dialog[open]'),r=d.getBoundingClientRect();return {dialogCount:document.querySelectorAll('dialog[open]').length,focusInside:d.contains(document.activeElement),width:r.width,height:r.height,viewportWidth:document.documentElement.clientWidth,viewportHeight:innerHeight,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,dialogOverflow:d.scrollWidth>d.clientWidth};});
  assert.equal(state.dialogCount,1);assert(state.focusInside);assert(!state.overflow);assert(!state.dialogOverflow);assert(state.width<=state.viewportWidth);assert(state.height<=state.viewportHeight);
  // Escape and close-button paths must both restore the original trigger.
  if(results.length%2)await tab.playwright.getByRole('button',{name:'능력 설명 닫기'}).click();else await tab.playwright.getByRole('button',{name:'능력 설명 닫기'}).press('Escape');
  await tab.playwright.domSnapshot();
  const closed=await tab.playwright.evaluate(()=>({open:document.querySelectorAll('dialog[open]').length,focus:document.activeElement?.textContent}));assert.equal(closed.open,0);assert.equal(closed.focus,name);
  results.push({mode,name,expected,result:'PASS',...state,focusReturned:true});
 }
 // Enter activation and native modal focus containment.
 await tab.playwright.getByRole('button',{name:'재생',exact:true}).press('Enter');await tab.playwright.domSnapshot();
 await tab.playwright.getByRole('button',{name:'능력 설명 닫기'}).press('Tab');await tab.playwright.domSnapshot();
 assert(await tab.playwright.evaluate(()=>document.querySelector('dialog[open]').contains(document.activeElement)),'Tab focus escaped modal');
 return results;
}
export async function verifyDocument(tab){
 await tab.playwright.getByRole('link',{name:'독립 능력 문서에서 보기 →'}).click();await tab.playwright.domSnapshot();
 assert((await tab.url()).endsWith('/abilities/regeneration'));assert(await tab.playwright.getByRole('heading',{name:'재생',exact:true}).isVisible());
 assert((await tab.playwright.getByRole('region',{name:'확인된 효과'}).innerText()).includes('0.1 % / 적용 주기'));
 assert.equal(await tab.playwright.getByRole('dialog').count(),0);
 return {document:'regeneration',sameEffect:true,dialogCleaned:true,result:'PASS'};
}
