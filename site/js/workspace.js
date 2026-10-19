(function(){
  "use strict";
  if(MS.dataError())return;
  MS.initShared();MS.initHeader();
  var $=MS.$,el=MS.el,root=$("workspaceContent"),params=new URLSearchParams(location.search),view=params.get("view")||"search";
  function t(ar,en,fa){return MS.lang==="en"?en:MS.lang==="fa"?(fa||en):ar;}
  function text(tag,cls,ar,en,fa){return el(tag,cls,t(ar,en,fa));}
  function button(label,fn,cls){var b=el("button",cls||"btn btn-secondary",label);b.type="button";b.addEventListener("click",fn);return b;}
  function link(label,url,cls){var a=el("a",cls||"section-link",label);a.href=url;return a;}
  function empty(title,detail,parent){var box=el("div","empty");box.appendChild(el("strong","",title));if(detail)box.appendChild(el("p","",detail));(parent||root).appendChild(box);return box;}
  function name(c){return MS.lang==="en"?c.name:MS.lang==="fa"?(c.nameFa||c.name):c.nameAr;}
  function courseUrl(c){return "course.html?id="+encodeURIComponent(c.id);}
  function localNote(parent){(parent||root).appendChild(text("p","local-note","تُحفظ بياناتك على هذا الجهاز والمتصفح فقط.","Your data is saved only on this device and browser.","اطلاعات شما فقط در این دستگاه و مرورگر ذخیره می‌شود."));}
  function field(type,placeholder){var input=el("input","field");input.type=type;input.placeholder=placeholder;input.setAttribute("aria-label",placeholder);return input;}
  function select(label,items){var s=el("select","field");s.setAttribute("aria-label",label);items.forEach(function(it){var o=el("option","",it[1]);o.value=it[0];s.appendChild(o);});return s;}
  function lectureRow(c,l){var a=el("a","latest-item");a.href=courseUrl(c)+"#lec-"+l.number;var type=(l.files[0]||{}).type;a.appendChild(el("span","pdf-icon",type==="quiz"?"MCQ":"PDF"));var info=el("div","latest-main");info.appendChild(el("strong","latest-name en",l.title));info.appendChild(el("p","latest-sub",name(c)));a.appendChild(info);a.appendChild(MS.icon("arrow",20));return a;}
  var names={
    search:["ابحث في Medixa","Search Medixa","جستجو در Medixa"],
    favorites:["المفضلة وقائمة المراجعة","Favorites and review list","علاقه‌مندی‌ها و مرور"],
    lectures:["مكتبة المحاضرات","Lecture library","کتابخانه درس‌ها"],
    professors:["الأساتذة","Professors","استادان"],
    planner:["خطّط لدراستك","Plan your study","برنامه‌ریزی مطالعه"],
    questions:["بنك الأسئلة","Question bank","بانک سؤال"],
    results:["نتائج التدريب","Practice results","نتایج تمرین"],
    settings:["الإعدادات","Settings","تنظیمات"],
    help:["كيف نقدر نساعدك؟","How can we help?","چطور می‌توانیم کمک کنیم؟"],
    grades:["درجاتي الجامعية","University grades","نمرات دانشگاهی"],
    profile:["حساب الطالب","Student account","حساب دانشجو"]
  };
  if(!names[view])view="search";
  var title=t.apply(null,names[view]);$("viewTitle").textContent=title;document.title=title+" | "+SITE.title;
  $("viewSubtitle").textContent=t("محاضراتك وأدوات دراستك، في مكان واحد.","Your lectures and study tools, together.","درس‌ها و ابزارهای مطالعه، در یک جا.");
  var ctx={root:root,$:$,el:el,t:t,text:text,button:button,link:link,empty:empty,name:name,courseUrl:courseUrl,localNote:localNote,field:field,select:select};

  function search(isLectures){
    var toolbar=el("div","workspace-toolbar"),input=field("search",t("ابحث عن مادة أو أستاذ أو محاضرة","Search subject, professor or lecture","جستجوی درس، استاد یا جلسه"));input.id="search";input.value=params.get("q")||"";toolbar.appendChild(input);
    var sem=select(t("الكورس","Semester","ترم"),[["all",t("كل الكورسات","All semesters","همه ترم‌ها")]].concat(SEMESTERS.map(function(s){return [String(s.id),MS.lang==="en"?s.nameEn:s.name];})));toolbar.appendChild(sem);
    var cat=select(t("نوع المحتوى","Content type","نوع محتوا"),isLectures?[["lectures",t("المحاضرات","Lectures","درس‌ها")]]:[["all",t("الكل","All","همه")],["subjects",t("المواد","Subjects","دروس")],["lectures",t("المحاضرات","Lectures","درس‌ها")],["professors",t("الأساتذة","Professors","استادان")]]);toolbar.appendChild(cat);root.appendChild(toolbar);
    var count=el("p","subtle");count.setAttribute("role","status");root.appendChild(count);var results=el("div");root.appendChild(results);
    function draw(){results.textContent="";var q=MS.norm(input.value),n=0;
      var courses=COURSES.filter(function(c){return sem.value==="all"||String(c.semester)===sem.value;});
      function matches(s){return !q||MS.norm(s).includes(q);}
      if(cat.value==="all"||cat.value==="subjects"){
        var found=courses.filter(function(c){return matches([c.name,c.nameAr,c.nameFa,c.code].concat(c.professors.map(function(p){return p.name;})).join(" "));});
        if(found.length){results.appendChild(text("h2","study-sub","المواد الدراسية","Subjects","دروس"));var grid=el("div","course-grid");found.forEach(function(c){grid.appendChild(MS.courseCard(c));});results.appendChild(grid);n+=found.length;}
      }
      if(cat.value==="all"||cat.value==="lectures"){
        var lectures=[];courses.forEach(function(c){c.lectures.forEach(function(l){if(matches([l.title,c.name,c.nameAr].join(" ")))lectures.push({c:c,l:l,date:l.files.reduce(function(d,f){return(f.added||"")>d?f.added:d;},"")});});});
        lectures.sort(function(a,b){return b.date.localeCompare(a.date);});
        if(lectures.length){results.appendChild(text("h2","study-sub","المحاضرات","Lectures","درس‌ها"));var list=el("div","latest-stack");lectures.forEach(function(it){list.appendChild(lectureRow(it.c,it.l));});results.appendChild(list);n+=lectures.length;}
      }
      if(cat.value==="professors"||(cat.value==="all"&&q)){
        var faculty=MS.professors().filter(function(p){return matches(p.name)&&p.courses.some(function(c){return courses.includes(c);});});
        if(faculty.length){results.appendChild(text("h2","study-sub","الأساتذة","Professors","استادان"));results.appendChild(facultyGrid(faculty));n+=faculty.length;}
      }
      count.textContent=t("النتائج: ","Results: ","نتایج: ")+n;
      if(!n)empty(t("لا توجد نتائج","No results","نتیجه‌ای یافت نشد"),t("جرّب كلمة أخرى أو غيّر التصفية.","Try another term or change your filters.","عبارت یا فیلتر دیگری را امتحان کنید."),results);
    }
    input.addEventListener("input",draw);sem.addEventListener("change",draw);cat.addEventListener("change",draw);draw();
  }
  function favorites(){
    var tabs=el("div","chips"),content=el("div"),mode=params.get("tab")==="review"?"review":"subjects";root.appendChild(tabs);root.appendChild(content);
    function draw(){content.textContent="";Array.from(tabs.children).forEach(function(b,i){var on=(i===0)===(mode==="subjects");b.classList.toggle("is-on",on);b.setAttribute("aria-pressed",String(on));});
      if(mode==="subjects"){var list=COURSES.filter(function(c){return MS.favs.has(c.id);});if(!list.length)empty(t("لم تضف مواد إلى المفضلة بعد","No saved subjects yet","هنوز درسی ذخیره نشده است"),t("اضغط على النجمة في أي مادة لتظهر هنا.","Tap the star on a subject to save it here.","برای ذخیره درس روی ستاره بزنید."),content);else{var grid=el("div","course-grid");list.forEach(function(c){grid.appendChild(MS.courseCard(c,draw));});content.appendChild(grid);}}
      else{var list=el("div","latest-stack");COURSES.forEach(function(c){c.lectures.filter(function(l){return MS.review.has(c.id,l.number);}).forEach(function(l){list.appendChild(lectureRow(c,l));});});if(list.childElementCount)content.appendChild(list);else empty(t("قائمة المراجعة فارغة","Your review list is empty","فهرست مرور خالی است"),t("علّم أي محاضرة براجعها لاحقاً لتظهر هنا.","Mark a lecture for review to find it here.","یک جلسه را برای مرور علامت بزنید."),content);}
    }
    [["subjects",t("المواد","Subjects","دروس")],["review",t("قائمة المراجعة","Review list","مرور")]].forEach(function(it){tabs.appendChild(button(it[1],function(){mode=it[0];draw();},"chip"));});draw();localNote();
  }
  function facultyGrid(list){var grid=el("div","faculty-grid");list.forEach(function(p){var card=el("article","faculty-card card");var initial=p.name.replace(/^(Dr|Mr|Mrs)\.\s*/,"").slice(0,2).toUpperCase();card.appendChild(el("span","prof-avatar",initial));card.appendChild(el("h2","en",p.name));if(p.roles.length)card.appendChild(el("p","subtle en",p.roles.join(" · ")));p.courses.forEach(function(c){card.appendChild(link(name(c),courseUrl(c)));});grid.appendChild(card);});return grid;}
  function professors(){var input=field("search",t("ابحث عن أستاذ","Search a professor","جستجوی استاد")),box=el("div");input.id="search";root.appendChild(input);root.appendChild(el("div","workspace-toolbar"));root.appendChild(box);function draw(){box.textContent="";var list=MS.professors().filter(function(p){return MS.norm(p.name).includes(MS.norm(input.value));});if(list.length)box.appendChild(facultyGrid(list));else empty(t("لا توجد نتائج","No results","نتیجه‌ای یافت نشد"),"",box);}input.addEventListener("input",draw);draw();}
  function settings(){
    var card=el("section","card workspace-card");card.appendChild(text("h2","","خصّص تجربتك","Make it yours","تجربه خود را شخصی کنید"));root.appendChild(card);
    function row(label,desc,control){var r=el("label","settings-row"),copy=el("div");copy.appendChild(el("strong","",label));if(desc)copy.appendChild(el("p","subtle",desc));r.appendChild(copy);r.appendChild(control);card.appendChild(r);}
    var theme=select(t("المظهر","Appearance","ظاهر"),[["light",t("فاتح","Light","روشن")],["dark",t("داكن","Dark","تیره")],["system",t("النظام","System","سیستم")]]);theme.value=MS.load(MS.KEY.theme,"light");theme.addEventListener("change",function(){MS.save(MS.KEY.theme,theme.value);var v=theme.value==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):theme.value;document.documentElement.setAttribute("data-theme",v);window.dispatchEvent(new Event("medixa-theme"));MS.toast(t("تم حفظ التغييرات","Changes saved","تغییرات ذخیره شد"));});row(t("المظهر","Appearance","ظاهر"),"",theme);
    var lang=select(t("اللغة","Language","زبان"),[["ar","العربية"],["en","English"],["fa","فارسی"]]);lang.value=MS.lang;lang.setAttribute("data-i18n-skip","");lang.addEventListener("change",function(){I18N.set(lang.value);});row(t("اللغة","Language","زبان"),"",lang);
    var sem=select(t("كورسي الحالي","My semester","ترم من"),(MS.ALL_SEMESTERS||SEMESTERS).map(function(s){return[String(s.id),MS.lang==="en"?s.nameEn:s.name];}));sem.value=String(MS.load("ms.sem",null)||MS.currentSemester());sem.addEventListener("change",function(){if(MS.setCourse)MS.setCourse(Number(sem.value));else{MS.save("ms.sem",Number(sem.value));location.reload();}});row(t("كورسي الحالي","My semester","ترم من"),t("تظهر لك مواد هذا الكورس فقط، وتصلك إشعارات محاضراته.","Only this semester's subjects are shown, and you get notifications for its lectures.","فقط درس‌های این ترم نمایش داده می‌شود و اعلان درس‌های آن را دریافت می‌کنید."),sem);
    var motion=field("checkbox",t("تقليل الحركة","Reduce motion","کاهش حرکت"));motion.className="";motion.checked=!!MS.load("ms.reducedMotion",false);motion.addEventListener("change",function(){MS.save("ms.reducedMotion",motion.checked);document.documentElement.classList.toggle("reduced-motion",motion.checked);});row(t("تقليل الحركة","Reduce motion","کاهش حرکت"),t("تقليل الانتقالات والحركات في الواجهة.","Reduce transitions and animation.","کاهش پویانمایی و حرکت در صفحه."),motion);
    var exportBtn=button(t("تنزيل نسخة من بياناتي","Download my data","دریافت نسخه اطلاعات من"),function(){var keys=["ms.fav","ms.read","ms.review","ms.study","ms.planner","ms.tasks","ms.quizHistory","ms.sem","ms.notes"];var data={format:"medixa-local-backup",version:1,created:new Date().toISOString(),data:{}};keys.forEach(function(k){data.data[k]=MS.load(k,null);});var url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"})),a=link("","","");a.href=url;a.download="medixa-study-backup.json";document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);});
    row(t("نسخة احتياطية","Backup","نسخه پشتیبان"),t("احتفظ بنسخة من تقدمك ومخططك ومفضلتك.","Keep a copy of your progress, planner and favorites.","نسخه‌ای از پیشرفت و برنامه خود نگه دارید."),exportBtn);localNote(card);
    var privacy=el("section","card workspace-card section");privacy.appendChild(text("h2","","الحساب والدرجات الجامعية","Account and university grades","حساب و نمرات دانشگاهی"));privacy.appendChild(text("p","subtle","يمكنك الدخول بحساب Google من زر الحساب لحفظ تقدّمك. الدرجات الجامعية غير متاحة حالياً.","You can sign in with Google from the account button to save your progress. University grades are not available yet.","با دکمه حساب می‌توانید با Google وارد شوید تا پیشرفتتان ذخیره شود. نمرات دانشگاهی فعلاً در دسترس نیست."));root.appendChild(privacy);
  }
  function help(){
    var faq=[
      [["كيف أفتح المحاضرة؟","How do I open a lecture?","چطور درس را باز کنم؟"],["اختر الكورس ثم المادة، وافتح ملف المحاضرة. يمكنك عرضه داخل الصفحة أو تنزيله.","Choose a semester and subject, then open the lecture file. View it on the page or download it.","ترم و درس را انتخاب کنید، سپس فایل جلسه را باز یا دریافت کنید."]],
      [["أين يُحفظ تقدمي؟","Where is my progress saved?","پیشرفت من کجا ذخیره می‌شود؟"],["يُحفظ على هذا الجهاز والمتصفح. لا ينتقل تلقائياً إلى جهاز آخر، فاحتفظ بنسخة من الإعدادات.","On this device and browser. It does not sync to another device. Download a backup in Settings.","در همین دستگاه و مرورگر ذخیره می‌شود. از بخش تنظیمات نسخه پشتیبان بگیرید."]],
      [["كيف أستخدم مخطط الدراسة؟","How do I use the planner?","چطور از برنامه مطالعه استفاده کنم؟"],["اضغط إضافة جلسة واختر المادة والوقت. يمكنك تعديل الجلسة أو تعليمها كمكتملة.","Select Add session, choose a subject and time. Edit a session or mark it complete whenever needed.","افزودن جلسه را بزنید و درس و زمان را مشخص کنید. سپس می‌توانید آن را ویرایش یا تکمیل کنید."]],
      [["من أين تأتي أسئلة التدريب؟","Where do practice questions come from?","سؤال‌های تمرین از کجا آمده‌اند؟"],["الأسئلة من محتوى الدراسة المتاح في الموقع. يعرض بنك الأسئلة المحاضرات التي تحتوي أسئلة فقط.","Questions come from the site's existing study content. Only lectures with questions are offered.","سؤال‌ها از محتوای مطالعه موجود در سایت هستند. فقط جلسات دارای سؤال نمایش داده می‌شوند."]],
      [["أين درجاتي الجامعية؟","Where are my university grades?","نمرات دانشگاهی من کجاست؟"],["هذه الخدمة لم تُفعّل بعد. لا نطلب منك رقمك الطلابي أو درجاتك في هذه النسخة.","This service is not active yet. This version does not request your student ID or grades.","این خدمت هنوز فعال نشده است. در این نسخه شماره دانشجویی یا نمرات شما درخواست نمی‌شود."]],
      [["كيف أرفع محاضرة؟","How can I upload a lecture?","چطور فایل درس بارگذاری کنم؟"],["صفحة رفع المحاضرات للمشرفين فقط، باستخدام رمز الرفع الخاص بهم.","The upload page is for administrators using their upload access code.","صفحه بارگذاری برای مدیران دارای کد دسترسی است."]]
    ];var input=field("search",t("ابحث في المساعدة","Search help","جستجو در راهنما"));root.appendChild(input);var box=el("div","help-questions section");root.appendChild(box);function draw(){box.textContent="";faq.forEach(function(it){var q=t.apply(null,it[0]),a=t.apply(null,it[1]);if(!MS.norm(q+" "+a).includes(MS.norm(input.value)))return;var d=el("details","card");d.appendChild(el("summary","",q));d.appendChild(el("p","",a));box.appendChild(d);});if(!box.childElementCount)empty(t("لا توجد نتائج","No results","نتیجه‌ای یافت نشد"),"",box);}input.addEventListener("input",draw);draw();
    var actions=el("div","workspace-toolbar");actions.appendChild(link(t("الإعدادات","Settings","تنظیمات"),"workspace.html?view=settings","btn btn-secondary"));actions.appendChild(link(t("رفع المحاضرات للمشرفين","Administrator uploads","بارگذاری مدیران"),"upload.html","btn btn-secondary"));root.appendChild(actions);
  }
  if(view==="search")search(false);else if(view==="lectures")search(true);else if(view==="favorites")favorites();else if(view==="professors")professors();else if(view==="settings")settings();else if(view==="help")help();else if(window.MEDIXA_VIEWS&&window.MEDIXA_VIEWS[view])window.MEDIXA_VIEWS[view](ctx);else{
    var state=el("section","card workspace-card privacy-state");state.appendChild(MS.icon("shield",42));state.appendChild(text("h2","","حسابك الدراسي، قريباً","Your student account, coming soon","حساب دانشجویی، به‌زودی"));state.appendChild(text("p","subtle","ستتاح هذه الخدمة بعد تفعيل تسجيل الدخول والتحقق من هوية الطالب.","This service will be available once sign-in and student verification are enabled.","این خدمت پس از فعال شدن ورود و تأیید هویت در دسترس خواهد بود."));state.appendChild(link(t("العودة إلى الرئيسية","Back to home","بازگشت به خانه"),"index.html","btn btn-primary"));root.appendChild(state);
  }
  I18N.apply();
})();
