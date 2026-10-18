const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('site/js/study-recovery-v88.js','utf8');
function run({stored,readFail=false,writeFail=false,verifyFail=false,loadPages=3}={}){
 let value=stored===undefined?null:JSON.stringify(stored),banner,listener={},pageNodes=[],selected=null;
 const pages={querySelectorAll(s){return s==='.page'?pageNodes:[]},querySelector(s){return s==='.page'?pageNodes[0]:null}};
 const make=(tag)=>({tagName:tag,style:{},hidden:false,children:[],setAttribute(){},append(...a){this.children.push(...a)},querySelectorAll(){return this.children.filter(x=>x.tagName==='button')},scrollIntoView(){selected=this},getBoundingClientRect(){return {top:selected===this?95:1000}}});
 const document={readyState:'complete',body:{append(x){banner=x}},getElementById(id){return id==='pages'?pages:null},createElement:make,addEventListener(){},visibilityState:'visible'};
 const storage={getItem(){if(readFail)throw Error('blocked');return verifyFail?null:value},setItem(k,v){if(writeFail)throw Error('quota');value=v}};
 const ctx={document,location:{href:'https://example.org/pdf-notes.html?file=lecture.pdf',search:'?file=lecture.pdf'},URL,URLSearchParams,localStorage:storage,window:{addEventListener(){}},MutationObserver:class{constructor(cb){this.cb=cb;ctx.observer=this}observe(){}disconnect(){}},setTimeout(){return 1},clearTimeout(){}};
 vm.runInNewContext(source,ctx);for(let i=0;i<loadPages;i++){pageNodes.push(make('section'));ctx.observer?.cb()}
 return {banner,storage,read:()=>value,add(){pageNodes.push(make('section'));ctx.observer?.cb()},status:ctx.window.medixaSessionRecovery.getStatus(),save:ctx.window.medixaSessionRecovery.save};
}
const prior={version:1,document:'lecture.pdf',page:3,savedAt:1};
let x=run({stored:prior,loadPages:2});assert.strictEqual(JSON.parse(x.read()).page,3);x.banner.children[1].onclick();x.add();assert.strictEqual(JSON.parse(x.read()).page,3);
x=run({stored:prior,readFail:true});x.banner.children[2].onclick();assert.strictEqual(x.status.storageOK,false);assert.strictEqual(x.save(),false);
x=run({writeFail:true});assert.strictEqual(x.status.storageOK,false);
x=run({stored:{...prior,document:'other.pdf'}});assert.strictEqual(x.status.previousPage,null);assert.strictEqual(JSON.parse(x.read()).document,'lecture.pdf');
x=run({stored:prior,loadPages:0});assert.strictEqual(JSON.parse(x.read()).page,3);x.add();assert.strictEqual(JSON.parse(x.read()).page,3);
x=run({verifyFail:true});assert.strictEqual(x.status.storageOK,false);assert.strictEqual(x.save(),false);
console.log('PASS: recovery regression (deferred resume, blocked read, quota, wrong document, delayed pages, write verification)');
