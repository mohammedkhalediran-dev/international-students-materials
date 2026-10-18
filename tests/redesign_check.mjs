// Static release checks: all authored code parses, internal resources exist,
// and the new practice bank is grounded in the included study content.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'../site');
let checks=0;
const fail=[];
function check(ok,msg){checks++;if(!ok)fail.push(msg);}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const f of walk(root)){
 const rel=path.relative(root,f),ext=path.extname(f);
 if(!['.js','.html','.css'].includes(ext))continue;
 const source=fs.readFileSync(f,'utf8');
 if(ext==='.js')try{new vm.Script(source,{filename:rel});checks++;}catch(e){fail.push(e.message);}
 if(ext==='.html'){
  for(const [i,m] of Array.from(source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)).entries())try{new vm.Script(m[1],{filename:`${rel}:${i}`});checks++;}catch(e){fail.push(e.message);}
  for(const m of source.matchAll(/\b(?:src|href)="([^"]+)"/g)){
   const url=m[1].split(/[?#]/)[0];if(!url||/^(https?:|data:|blob:|mailto:)/.test(url)||url.startsWith('api/'))continue;
   check(fs.existsSync(path.resolve(path.dirname(f),decodeURIComponent(url))),`${rel}: missing ${url}`);
  }
  const ids=Array.from(source.matchAll(/\bid="([^"]+)"/g),m=>m[1]);check(ids.length===new Set(ids).size,`${rel}: duplicate ids`);
 }
 if(ext==='.css')for(const m of source.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)){if(/^(data:|https?:)/.test(m[1]))continue;check(fs.existsSync(path.resolve(path.dirname(f),m[1])),`${rel}: missing CSS image ${m[1]}`);}
}
const context={console};context.window=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'data/courses.js'),'utf8'),context);
context.STUDY=context.window.STUDY={};vm.runInContext(fs.readFileSync(path.join(root,'data/study/medical-immunology-1.js'),'utf8'),context);
const qs=context.STUDY['medical-immunology-1'].topics.flatMap(t=>t.quiz||[]);
check(qs.length>0,'Question bank is empty');
qs.forEach(q=>check(typeof q.q==='string'&&Array.isArray(q.options)&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length,'Invalid question'));
check(vm.runInContext('COURSES.filter(c=>c.semester===3).length',context)===14,'Semester 3 must retain 14 subjects');
check(!fs.readFileSync(path.join(root,'js/nav.js'),'utf8').match(/id: "grades"[^\n]*enabled: true/),'University grades must not be public without verified auth');
if(fail.length){console.error(fail.join('\n'));process.exit(1);}
console.log(`Redesign checks OK: ${checks}; ${qs.length} existing practice questions; 14 semester-3 subjects.`);
