// node data_check.js  — يتحقق من سلامة البيانات ومسارات الملفات
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..','site');
const src=fs.readFileSync(path.join(root,'data/courses.js'),'utf8')+';module.exports={SITE,SEMESTERS,CATEGORIES,COURSES}';
const m={exports:{}};new Function('module',src)(m);
const {SITE,CATEGORIES,COURSES}=m.exports;let bad=0;const fail=t=>{console.log('FAIL',t);bad++};
const ids=new Set();COURSES.forEach(c=>{
 if(ids.has(c.id))fail('dup id '+c.id);ids.add(c.id);
 if(!CATEGORIES.find(x=>x.id===c.category))fail('category '+c.id);
 if(c.credits&&c.credits.theory!=null&&Math.abs(c.credits.theory+c.credits.practical-c.credits.total)>0.011)fail('credits '+c.id);
 c.lectures.forEach(l=>l.files.forEach(f=>{if(!fs.existsSync(path.join(root,SITE.filesBase,f.path)))fail('missing file '+f.path)}));
});
// وضع الدراسة: كل محاضرة فيها study:true لها ملف data/study/<id>-<رقم>.js سليم البنية
const LAT=/[A-Za-z]/,ARB=/^[\u0600-\u06FF0-9\s\-،.:؟()«»]+$/;
COURSES.forEach(c=>c.lectures.forEach(l=>{
 if(!l.study)return;
 const key=c.id+'-'+l.number,file=path.join(root,'data/study',key+'.js');
 if(!fs.existsSync(file)){fail('study file missing '+key);return}
 const w={};try{new Function('window','STUDY',fs.readFileSync(file,'utf8').replace(/window\.STUDY = window\.STUDY \|\| \{\};/,''))(w,w.STUDY=(w.STUDY={}))}catch(e){fail('study parse '+key+' '+e.message);return}
 const d=w.STUDY[key];if(!d||!Array.isArray(d.topics)||!d.topics.length){fail('study empty '+key);return}
 const seen=new Set();
 d.topics.forEach(t=>{
  const at=key+'/'+t.id;
  if(seen.has(t.id))fail('study dup topic '+at);seen.add(t.id);
  if(!t.term||!LAT.test(t.term))fail('study term (English) '+at);
  if(!t.title||LAT.test(t.title))fail('study title must be Arabic only '+at);
  (t.words||[]).forEach(x=>{if(!x.en||!x.pron||!ARB.test(x.pron)||x.pron.split('-').length<2||x.pron.split('-').length>3)fail('study pron '+at+' '+x.en)});
  if(!t.facts||!t.facts.length)fail('study facts '+at);
  (t.facts||[]).forEach((f,i)=>{
   if(!f.en||!LAT.test(f.en))fail('study fact en '+at+'#'+i);
   if(!f.ar||LAT.test(f.ar))fail('study fact ar (no Latin letters) '+at+'#'+i);
   if(!f.trick||LAT.test(f.trick))fail('study fact trick missing or has Latin letters '+at+'#'+i);
  });
  if(!t.quiz||t.quiz.length<2)fail('study quiz needs 2+ questions '+at);
  (t.quiz||[]).forEach((q,i)=>{
   if(!q.q||!Array.isArray(q.options)||q.options.length<2||q.options.length>5)fail('study quiz options '+at+'#'+i);
   else if(!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length)fail('study quiz answer '+at+'#'+i);
   if(new Set(q.options).size!==(q.options||[]).length)fail('study quiz duplicate options '+at+'#'+i);
   if(!q.why||LAT.test(q.why))fail('study quiz why missing or has Latin letters '+at+'#'+i);
  });
 });
 console.log('study OK: '+key+' ('+d.topics.length+' topics)');
}));
const semTot=s=>Math.round(COURSES.filter(c=>c.semester===s).reduce((n,c)=>n+(c.credits?c.credits.total:0),0)*100)/100;
const tot=semTot(3);if(tot!==16.3)fail('sem3 total '+tot);
if(semTot(1)!==12.64)fail('sem1 total '+semTot(1));
if(semTot(2)!==20.61)fail('sem2 total '+semTot(2));
if(SITE.university.image&&!fs.existsSync(path.join(root,SITE.university.image)))fail('university image');
console.log(bad?bad+' failures':'data OK: '+COURSES.length+' courses, total '+tot);process.exit(bad?1:0);
