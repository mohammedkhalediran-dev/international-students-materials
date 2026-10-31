window.MEDIXA_VIEWS=window.MEDIXA_VIEWS||{};
window.MEDIXA_VIEWS.planner=function(w){
  "use strict";
  var el=w.el,t=w.t,root=w.root,button=w.button,field=w.field;
  var sessions=MS.load("ms.planner",[]),tasks=MS.load("ms.tasks",[]),offset=0;
  if(!Array.isArray(sessions))sessions=[];if(!Array.isArray(tasks))tasks=[];
  function localDate(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");}
  function locale(){return MS.lang==="ar"?"ar-IQ-u-nu-latn":MS.lang==="fa"?"fa-IR-u-ca-gregory-nu-latn":"en-GB";}
  function startWeek(){var d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+1)%7)+offset*7);return d;}
  function uid(){return typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);}
  var heading=el("div","planner-header"),range=el("h2"),actions=el("div","planner-actions");heading.appendChild(range);
  actions.appendChild(button(t("السابق","Previous","قبل"),function(){offset--;drawWeek();},"btn btn-secondary btn-sm"));
  actions.appendChild(button(t("اليوم","Today","امروز"),function(){offset=0;drawWeek();},"btn btn-secondary btn-sm"));
  actions.appendChild(button(t("التالي","Next","بعد"),function(){offset++;drawWeek();},"btn btn-secondary btn-sm"));
  heading.appendChild(actions);heading.appendChild(button(t("إضافة جلسة","Add session","افزودن جلسه"),function(){edit();},"btn btn-primary"));root.appendChild(heading);
  var week=el("section","week-grid card");week.setAttribute("aria-label",t("جدول الأسبوع","Weekly schedule","برنامه هفتگی"));root.appendChild(week);
  var emptyNote=el("p","local-note");root.appendChild(emptyNote);
  var dialog=el("dialog","edit-dialog"),form=el("form"),dialogTitle=el("h2","study-sub");dialogTitle.id="sessionTitle";dialog.setAttribute("aria-labelledby","sessionTitle");form.appendChild(dialogTitle);
  var grid=el("div","form-grid"),title=field("text",t("عنوان الجلسة","Session title","عنوان جلسه"));title.required=true;title.maxLength=120;
  var subject=w.select(t("المادة","Subject","درس"),[["",t("مذاكرة عامة","General study","مطالعه عمومی")]].concat(COURSES.map(function(c){return[c.id,w.name(c)];})));
  var date=field("date",t("التاريخ","Date","تاریخ"));date.required=true;
  var time=field("time",t("الوقت","Time","زمان"));time.required=true;
  var duration=field("number",t("المدة بالدقائق","Duration in minutes","مدت به دقیقه"));duration.required=true;duration.min=5;duration.max=480;duration.step=5;
  var kind=w.select(t("النوع","Type","نوع"),[["study",t("دراسة","Study","مطالعه")],["revision",t("مراجعة","Revision","مرور")],["exam",t("امتحان","Exam","امتحان")]]);
  [[t("عنوان الجلسة","Session title","عنوان جلسه"),title,true],[t("المادة","Subject","درس"),subject,true],[t("التاريخ","Date","تاریخ"),date],[t("الوقت","Time","زمان"),time],[t("المدة بالدقائق","Duration in minutes","مدت به دقیقه"),duration],[t("النوع","Type","نوع"),kind]].forEach(function(it){var label=el("label","form-label"+(it[2]?" wide":""));label.appendChild(el("span","",it[0]));label.appendChild(it[1]);grid.appendChild(label);});form.appendChild(grid);
  var controls=el("div","form-actions");controls.appendChild(button(t("إلغاء","Cancel","لغو"),function(){dialog.close();}));var save=el("button","btn btn-primary",t("حفظ الجلسة","Save session","ذخیره جلسه"));save.type="submit";controls.appendChild(save);form.appendChild(controls);dialog.appendChild(form);root.appendChild(dialog);var editing=null;
  function edit(item){editing=item?item.id:null;dialogTitle.textContent=item?t("تعديل الجلسة","Edit session","ویرایش جلسه"):t("إضافة جلسة","Add session","افزودن جلسه");title.value=item?item.title:"";subject.value=item?item.course:"";date.value=item?item.date:localDate(new Date());time.value=item?item.time:"09:00";duration.value=item?item.duration:45;kind.value=item?item.kind:"study";dialog.showModal();title.focus();}
  form.addEventListener("submit",function(e){e.preventDefault();if(!form.reportValidity())return;var clean=title.value.trim();if(!clean){title.focus();return;}var old=sessions.find(function(s){return s.id===editing;});var item={id:editing||uid(),title:clean,course:subject.value,date:date.value,time:time.value,duration:Number(duration.value),kind:kind.value,done:old?old.done:false};if(editing)sessions=sessions.map(function(s){return s.id===editing?item:s;});else sessions.push(item);MS.save("ms.planner",sessions);dialog.close();drawWeek();MS.toast(t("تم حفظ الجلسة","Session saved","جلسه ذخیره شد"));});
  function drawWeek(){week.textContent="";var first=startWeek(),last=new Date(first);last.setDate(last.getDate()+6);range.textContent=first.toLocaleDateString(locale(),{day:"numeric",month:"short"})+" — "+last.toLocaleDateString(locale(),{day:"numeric",month:"short",year:"numeric"});var shown=0;
    for(var n=0;n<7;n++){
      var d=new Date(first);d.setDate(d.getDate()+n);var iso=localDate(d),col=el("div","day-column"+(iso===localDate(new Date())?" is-today":"")),label=el("div","day-label",d.toLocaleDateString(locale(),{weekday:"short"}));label.appendChild(el("strong","",String(d.getDate())));col.appendChild(label);
      var items=sessions.filter(function(s){return s.date===iso;}).sort(function(a,b){return a.time.localeCompare(b.time);});shown+=items.length;
      items.forEach(function(item){var card=el("article","session"+(item.done?" is-done":"")+(item.kind==="exam"?" is-exam":""));card.appendChild(el("small","",item.time+" · "+item.duration+t(" د"," min"," دقیقه")));card.appendChild(el("strong","",item.title));var c=MS.course(item.course);if(c)card.appendChild(el("small","",w.name(c)));var tools=el("div","session-tools");
        var check=button(item.done?"✓":"○",function(){item.done=!item.done;MS.save("ms.planner",sessions);drawWeek();},"");check.setAttribute("aria-label",item.done?t("إلغاء الاكتمال","Mark incomplete","تکمیل نشده"):t("تعليم كمكتملة","Mark complete","تکمیل شد"));check.setAttribute("aria-pressed",String(item.done));tools.appendChild(check);
        var editButton=button(t("تعديل","Edit","ویرایش"),function(){edit(item);},"");tools.appendChild(editButton);
        var del=button("×",function(){if(!confirm(t("حذف هذه الجلسة؟","Delete this session?","این جلسه حذف شود؟")))return;sessions=sessions.filter(function(s){return s.id!==item.id;});MS.save("ms.planner",sessions);drawWeek();},"");del.setAttribute("aria-label",t("حذف الجلسة","Delete session","حذف جلسه"));tools.appendChild(del);card.appendChild(tools);col.appendChild(card);
      });if(!items.length)col.appendChild(el("span","subtle","—"));week.appendChild(col);
    }
    emptyNote.textContent=shown?t("جلسات هذا الأسبوع: ","Sessions this week: ","جلسات این هفته: ")+shown:t("أسبوعك جاهز للتخطيط. أضف أول جلسة دراسية.","Your week is ready. Add your first study session.","هفته شما آماده است. اولین جلسه مطالعه را اضافه کنید.");
  }
  drawWeek();
  var extras=el("div","planner-extras"),taskCard=el("section","card workspace-card"),focusCard=el("section","card workspace-card");extras.appendChild(taskCard);extras.appendChild(focusCard);root.appendChild(extras);
  taskCard.appendChild(el("h2","",t("قائمة المهام","Tasks","کارها")));var taskForm=el("form","task-form"),taskInput=field("text",t("أضف مهمة قصيرة","Add a short task","یک کار کوتاه اضافه کنید"));taskInput.maxLength=180;taskInput.required=true;taskForm.appendChild(taskInput);var add=el("button","btn btn-primary",t("إضافة","Add","افزودن"));add.type="submit";taskForm.appendChild(add);taskCard.appendChild(taskForm);var taskList=el("div","task-list");taskCard.appendChild(taskList);
  function drawTasks(){taskList.textContent="";tasks.forEach(function(item){var row=el("div","task-row"),label=el("label"),check=el("input");check.type="checkbox";check.checked=item.done;check.addEventListener("change",function(){item.done=check.checked;MS.save("ms.tasks",tasks);});label.appendChild(check);label.appendChild(el("span","",item.title));row.appendChild(label);var del=button("×",function(){tasks=tasks.filter(function(s){return s.id!==item.id;});MS.save("ms.tasks",tasks);drawTasks();},"");del.setAttribute("aria-label",t("حذف المهمة","Delete task","حذف کار"));row.appendChild(del);taskList.appendChild(row);});}
  taskForm.addEventListener("submit",function(e){e.preventDefault();var value=taskInput.value.trim();if(!value)return;tasks.push({id:uid(),title:value,done:false});MS.save("ms.tasks",tasks);taskInput.value="";drawTasks();});drawTasks();
  focusCard.appendChild(el("h2","",t("وقت التركيز","Focus time","زمان تمرکز")));focusCard.appendChild(el("p","subtle",t("جلسة هادئة، مهمة واحدة.","A quiet session. One task at a time.","جلسه‌ای آرام، فقط یک کار.")));
  var clock=el("div","focus-clock"),opts=el("div","focus-options"),clockControls=el("div","workspace-toolbar");clock.setAttribute("role","timer");focusCard.appendChild(opts);focusCard.appendChild(clock);focusCard.appendChild(clockControls);
  var timerState=MS.load("ms.focus",{remaining:1500,end:null}),remaining=Number(timerState.remaining)||1500,end=Number(timerState.end)||null,finished=false;
  var toggle=button("",function(){if(end){remaining=Math.max(0,Math.ceil((end-Date.now())/1000));end=null;}else{if(remaining===0)remaining=1500;end=Date.now()+remaining*1000;finished=false;}storeTimer();tick();},"btn btn-primary");clockControls.appendChild(toggle);
  function storeTimer(){MS.save("ms.focus",{remaining:remaining,end:end});}
  function tick(){var seconds=end?Math.max(0,Math.ceil((end-Date.now())/1000)):remaining;clock.textContent=String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");toggle.textContent=end?t("إيقاف مؤقت","Pause","مکث"):t("ابدأ التركيز","Start focus","شروع تمرکز");if(end&&seconds===0){end=null;remaining=0;storeTimer();if(!finished){finished=true;MS.toast(t("اكتملت جلسة التركيز","Focus session complete","جلسه تمرکز تمام شد"));}toggle.textContent=t("ابدأ التركيز","Start focus","شروع تمرکز");}}
  [25,45,5].forEach(function(m){opts.appendChild(button(m+t(" دقيقة"," min"," دقیقه"),function(){end=null;remaining=m*60;finished=false;storeTimer();tick();},"chip"));});
  clockControls.appendChild(button(t("إعادة ضبط","Reset","بازنشانی"),function(){end=null;remaining=1500;finished=false;storeTimer();tick();}));tick();var timer=setInterval(tick,1000);window.addEventListener("pagehide",function(){clearInterval(timer);});
  var progressCard=el("section","card workspace-card"),examCard=el("section","card workspace-card");extras.appendChild(progressCard);extras.appendChild(examCard);
  progressCard.appendChild(el("h2","",t("تقدم القراءة","Reading progress","پیشرفت مطالعه")));
  var total=0,done=0;COURSES.forEach(function(c){total+=c.lectures.length;done+=MS.progress.done(c);});
  progressCard.appendChild(el("div","focus-clock",total?Math.round(done/total*100)+"%":"0%"));
  progressCard.appendChild(el("p","subtle",done+" / "+total+" "+t("محاضرة مقروءة","lectures read","درس خوانده شده")));
  progressCard.appendChild(w.link(t("قائمة المراجعة","Review list","فهرست مرور"),"workspace.html?view=favorites&tab=review"));
  examCard.appendChild(el("h2","",t("عدّاد الامتحان","Exam countdown","شمارش معکوس امتحان")));
  var examDate=field("date",t("تاريخ الامتحان","Exam date","تاریخ امتحان"));examDate.value=MS.load(MS.KEY.exam,"");examCard.appendChild(examDate);var examOut=el("p","local-note");examCard.appendChild(examOut);
  function renderExam(){var v=examDate.value;if(!v){examOut.textContent=t("حدد التاريخ لتعرف كم يوم بقي.","Set a date to see how many days remain.","تاریخ را برای دیدن روزهای باقی‌مانده تعیین کنید.");return;}var parts=v.split("-"),target=Date.UTC(+parts[0],+parts[1]-1,+parts[2]),now=new Date(),today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()),days=Math.round((target-today)/86400000);examOut.textContent=days<0?t("مضى موعد الامتحان.","The exam date has passed.","تاریخ امتحان گذشته است."):days===0?t("الامتحان اليوم، بالتوفيق.","Your exam is today. Good luck.","امتحان امروز است. موفق باشید."):days+t(" يوم متبقٍ"," days remaining"," روز باقی مانده");}
  examDate.addEventListener("change",function(){MS.save(MS.KEY.exam,examDate.value);renderExam();});renderExam();examCard.appendChild(button(t("مسح","Clear","پاک کردن"),function(){examDate.value="";MS.save(MS.KEY.exam,"");renderExam();},"btn btn-secondary btn-sm"));w.localNote();
};
