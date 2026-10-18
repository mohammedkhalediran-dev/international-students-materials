(function(){
  "use strict";
  if(MS.dataError())return;
  // Keep previously shared bookmarks working after moving tools to dedicated views.
  var legacy={"#search":"search","#subjects":"search","#favorites":"favorites","#professors":"professors","#help":"help","#faq":"help","#review":"favorites"};
  if(legacy[location.hash]){location.replace("workspace.html?view="+legacy[location.hash]+(location.hash==="#review"?"&tab=review":""));return;}
  MS.initShared();MS.initHeader();
  var el=MS.el,$=MS.$;
  var selected=MS.load("ms.sem",null)||MS.currentSemester();
  SEMESTERS.slice().sort(function(a,b){return b.id-a.id;}).forEach(function(s){
    var a=el("a","semester-tile card"+(s.id===selected?" is-current":""));a.href="semester.html?id="+s.id;
    var box=el("div"),no=el("span","semester-no",String(s.id).padStart(2,"0"));box.appendChild(no);
    if(s.id===selected)box.appendChild(el("span","badge","الحالي"));
    box.appendChild(el("h3","",MS.lang==="en"?s.nameEn:s.name));
    box.appendChild(el("p","",MS.subjectsLabel(COURSES.filter(function(c){return c.semester===s.id;}).length)));
    a.appendChild(box);var img=el("img");img.src=s.id===3?"assets/medical-thorax.webp":s.id===2?"assets/courses/anatomy-respiratory.webp":"assets/courses/medical-immunology.webp";img.alt="";img.width=200;img.height=160;a.appendChild(img);$("semGrid").appendChild(a);
  });
  var last=MS.course(MS.getLast());
  if(last){
    $("resumeSection").hidden=false;var card=$("resumeCard");
    var copy=el("div","resume-copy");copy.appendChild(el("h2","","تابع من حيث توقفت"));copy.appendChild(el("h3","en",last.name));copy.appendChild(el("p","",last.nameAr));
    if(last.lectures.length){var bar=el("div","bar"),fill=el("i");fill.style.setProperty("--p",Math.round(MS.progress.done(last)/last.lectures.length*100)+"%");bar.appendChild(fill);copy.appendChild(bar);}
    card.appendChild(copy);var im=el("img");im.src=last.image||"assets/medical-thorax.webp";im.alt="";card.appendChild(im);var go=el("a","btn btn-primary","تابع المادة");go.href="course.html?id="+encodeURIComponent(last.id);go.appendChild(MS.icon("arrow",20));card.appendChild(go);
  }
  var lectures=[];COURSES.forEach(function(c){c.lectures.forEach(function(l){var files=l.files.filter(function(f){return MS.inLatest(c,f);});if(files.length)lectures.push({c:c,l:l,date:files.reduce(function(m,f){return(f.added||"")>m?f.added:m;},"")});});});
  lectures.sort(function(a,b){return b.date.localeCompare(a.date);});
  if(!lectures.length)$("latestList").appendChild(el("div","empty","لم تُرفع ملفات بعد"));
  lectures.slice(0,4).forEach(function(it){var a=el("a","latest-item");a.href="course.html?id="+it.c.id+"#lec-"+it.l.number;a.appendChild(el("span","pdf-icon","PDF"));var n=el("div","latest-main");n.appendChild(el("div","latest-name en",it.l.title));n.appendChild(el("p","latest-sub",MS.lang==="en"?it.c.name:it.c.nameAr));a.appendChild(n);a.appendChild(MS.icon("arrow",20));$("latestList").appendChild(a);});
  if(window.I18N)I18N.apply();
  if("serviceWorker" in navigator && /^https?:/.test(location.protocol))window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){});});
})();
