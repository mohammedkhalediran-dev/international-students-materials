/* Focused engine regression checks; DOM/canvas/device rendering is not simulated as verified. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../js/studio-core.js');
const storage = new Map();
const context = {
 window: { MedixaStudioCore: C }, navigator: { maxTouchPoints: 0, userAgent: '' },
 document: { addEventListener(){}, querySelectorAll(){return []}, getElementById(){return null}, documentElement:{dataset:{}} },
 localStorage: { getItem:k=>storage.get(k)||null, setItem:(k,v)=>storage.set(k,v) },
 performance: { now:()=>1 }, addEventListener(){}, setTimeout(){return 1}, clearTimeout(){},
 requestAnimationFrame(){return 1}, console, URL, Map, Set, structuredClone
};
vm.createContext(context);
const source=fs.readFileSync(require.resolve('../js/studio-ink.js'),'utf8');
vm.runInContext(source.replace('window.MedixaStudio = api;', 'window.MedixaStudio = api; window.testInk = { eraseTo, beginTool, moveTool, endTool };'),context);
const M=context.window.MedixaStudio, T=context.window.testInk;
const ctx=new Proxy({}, {get:(o,k)=>o[k] || (()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const pg={n:1,cssW:800,cssH:1000,pw:800,ph:1000,ext:{l:0,r:0,t:0,b:0},
 ink:{getBoundingClientRect:()=>({left:0,top:0,width:800,height:1000}),getContext:()=>ctx,releasePointerCapture(){}}};
function setup(items=[]){
 M.S.items=structuredClone(items); M.S.pages=new Map([[1,pg]]); M.S.hist=new C.History(M.S.items); M.S.guard={write:()=> 'saved'};
 M.S.raf=1; M.S.dirty=false; M.S.deleted=new Set(); pg.active={ops:[]}; pg.live=null; M.rebuildIndex();
}
const stroke=(id,tool='pen')=>({id,page:1,tool,color:'#168c8c',width:1,points:[[.5,.2],[.5,.8]]});
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name)}
test('fast sweep erases a crossed thin stroke and one undo restores it',()=>{
 setup([stroke('a')]);M.setStyle('eraser',{mode:'stroke',size:4,target:'all'});T.eraseTo(pg,[.1,.5],[.9,.5]);
 assert.equal(M.S.items.length,0);M.S.hist.push(pg.active.ops);M.undo();assert.equal(M.S.items[0].id,'a');M.redo();assert.equal(M.S.items.length,0);
});
test('ink-only eraser protects highlights',()=>{
 setup([stroke('a'),stroke('b','highlight')]);M.setStyle('eraser',{target:'ink'});T.eraseTo(pg,[.1,.5],[.9,.5]);assert.deepEqual(M.S.items.map(x=>x.id),['b']);
});
test('highlight-only eraser protects handwriting',()=>{
 setup([stroke('a'),stroke('b','highlight')]);M.setStyle('eraser',{target:'highlight'});T.eraseTo(pg,[.1,.5],[.9,.5]);assert.deepEqual(M.S.items.map(x=>x.id),['a']);
});
test('precise eraser splits a stroke and undo restores original geometry',()=>{
 const original=stroke('a');setup([original]);M.setStyle('eraser',{target:'all',mode:'precise',size:8});T.eraseTo(pg,[.5,.5],[.5,.5]);
 assert.equal(M.S.items.length,2);M.S.hist.push(pg.active.ops);M.undo();assert.deepEqual(JSON.parse(JSON.stringify(M.S.items)),[original]);
});
const ev=(x,y)=>({pointerId:1,pointerType:'mouse',clientX:x,clientY:y,timeStamp:1,pressure:.5});
test('straight highlight includes pointerup endpoint without a move event',()=>{
 setup();pg.active=null;M.setTool('highlight');M.setStyle('highlight',{line:true,hsnap:true});const rec={id:1};T.beginTool(pg,ev(80,200),rec);T.endTool(rec,'commit',ev(640,205));
 assert.equal(M.S.items.length,1);assert.equal(M.S.items[0].points.length,2);assert.equal(M.S.items[0].points[1][0],.8);assert.equal(M.S.items[0].points[1][1],.2);
});
test('eraser returns to previous highlighter only when enabled',()=>{
 setup();pg.active=null;M.setTool('highlight');M.setTool('eraser');M.setStyle('eraser',{returnToInk:true});const rec={id:1};T.beginTool(pg,ev(80,200),rec);T.endTool(rec,'commit',ev(100,200));assert.equal(M.S.tool,'highlight');
});
test('style validation preserves legacy defaults and fractional pen widths',()=>{
 M.setStyle('pen',{width:.5});assert.equal(M.style('pen').width,.5);M.setStyle('eraser',{target:'invalid',size:-1});assert.equal(M.style('eraser').target,'all');assert.equal(M.style('eraser').size,12);
});
console.log(passed+' focused engine tests passed. Browser, PDF export and real stylus NOT tested.');
