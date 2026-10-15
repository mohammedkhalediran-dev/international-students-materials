// node data_check.js  — يتحقق من سلامة البيانات ومسارات الملفات
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..','site');
const src=fs.readFileSync(path.join(root,'data/courses.js'),'utf8')+';module.exports={SITE,SEMESTERS,CATEGORIES,COURSES}';
const m={exports:{}};new Function('module',src)(m);
const {SITE,CATEGORIES,COURSES}=m.exports;let bad=0;const fail=t=>{console.log('FAIL',t);bad++};
const ids=new Set();COURSES.forEach(c=>{
 if(ids.has(c.id))fail('dup id '+c.id);ids.add(c.id);
 if(!CATEGORIES.find(x=>x.id===c.category))fail('category '+c.id);
 if(Math.abs(c.credits.theory+c.credits.practical-c.credits.total)>0.011)fail('credits '+c.id);
 c.lectures.forEach(l=>l.files.forEach(f=>{if(!fs.existsSync(path.join(root,SITE.filesBase,f.path)))fail('missing file '+f.path)}));
});
const semTot=s=>Math.round(COURSES.filter(c=>c.semester===s).reduce((n,c)=>n+c.credits.total,0)*100)/100;
const tot=semTot(3);if(tot!==16.3)fail('sem3 total '+tot);
if(semTot(2)!==20.61)fail('sem2 total '+semTot(2));
if(SITE.university.image&&!fs.existsSync(path.join(root,SITE.university.image)))fail('university image');
console.log(bad?bad+' failures':'data OK: '+COURSES.length+' courses, total '+tot);process.exit(bad?1:0);
