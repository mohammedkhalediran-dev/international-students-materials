/* js/i18n.js — واجهة ثلاثية اللغة بلا مكتبات: عربي (RTL) وفارسی (RTL) وEnglish (LTR).
   النصوص العربية تبقى في الصفحات كما هي، وتُترجم عند العرض من القاموسين EN وFA أدناه.
   لإضافة ترجمة: أضف سطراً "النص العربي": "الترجمة" في القاموس المناسب.
   ترجمة الفارسية تحتاج مراجعة متحدث أصلي قبل النشر العام. */
(function () {
  "use strict";
  var KEY = "ms.lang";
  var LANGS = { ar: "rtl", fa: "rtl", en: "ltr" };
  var lang = "ar";
  try { var s = JSON.parse(localStorage.getItem(KEY)); if (LANGS[s]) lang = s; } catch (e) {}
  var I18N = (window.I18N = { lang: lang, dir: LANGS[lang], langs: LANGS });

  var EN = {
    "رحلتك في عالم الطب تبدأ من هنا": "Your journey into medicine starts here",
    "استكشف المواد الدراسية": "Explore the subjects", "ابحث عن محاضرة": "Find a lecture",
    "الوصول السريع": "Quick access", "المواد الدراسية": "Subjects", "تصفح مواد الكورس الثالث": "Browse the third-semester subjects",
    "المحاضرات": "Lectures", "آخر المحاضرات والملفات المضافة": "Latest lectures and files added",
    "بنك الأسئلة": "Question bank", "أسئلة اختيار من متعدد للتدرّب": "Multiple-choice questions for practice",
    "التقويم الأكاديمي": "Academic calendar", "مواعيد المحاضرات والامتحانات": "Lecture and exam dates",
    "الأساتذة": "Professors", "أساتذة مواد الكورس الثالث": "Professors of the third-semester subjects",
    "عرض": "View", "قريباً": "Coming soon",
    "ابدأ من هنا": "Start here", "أساسية": "Basic", "عامة": "General", "مفضلة": "Favorites", "ابدأ": "Start",
    "مواد العلوم الطبية الأساسية ومحاضراتها.": "Basic medical sciences subjects and their lectures.",
    "المواد العامة في الكورس.": "The general subjects in the course.",
    "المواد التي أضفتها إلى المفضلة.": "Subjects you added to favorites.",
    "مواد الطلاب الدوليين": "International Students Materials",
    "مواد الطلاب": "Student Materials",
    "كل ملفات الكورس الثالث في مكان واحد. اختر المادة، ثم المحاضرة، وافتح الملف.": "All third-semester files in one place. Pick a subject, then a lecture, then open the file.",
    "ملفات الكورس الثالث في مكان واحد. موقع غير رسمي من إعداد طالب.": "Third-semester files in one place. An unofficial, student-made site.",
    "موقع غير رسمي من إعداد طالب، ولا يمثل الجامعة. سيبقى هذا التنويه حتى تؤكد الجامعة الموقع رسمياً.": "Unofficial site made by a student. It does not represent the university. This notice stays until the university confirms the site.",
    "جامعة بابل للعلوم الطبية": "Babol University of Medical Sciences",
    "المدخل الرئيسي لجامعة بابل للعلوم الطبية": "Main entrance of Babol University of Medical Sciences",
    "التنقل الرئيسي": "Main navigation",
    "الرئيسية": "Home", "المواد": "Subjects", "الأساتذة": "Professors", "كيف تبدأ": "How to start",
    "آخر الملفات": "Latest files", "الأسئلة الشائعة": "FAQ", "القائمة": "Menu",
    "بحث": "Search", "اللغة": "Language", "تخطَّ إلى المحتوى": "Skip to content",
    "للطلاب الدوليين، الكورس الثالث": "For international students, semester 3",
    "تصفح المواد": "Browse subjects", "كيف أستخدم الموقع": "How to use the site",
    "اختصارات": "Shortcuts",
    "العلوم الطبية الأساسية": "Basic medical sciences", "المواد العامة": "General subjects",
    "المفضلة": "Favorites", "قائمة المراجعة": "Review list",
    "تابع من حيث توقفت": "Continue where you left off", "عدّاد الامتحان": "Exam countdown",
    "تاريخ الامتحان": "Exam date", "ملخص المحتوى": "Content summary",
    "مادة": "subjects", "أستاذ": "professors", "درجة الكورس كاملاً": "total semester grade", "ملف PDF": "PDF files",
    "ابحث عن مادة أو أستاذ أو محاضرة": "Search subject, professor or lecture",
    "ابحث عن مادة أو أستاذ أو رمز": "Search subject, professor or code",
    "ترتيب المواد": "Sort subjects", "الترتيب": "Sort", "الاسم": "Name", "الرمز": "Code", "تصفية المواد": "Filter subjects",
    "المحاضرات التي علّمتها": "Lectures you marked", "راجعها لاحقاً": "Review later",
    "تُحفظ على هذا الجهاز فقط.": "Saved on this device only.",
    "اضغط على اسم أستاذ لترى المواد التي يدرّسها في هذا الكورس.": "Select a professor to see the subjects they teach this semester.",
    "ثلاث خطوات من فتح الموقع إلى قراءة المحاضرة.": "Three steps from opening the site to reading a lecture.",
    "اختر المادة": "Pick a subject",
    "ابحث بالاسم أو اسم الأستاذ، أو صفِّ القائمة حسب النوع. واضغط على النجمة لتثبيت موادك المفضلة.": "Search by name or professor, or filter by type. Tap the star to pin your favorite subjects.",
    "افتح المحاضرة": "Open the lecture",
    "داخل المادة تجد المحاضرات مرتبة بالرقم. اضغط على الملف ليفتح في نافذة داخل الصفحة.": "Inside a subject, lectures are listed by number. Tap a file to open it in a window on the page.",
    "علّمها كمقروءة": "Mark it as read", "علّم كمقروءة": "Mark as read",
    "بعد القراءة اضغط": "After reading, tap", "، فيزيد شريط تقدمك في المادة وتعرف أين وصلت.": ", and your progress bar for the subject grows so you know where you are.",
    "المفضلة والتقدم وتاريخ الامتحان محفوظة على هذا الجهاز وفي هذا المتصفح فقط، ولا تنتقل إلى جهاز آخر.": "Favorites, progress and exam date are saved on this device and browser only. They do not move to another device.",
    "آخر الملفات المضافة": "Recently added files",
    "أحدث ما رُفع إلى الموقع، ليصلك الجديد دون أن تفتح كل مادة.": "The newest uploads, so you see what is new without opening every subject.",
    "هل هذا موقع رسمي من الجامعة؟": "Is this an official university site?",
    "لا. هو موقع غير رسمي أعدّه طالب لتجميع المواد في مكان واحد، وسيبقى التنويه في أعلى الصفحة حتى تؤكد الجامعة الموقع رسمياً.": "No. It is an unofficial site made by a student to gather materials in one place. The notice stays at the top until the university confirms the site.",
    "من أين تأتي الملفات ومن يرفعها؟": "Where do the files come from, and who uploads them?",
    "تُجمع الملفات من قنوات تلغرام، ويرفعها مُعدّ الموقع ومساعدان من الجامعة.": "Files are collected from Telegram channels and uploaded by the site's maker and two university assistants.",
    "كيف أفتح الملف من الآيباد أو الهاتف؟": "How do I open a file on an iPad or phone?",
    "اضغط على اسم الملف داخل المحاضرة، فيفتح في نافذة داخل الصفحة. ومن أعلى النافذة يمكنك فتحه في تبويب مستقل أو تنزيله.": "Tap the file name inside the lecture and it opens in a window on the page. From the top of that window you can open it in its own tab or download it.",
    "هل أحتاج إلى حساب أو تسجيل دخول؟": "Do I need an account or to sign in?",
    "لا يوجد تسجيل دخول حالياً. قد يتغير هذا لاحقاً إذا تقرر تقييد الوصول.": "There is no sign-in for now. This may change later if access is restricted.",
    "أين تُحفظ مفضلتي وتقدمي؟": "Where are my favorites and progress saved?",
    "على هذا الجهاز وفي هذا المتصفح فقط. لو فتحت الموقع من جهاز آخر أو مسحت بيانات المتصفح فستبدأ من جديد.": "On this device and browser only. If you open the site on another device or clear browser data, you start over.",
    "جاهز للمذاكرة؟": "Ready to study?", "اختر أول مادة وافتح محاضرتها.": "Pick your first subject and open its lecture.",
    "روابط سريعة": "Quick links", "مواد الكورس الثالث": "Semester 3 subjects",
    "لم تفتح أي مادة بعد. اختر مادة من القائمة وابدأ.": "You have not opened a subject yet. Pick one from the list to begin.",
    "اذهب إلى المواد": "Go to subjects", "تابع المادة": "Continue subject",
    "يوم واحد": "1 day", "يومان": "2 days", "باقي": "Remaining",
    "حدد التاريخ لتعرف كم يوم بقي.": "Set a date to see how many days are left.",
    "مضى موعد الامتحان.": "The exam date has passed.", "الامتحان اليوم، بالتوفيق.": "The exam is today. Good luck.",
    "مسح": "Clear", "تم مسح تاريخ الامتحان": "Exam date cleared", "تم حفظ تاريخ الامتحان": "Exam date saved",
    "الدرجة": "Grade", "نظري": "theory", "عملي": "practical",
    "إزالة من المفضلة:": "Remove from favorites:", "إضافة إلى المفضلة:": "Add to favorites:",
    "أُضيفت المادة إلى المفضلة": "Subject added to favorites", "أُزيلت المادة من المفضلة": "Subject removed from favorites",
    "قريباً": "Soon", "مقروءة": "read", "المحاضرات المطابقة": "Matching lectures",
    "لم تضف مواد إلى المفضلة بعد": "No favorites yet", "اضغط على النجمة في أي مادة لتظهر هنا.": "Tap the star on any subject to show it here.",
    "لا توجد مادة بهذا الاسم": "No subject with that name", "جرّب اسم المادة بالإنجليزية، أو اسم الأستاذ، أو رمز المادة.": "Try the subject name, the professor's name, or the subject code.",
    "النتائج:": "Results:", "الكل": "All", "المواد التي يدرّسها": "Subjects taught by", "إلغاء": "Cancel",
    "لم تُرفع ملفات بعد": "No files uploaded yet", "ستظهر هنا أحدث الملفات فور رفعها.": "The newest files will appear here as soon as they are uploaded.",
    "، موقع غير رسمي من إعداد طالب.": ", unofficial site made by a student.",
    "المادة": "Subject", "كل المواد": "All subjects", "فتح في تبويب": "Open in a tab", "تنزيل": "Download", "إغلاق": "Close",
    "عارض الملف": "File viewer", "إن لم يظهر الملف هنا، افتحه في تبويب مستقل.": "If the file does not show here, open it in its own tab.",
    "لم نجد هذه المادة": "Subject not found", "الرابط غير صحيح أو أن المادة غير موجودة": "The link is wrong or the subject does not exist",
    "ارجع إلى كل المواد واختر المادة من القائمة.": "Go back to all subjects and pick one from the list.",
    "في المفضلة": "In favorites", "أضف إلى المفضلة": "Add to favorites", "شارك رابط المادة": "Share subject link",
    "تم نسخ رابط المادة": "Subject link copied", "انسخ الرابط من شريط العنوان": "Copy the link from the address bar",
    "رمز المادة": "Subject code", "درجة النظري": "Theory grade", "درجة العملي": "Practical grade", "الأستاذ": "Professor",
    "أنهيت كل محاضرات المادة": "You finished every lecture", "تقدمك محفوظ على هذا الجهاز": "Your progress is saved on this device",
    "المحاضرات": "Lectures", "لم تُرفع ملفات هذه المادة بعد": "No files for this subject yet", "ستظهر المحاضرات هنا فور رفعها.": "Lectures will appear here as soon as they are uploaded.",
    "النطق:": "Pronunciation:", "تمت القراءة": "Read", "تم تعليم المحاضرة كمقروءة": "Lecture marked as read", "أُزيل تعليم القراءة": "Read mark removed",
    "في قائمة المراجعة": "In review list", "أُضيفت المحاضرة إلى قائمة المراجعة": "Lecture added to review list", "أُزيلت من قائمة المراجعة": "Removed from review list",
    "فتح الملف": "Open file", "التنقل بين المواد": "Subject navigation", "المادة السابقة": "Previous subject", "المادة التالية": "Next subject",
    "التبديل إلى الوضع النهاري": "Switch to light mode", "التبديل إلى الوضع الليلي": "Switch to dark mode",
    "نظرة عامة على الجهاز المناعي": "Overview of the immune system",
    "المحاضرات التي علّمتها \"راجعها لاحقاً\". تُحفظ على هذا الجهاز فقط.": "Lectures you marked \"Review later\". Saved on this device only.",
    "بعد القراءة اضغط \"علّم كمقروءة\"، فيزيد شريط تقدمك في المادة وتعرف أين وصلت.": "After reading, tap \"Mark as read\" and the subject's progress bar grows, so you know where you are.",
    "جارٍ تحميل الملف…": "Loading file…",
    "الملف غير متاح حالياً": "This file is not available right now",
    "تعذّر تحميل بيانات المواد. حدّث الصفحة، وإن استمر الخطأ فأبلغ مُعدّ الموقع.": "Could not load the subject data. Refresh the page; if it keeps happening, tell the site's maker."
  };
  var FA = {
    "رحلتك في عالم الطب تبدأ من هنا": "سفر شما به دنیای پزشکی از اینجا آغاز می‌شود",
    "استكشف المواد الدراسية": "مرور دروس", "ابحث عن محاضرة": "جستجوی جلسه",
    "الوصول السريع": "دسترسی سریع", "المواد الدراسية": "دروس", "تصفح مواد الكورس الثالث": "مرور دروس ترم سوم",
    "المحاضرات": "جلسات", "آخر المحاضرات والملفات المضافة": "آخرین جلسات و فایل‌های افزوده‌شده",
    "بنك الأسئلة": "بانک سؤالات", "أسئلة اختيار من متعدد للتدرّب": "سؤالات چندگزینه‌ای برای تمرین",
    "التقويم الأكاديمي": "تقویم آموزشی", "مواعيد المحاضرات والامتحانات": "زمان کلاس‌ها و امتحان‌ها",
    "الأساتذة": "اساتید", "أساتذة مواد الكورس الثالث": "اساتید دروس ترم سوم",
    "عرض": "مشاهده", "قريباً": "به‌زودی",
    "ابدأ من هنا": "از اینجا شروع کنید", "أساسية": "پایه", "عامة": "عمومی", "مفضلة": "علاقه‌مندی", "ابدأ": "شروع",
    "مواد العلوم الطبية الأساسية ومحاضراتها.": "دروس علوم پایه پزشکی و جلسات آن‌ها.",
    "المواد العامة في الكورس.": "دروس عمومی این ترم.",
    "المواد التي أضفتها إلى المفضلة.": "درس‌هایی که به علاقه‌مندی‌ها افزوده‌اید.",
    "مواد الطلاب الدوليين": "منابع دانشجویان بین‌المللی",
    "مواد الطلاب": "منابع دانشجویان",
    "كل ملفات الكورس الثالث في مكان واحد. اختر المادة، ثم المحاضرة، وافتح الملف.": "همه فایل‌های ترم سوم در یک جا. درس را انتخاب کنید، سپس جلسه را، و فایل را باز کنید.",
    "ملفات الكورس الثالث في مكان واحد. موقع غير رسمي من إعداد طالب.": "فایل‌های ترم سوم در یک جا. سایتی غیررسمی که یک دانشجو ساخته است.",
    "موقع غير رسمي من إعداد طالب، ولا يمثل الجامعة. سيبقى هذا التنويه حتى تؤكد الجامعة الموقع رسمياً.": "این سایت غیررسمی را یک دانشجو ساخته و نماینده دانشگاه نیست. این اطلاعیه تا تأیید رسمی سایت از سوی دانشگاه باقی می‌ماند.",
    "جامعة بابل للعلوم الطبية": "دانشگاه علوم پزشکی بابل",
    "المدخل الرئيسي لجامعة بابل للعلوم الطبية": "ورودی اصلی دانشگاه علوم پزشکی بابل",
    "التنقل الرئيسي": "ناوبری اصلی",
    "الرئيسية": "خانه", "المواد": "دروس", "الأساتذة": "استادان", "كيف تبدأ": "شروع کار",
    "آخر الملفات": "آخرین فایل‌ها", "الأسئلة الشائعة": "پرسش‌های متداول", "القائمة": "منو",
    "بحث": "جستجو", "اللغة": "زبان", "تخطَّ إلى المحتوى": "رفتن به محتوا",
    "للطلاب الدوليين، الكورس الثالث": "برای دانشجویان بین‌المللی، ترم سوم",
    "تصفح المواد": "مشاهده دروس", "كيف أستخدم الموقع": "راهنمای استفاده",
    "اختصارات": "میانبرها",
    "العلوم الطبية الأساسية": "علوم پایه پزشکی", "المواد العامة": "دروس عمومی",
    "المفضلة": "علاقه‌مندی‌ها", "قائمة المراجعة": "فهرست مرور",
    "تابع من حيث توقفت": "ادامه از جایی که ماندید", "عدّاد الامتحان": "شمارش معکوس امتحان",
    "تاريخ الامتحان": "تاریخ امتحان", "ملخص المحتوى": "خلاصه محتوا",
    "مادة": "درس", "أستاذ": "استاد", "درجة الكورس كاملاً": "نمره کل ترم", "ملف PDF": "فایل PDF",
    "ابحث عن مادة أو أستاذ أو محاضرة": "جستجوی درس، استاد یا جلسه",
    "ابحث عن مادة أو أستاذ أو رمز": "جستجوی درس، استاد یا کد",
    "ترتيب المواد": "مرتب‌سازی دروس", "الترتيب": "ترتیب", "الاسم": "نام", "الرمز": "کد", "تصفية المواد": "فیلتر دروس",
    "المحاضرات التي علّمتها \"راجعها لاحقاً\". تُحفظ على هذا الجهاز فقط.": "جلسه‌هایی که «بعداً مرور کن» زده‌اید. فقط روی همین دستگاه ذخیره می‌شود.",
    "راجعها لاحقاً": "بعداً مرور کن",
    "اضغط على اسم أستاذ لترى المواد التي يدرّسها في هذا الكورس.": "روی نام یک استاد بزنید تا درس‌های او در این ترم را ببینید.",
    "ثلاث خطوات من فتح الموقع إلى قراءة المحاضرة.": "سه گام، از باز کردن سایت تا خواندن جلسه.",
    "اختر المادة": "درس را انتخاب کنید",
    "ابحث بالاسم أو اسم الأستاذ، أو صفِّ القائمة حسب النوع. واضغط على النجمة لتثبيت موادك المفضلة.": "با نام درس یا نام استاد جستجو کنید، یا فهرست را بر اساس نوع فیلتر کنید. با زدن ستاره، درس‌های مورد علاقه‌تان را نشان کنید.",
    "افتح المحاضرة": "جلسه را باز کنید",
    "داخل المادة تجد المحاضرات مرتبة بالرقم. اضغط على الملف ليفتح في نافذة داخل الصفحة.": "داخل هر درس، جلسه‌ها به ترتیب شماره آمده‌اند. روی فایل بزنید تا در پنجره‌ای داخل صفحه باز شود.",
    "علّمها كمقروءة": "علامت خوانده‌شده بزنید", "علّم كمقروءة": "علامت خوانده‌شده",
    "بعد القراءة اضغط \"علّم كمقروءة\"، فيزيد شريط تقدمك في المادة وتعرف أين وصلت.": "بعد از خواندن، «علامت خوانده‌شده» را بزنید تا نوار پیشرفت درس جلو برود و بدانید کجا هستید.",
    "المفضلة والتقدم وتاريخ الامتحان محفوظة على هذا الجهاز وفي هذا المتصفح فقط، ولا تنتقل إلى جهاز آخر.": "علاقه‌مندی‌ها، پیشرفت و تاریخ امتحان فقط روی همین دستگاه و همین مرورگر ذخیره می‌شوند و به دستگاه دیگری منتقل نمی‌شوند.",
    "آخر الملفات المضافة": "آخرین فایل‌های افزوده‌شده",
    "أحدث ما رُفع إلى الموقع، ليصلك الجديد دون أن تفتح كل مادة.": "تازه‌ترین بارگذاری‌ها، تا بدون باز کردن همه دروس از موارد جدید باخبر شوید.",
    "هل هذا موقع رسمي من الجامعة؟": "آیا این سایت رسمی دانشگاه است؟",
    "لا. هو موقع غير رسمي أعدّه طالب لتجميع المواد في مكان واحد، وسيبقى التنويه في أعلى الصفحة حتى تؤكد الجامعة الموقع رسمياً.": "خیر. این سایتی غیررسمی است که یک دانشجو برای جمع کردن منابع در یک جا ساخته است. اطلاعیه بالای صفحه تا تأیید رسمی دانشگاه باقی می‌ماند.",
    "من أين تأتي الملفات ومن يرفعها؟": "فایل‌ها از کجا می‌آیند و چه کسی آن‌ها را بارگذاری می‌کند؟",
    "تُجمع الملفات من قنوات تلغرام، ويرفعها مُعدّ الموقع ومساعدان من الجامعة.": "فایل‌ها از کانال‌های تلگرام جمع‌آوری می‌شوند و سازنده سایت و دو دستیار از دانشگاه آن‌ها را بارگذاری می‌کنند.",
    "كيف أفتح الملف من الآيباد أو الهاتف؟": "چطور فایل را در آیپد یا گوشی باز کنم؟",
    "اضغط على اسم الملف داخل المحاضرة، فيفتح في نافذة داخل الصفحة. ومن أعلى النافذة يمكنك فتحه في تبويب مستقل أو تنزيله.": "روی نام فایل داخل جلسه بزنید تا در پنجره‌ای داخل صفحه باز شود. از بالای پنجره می‌توانید آن را در زبانه‌ای جداگانه باز یا دانلود کنید.",
    "هل أحتاج إلى حساب أو تسجيل دخول؟": "آیا به حساب کاربری یا ورود نیاز دارم؟",
    "لا يوجد تسجيل دخول حالياً. قد يتغير هذا لاحقاً إذا تقرر تقييد الوصول.": "فعلاً ورودی وجود ندارد. اگر تصمیم به محدود کردن دسترسی گرفته شود، ممکن است بعداً تغییر کند.",
    "أين تُحفظ مفضلتي وتقدمي؟": "علاقه‌مندی‌ها و پیشرفت من کجا ذخیره می‌شود؟",
    "على هذا الجهاز وفي هذا المتصفح فقط. لو فتحت الموقع من جهاز آخر أو مسحت بيانات المتصفح فستبدأ من جديد.": "فقط روی همین دستگاه و همین مرورگر. اگر سایت را از دستگاه دیگری باز کنید یا داده‌های مرورگر را پاک کنید، از اول شروع می‌کنید.",
    "جاهز للمذاكرة؟": "آماده مطالعه‌اید؟", "اختر أول مادة وافتح محاضرتها.": "اولین درس را انتخاب کنید و جلسه‌اش را باز کنید.",
    "روابط سريعة": "پیوندهای سریع", "مواد الكورس الثالث": "دروس ترم سوم",
    "لم تفتح أي مادة بعد. اختر مادة من القائمة وابدأ.": "هنوز درسی باز نکرده‌اید. یک درس از فهرست انتخاب کنید و شروع کنید.",
    "اذهب إلى المواد": "رفتن به دروس", "تابع المادة": "ادامه درس",
    "يوم واحد": "1 روز", "يومان": "2 روز", "باقي": "باقی‌مانده:",
    "حدد التاريخ لتعرف كم يوم بقي.": "تاریخ را تعیین کنید تا ببینید چند روز مانده است.",
    "مضى موعد الامتحان.": "تاریخ امتحان گذشته است.", "الامتحان اليوم، بالتوفيق.": "امتحان امروز است. موفق باشید.",
    "مسح": "پاک کردن", "تم مسح تاريخ الامتحان": "تاریخ امتحان پاک شد", "تم حفظ تاريخ الامتحان": "تاریخ امتحان ذخیره شد",
    "الدرجة": "نمره", "نظري": "نظری", "عملي": "عملی",
    "إزالة من المفضلة:": "حذف از علاقه‌مندی‌ها:", "إضافة إلى المفضلة:": "افزودن به علاقه‌مندی‌ها:",
    "أُضيفت المادة إلى المفضلة": "درس به علاقه‌مندی‌ها اضافه شد", "أُزيلت المادة من المفضلة": "درس از علاقه‌مندی‌ها حذف شد",
    "قريباً": "به‌زودی", "مقروءة": "خوانده‌شده", "المحاضرات المطابقة": "جلسه‌های مطابق",
    "لم تضف مواد إلى المفضلة بعد": "هنوز درسی به علاقه‌مندی‌ها اضافه نکرده‌اید", "اضغط على النجمة في أي مادة لتظهر هنا.": "روی ستاره هر درس بزنید تا اینجا نمایش داده شود.",
    "لا توجد مادة بهذا الاسم": "درسی با این نام پیدا نشد", "جرّب اسم المادة بالإنجليزية، أو اسم الأستاذ، أو رمز المادة.": "نام انگلیسی درس، نام استاد یا کد درس را امتحان کنید.",
    "النتائج:": "نتایج:", "الكل": "همه", "المواد التي يدرّسها": "دروس استاد", "إلغاء": "لغو",
    "لم تُرفع ملفات بعد": "هنوز فایلی بارگذاری نشده است", "ستظهر هنا أحدث الملفات فور رفعها.": "تازه‌ترین فایل‌ها پس از بارگذاری اینجا نمایش داده می‌شوند.",
    "، موقع غير رسمي من إعداد طالب.": "، سایت غیررسمی ساخته یک دانشجو.",
    "المادة": "درس", "كل المواد": "همه دروس", "فتح في تبويب": "باز کردن در زبانه", "تنزيل": "دانلود", "إغلاق": "بستن",
    "عارض الملف": "نمایشگر فایل", "إن لم يظهر الملف هنا، افتحه في تبويب مستقل.": "اگر فایل اینجا نمایش داده نشد، آن را در زبانه‌ای جداگانه باز کنید.",
    "لم نجد هذه المادة": "این درس پیدا نشد", "الرابط غير صحيح أو أن المادة غير موجودة": "پیوند نادرست است یا این درس وجود ندارد",
    "ارجع إلى كل المواد واختر المادة من القائمة.": "به همه دروس برگردید و درسی را از فهرست انتخاب کنید.",
    "في المفضلة": "در علاقه‌مندی‌ها", "أضف إلى المفضلة": "افزودن به علاقه‌مندی‌ها", "شارك رابط المادة": "اشتراک پیوند درس",
    "تم نسخ رابط المادة": "پیوند درس کپی شد", "انسخ الرابط من شريط العنوان": "پیوند را از نوار نشانی کپی کنید",
    "رمز المادة": "کد درس", "درجة النظري": "نمره نظری", "درجة العملي": "نمره عملی", "الأستاذ": "استاد",
    "أنهيت كل محاضرات المادة": "همه جلسه‌های این درس را تمام کردید", "تقدمك محفوظ على هذا الجهاز": "پیشرفت شما روی همین دستگاه ذخیره شده است",
    "المحاضرات": "جلسه‌ها", "لم تُرفع ملفات هذه المادة بعد": "هنوز فایلی برای این درس بارگذاری نشده است", "ستظهر المحاضرات هنا فور رفعها.": "جلسه‌ها پس از بارگذاری اینجا نمایش داده می‌شوند.",
    "النطق:": "تلفظ:", "تمت القراءة": "خوانده شد", "تم تعليم المحاضرة كمقروءة": "جلسه خوانده‌شده علامت خورد", "أُزيل تعليم القراءة": "علامت خواندن برداشته شد",
    "في قائمة المراجعة": "در فهرست مرور", "أُضيفت المحاضرة إلى قائمة المراجعة": "جلسه به فهرست مرور اضافه شد", "أُزيلت من قائمة المراجعة": "از فهرست مرور حذف شد",
    "فتح الملف": "باز کردن فایل", "التنقل بين المواد": "پیمایش بین دروس", "المادة السابقة": "درس قبلی", "المادة التالية": "درس بعدی",
    "التبديل إلى الوضع النهاري": "رفتن به حالت روشن", "التبديل إلى الوضع الليلي": "رفتن به حالت تاریک",
    "نظرة عامة على الجهاز المناعي": "مروری بر دستگاه ایمنی",
    "الكورس الثالث": "ترم سوم",
    "جارٍ تحميل الملف…": "در حال بارگذاری فایل…",
    "الملف غير متاح حالياً": "این فایل در حال حاضر در دسترس نیست",
    "تعذّر تحميل بيانات المواد. حدّث الصفحة، وإن استمر الخطأ فأبلغ مُعدّ الموقع.": "بارگذاری داده‌های دروس ممکن نشد. صفحه را تازه کنید و اگر خطا ادامه داشت، به سازنده سایت اطلاع دهید."
  };

  var D = lang === "en" ? EN : lang === "fa" ? FA : {};

  // أسماء المواد والأقسام من البيانات نفسها. في الفارسية تُستخدم nameFa إن وُجد، وإلا الاسم الإنجليزي
  try {
    COURSES.forEach(function (c) {
      if (!c.nameAr) return;
      if (lang === "en") D[c.nameAr] = c.name;
      if (lang === "fa") D[c.nameAr] = c.nameFa || c.name;
    });
    if (lang === "en") {
      CATEGORIES.forEach(function (c) { if (c.nameEn) D[c.name] = c.nameEn; });
      SEMESTERS.forEach(function (s) { if (s.nameEn) D[s.name] = s.nameEn; });
    }
  } catch (e) {}

  var KEYS = Object.keys(D).sort(function (a, b) { return b.length - a.length; });
  var AR = /[\u0600-\u06FF]/;
  function faLetters(t) { return t.replace(/ي/g, "ی").replace(/ك/g, "ک"); }

  function n(x, one, many) { return x + " " + (+x === 1 ? one : many); }
  var W = lang === "fa"
    ? { subj: ["درس", "درس"], lec: ["جلسه", "جلسه"], file: ["فایل", "فایل"], day: ["روز", "روز"],
        of: " از ", read: " خوانده‌شده", sep: "، ", grade: "نمره", th: "نظری", pr: "عملی", results: "نتایج: ",
        readOf: function (a, b, c) { return a + " از " + b + " را خوانده‌اید" + (c ? "، " + c : ""); } }
    : { subj: ["subject", "subjects"], lec: ["lecture", "lectures"], file: ["file", "files"], day: ["day", "days"],
        of: " of ", read: " read", sep: ", ", grade: "Grade", th: "theory", pr: "practical", results: "Results: ",
        readOf: function (a, b, c) { return "Read " + a + " of " + b + (c ? ", " + c : ""); } };
  var RX = [
    [/^مادة واحدة$/, function () { return n(1, W.subj[0], W.subj[1]); }],
    [/^مادتان$/, function () { return n(2, W.subj[0], W.subj[1]); }],
    [/^(\d+) (?:مواد|مادة)$/, function (m) { return n(m[1], W.subj[0], W.subj[1]); }],
    [/^محاضرة واحدة$/, function () { return n(1, W.lec[0], W.lec[1]); }],
    [/^محاضرت(?:ان|ين)$/, function () { return n(2, W.lec[0], W.lec[1]); }],
    [/^(\d+) (?:محاضرات|محاضرة)$/, function (m) { return n(m[1], W.lec[0], W.lec[1]); }],
    [/^ملف واحد$/, function () { return n(1, W.file[0], W.file[1]); }],
    [/^ملفان$/, function () { return n(2, W.file[0], W.file[1]); }],
    [/^(\d+) (?:ملفات|ملفاً)$/, function (m) { return n(m[1], W.file[0], W.file[1]); }],
    [/^(\d+) (?:أيام|يوماً)$/, function (m) { return n(m[1], W.day[0], W.day[1]); }],
    [/^(\d+) من (\d+) مقروءة$/, function (m) { return m[1] + W.of + m[2] + W.read; }],
    [/^قرأت (\d+) من (.+?)(?:، (.+))?$/, function (m) { return W.readOf(m[1], tr(m[2]), m[3] ? tr(m[3]) : ""); }],
    [/^الدرجة ([\d.]+) \(نظري ([\d.]+)، عملي ([\d.]+)\)$/, function (m) { return W.grade + " " + m[1] + " (" + W.th + " " + m[2] + W.sep + W.pr + " " + m[3] + ")"; }],
    [/^الدرجة ([\d.]+)$/, function (m) { return W.grade + " " + m[1]; }],
    [/^النتائج: (.+)$/, function (m) { return W.results + m[1].split("، ").map(tr).join(W.sep); }],
    [/^النطق: (.+)$/, function (m) { return (lang === "fa" ? "تلفظ: " + faLetters(m[1]) : "Pronunciation: " + m[1]); }],
    [/^(.+) \| مواد الطلاب الدوليين$/, function (m) { return tr(m[1]) + " | " + D["مواد الطلاب الدوليين"]; }]
  ];

  function tr(str) {
    if (lang === "ar" || !str || !AR.test(str)) return str;
    var lead = str.match(/^\s*/)[0], tail = str.match(/\s*$/)[0], core = str.trim();
    var out = D[core];
    if (out === undefined) {
      for (var i = 0; i < RX.length; i++) {
        var m = core.match(RX[i][0]);
        if (m) { out = RX[i][1](m); break; }
      }
    }
    if (out === undefined) {
      out = core;
      KEYS.forEach(function (k) { if (out.indexOf(k) !== -1) out = out.split(k).join(D[k]); });
      if (lang === "en") out = out.replace(/،/g, ",").replace(/؟/g, "?");
      else out = faLetters(out);
    }
    return lead + out + tail;
  }

  // يُحفظ ما تُرجم حتى لا يُترجم مرة ثانية (مهم للفارسية لأنها بنفس الحروف)
  var done = typeof WeakMap === "function" ? new WeakMap() : null;
  var ATTRS = ["aria-label", "placeholder", "title", "alt"];
  function node(x) {
    if (x.nodeType === 3) {
      var p = x.parentNode;
      if (!p || p.nodeName === "SCRIPT" || p.nodeName === "STYLE" || (p.closest && p.closest("[data-i18n-skip]"))) return;
      if (done && done.get(x) === x.nodeValue) return;
      if (AR.test(x.nodeValue)) { var v = tr(x.nodeValue); if (v !== x.nodeValue) x.nodeValue = v; }
      if (done) done.set(x, x.nodeValue);
    } else if (x.nodeType === 1) {
      if (x.hasAttribute("data-i18n-skip")) return;
      ATTRS.forEach(function (a) {
        if (!x.hasAttribute(a)) return;
        var v = x.getAttribute(a), key = "i18n" + a;
        if (x[key] === v) return;
        if (AR.test(v)) { v = tr(v); x.setAttribute(a, v); }
        x[key] = v;
      });
      for (var c = x.firstChild; c; c = c.nextSibling) node(c);
    }
  }

  I18N.t = tr;
  I18N.set = function (l) {
    if (!LANGS[l]) return;
    try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {}
    location.reload();
  };
  I18N.apply = function () {
    var root = document.documentElement;
    root.lang = lang;
    root.dir = LANGS[lang];
    if (lang === "ar") return;
    node(document.body);
    document.title = tr(document.title);
    var md = document.querySelector('meta[name="description"]');
    if (md) md.content = tr(md.content);
    if (window.MutationObserver) {
      new MutationObserver(function (list) {
        list.forEach(function (r) {
          if (r.type === "characterData") node(r.target);
          else r.addedNodes.forEach(node);
        });
        document.title = tr(document.title);
      }).observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  };
})();
