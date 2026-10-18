const {test} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const source = fs.readFileSync('site/js/study-occlusion-v90.js', 'utf8');
const key = 'medixa.occlusion.v1:https://example.test/lecture.pdf';
const mask = {page:1,x:0.1,y:0.1,w:0.2,h:0.2,extension:'keep'};
function harness({raw=JSON.stringify([mask]), fault}={}) {
 const nodes=new Map(),values=new Map([[key,raw],['ms.study','keep'],['medixa.occlusion.v1:other.pdf','["untouched"]']]),calls=[];
 function element(tag='div',id='') {
  const n={tag,id,style:{},children:[],listeners:{},textContent:'',className:'',classList:{toggle(){}},
   setAttribute(){}, append(...a){this.children.push(...a);for(const child of a)if(child.id)nodes.set(child.id,child);},
   replaceChildren(...a){this.children=a;},addEventListener(type,fn){this.listeners[type]=fn;},
   getBoundingClientRect(){return {left:0,top:0,width:100,height:100};},
   querySelector(s){if(s.startsWith('#'))return nodes.get(s.slice(1));return this.children.find(c=>'.'+c.className===s);},
   closest(s){return s==='.page'?page:null;}};
  Object.defineProperty(n,'innerHTML',{set(html){for(const m of html.matchAll(/<(button|span)[^>]*id="([^"]+)"/g))nodes.set(m[2],element(m[1],m[2]));}});
  return n;
 }
 const page=element('section');page.className='page';const pages=element('main','pages');pages.querySelectorAll=()=>[page];nodes.set('pages',pages);
 const storage={getItem(k){calls.push(['read',k]);if(fault?.('getItem',k)==='throw')throw Error('blocked');return values.get(k)??null;},
  setItem(k,v){calls.push(['write',k]);const f=fault?.('setItem',k);if(f==='throw')throw Error('quota');if(f!=='ignore')values.set(k,v);}};
 const document={readyState:'complete',head:element('head'),body:element('body'),createElement:element,getElementById:id=>nodes.get(id)};
 const window={};vm.runInNewContext(source,{document,window,localStorage:storage,URL,URLSearchParams,location:{href:'https://example.test/pdf-notes.html?file=lecture.pdf',search:'?file=lecture.pdf'},getComputedStyle:()=>({position:'relative'}),MutationObserver:class{observe(){}},confirm:()=>true});
 return {nodes,values,calls,page,status:()=>nodes.get('mx-mask-status').textContent,state:()=>window.medixaOcclusion.getStatus(),
  setFault(f){fault=f;},draw(){nodes.get('mx-mask-add').onclick();pages.listeners.pointerdown({target:page,clientX:40,clientY:40});pages.listeners.pointerup({target:page,clientX:70,clientY:70});},
  remove(){page.querySelector('.mx-mask-layer').children[0].onclick({stopPropagation(){},altKey:true});},
  snapshot:()=>Object.fromEntries(values)};
}
for (const raw of ['{broken','null','{}','42','[null]','[{"page":1,"x":0,"y":0,"w":2,"h":1}]']) test('drawing preserves invalid existing mask data '+raw,()=>{
 const h=harness({raw}),before=h.snapshot();h.draw();assert.deepEqual(h.snapshot(),before);assert.equal(h.state().storageOK,false);assert.equal(h.state().count,0);
});
test('oversized mask list is preserved rather than truncated then overwritten',()=>{
 const h=harness({raw:JSON.stringify(Array(1001).fill(mask))}),before=h.snapshot();h.draw();assert.deepEqual(h.snapshot(),before);assert.equal(h.state().storageOK,false);
});
test('valid masks and extra fields survive creating a new mask',()=>{
 const h=harness();h.draw();const saved=JSON.parse(h.values.get(key));assert.equal(saved.length,2);assert.deepEqual(saved[0],mask);assert.equal(h.values.get('ms.study'),'keep');
});
for(const failure of ['throw','ignore'])test('failed mask creation rolls back in-memory state: '+failure,()=>{
 const h=harness({fault:op=>op==='setItem'?failure:undefined}),before=h.snapshot();h.draw();assert.deepEqual(h.snapshot(),before);assert.equal(h.state().count,1);assert.match(h.status(),/فشل الحفظ/);
});
for(const failure of ['throw','ignore'])test('failed mask deletion retains original geometry: '+failure,()=>{
 const h=harness({fault:op=>op==='setItem'?failure:undefined}),before=h.snapshot();h.remove();assert.deepEqual(h.snapshot(),before);assert.equal(h.state().count,1);
});
test('blocked storage reads never become permission to replace masks',()=>{
 const h=harness({fault:op=>op==='getItem'?'throw':undefined}),before=h.snapshot();h.draw();assert.deepEqual(h.snapshot(),before);assert.equal(h.calls.filter(c=>c[0]==='write').length,0);
});
test('a newer mask value from another tab is not overwritten',()=>{
 const h=harness(),other=JSON.stringify([{...mask,x:0.5}]);h.values.set(key,other);h.draw();assert.equal(h.values.get(key),other);assert.equal(h.state().count,1);assert.match(h.status(),/تغيّرت/);
});
