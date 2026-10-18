const fs=require('fs'),vm=require('vm'),assert=require('assert');const source=fs.readFileSync('site/js/study-ink-backup-v89.js','utf8');
let current='[]',handler,panel,confirmCount=0;
const nodes={'#mx89-status':{textContent:''},'#mx89-export':{},'#mx89-import':{value:''}};
const document={readyState:'complete',body:{append(x){panel=x}},getElementById(id){return id==='pages'?{}:null},createElement(){return {style:{},querySelector(s){return nodes[s]},set innerHTML(v){this.html=v}}}};
const ctx={document,location:{href:'https://example.org/pdf-notes.html?file=a.pdf',search:'?file=a.pdf'},URL,URLSearchParams,localStorage:{getItem(){return current},setItem(k,v){current=v}},confirm(){confirmCount++;return true},Blob,Date,setTimeout(){},console};vm.runInNewContext(source,ctx);
const doc=new URL('a.pdf',ctx.location.href).href,stroke={page:1,tool:'pen',points:[[1,2]]};
async function importFile(data){await nodes['#mx89-import'].onchange({target:{files:[{size:100,text:async()=>JSON.stringify(data)}],value:''}})}
(async()=>{await importFile({format:'medixa-ink-v1',document:doc,strokes:[stroke,stroke]});assert.strictEqual(JSON.parse(current).length,1);await importFile({format:'medixa-ink-v1',document:doc,strokes:[stroke]});assert.strictEqual(JSON.parse(current).length,1);await importFile({format:'medixa-ink-v1',document:'other',strokes:[stroke]});assert.strictEqual(JSON.parse(current).length,1);assert.strictEqual(confirmCount,1);console.log('PASS: ink import deduplication and document isolation');})().catch(e=>{console.error(e);process.exit(1)});
