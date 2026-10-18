// node tests/upload_names_check.js — فحص اقتراح الأسماء من اسم الملف (site/js/upload-names.js)
const U = require("../site/js/upload-names.js");

let passes = 0;
const fails = [];
const chk = (c, m) => { if (c) passes++; else { fails.push(m); console.log("FAIL", m); } };
const same = (a, b, m) => chk(JSON.stringify(a) === JSON.stringify(b), m + " — المتوقع " + JSON.stringify(b) + " والناتج " + JSON.stringify(a));

same(U.suggest("Lecture 3 - Renal Blood Flow.pdf"), { type: "lecture", number: 3, title: "Renal Blood Flow", label: "Slides" }, "محاضرة برقم وعنوان");
same(U.suggest("L02_innate_immunity_slides.pdf"), { type: "lecture", number: 2, title: "Innate Immunity", label: "Slides" }, "رمز L02 وشرطات سفلية وحروف صغيرة");
same(U.suggest("03 Renal Physiology.pdf"), { type: "lecture", number: 3, title: "Renal Physiology", label: "Slides" }, "رقم في أول الاسم");
same(U.suggest("المحاضرة-1-Guyton-Chapter-26.pdf"), { type: "lecture", number: 1, title: "Guyton Chapter 26", label: "Guyton & Hall, Chapter 26" }, "كتاب مع رقم الفصل");
same(U.suggest("Chapter 26.pdf").number, null, "رقم الفصل ليس رقم محاضرة");
same(U.suggest("Chapter 26.pdf").label, "Chapter 26", "اسم ظاهر للفصل");
same(U.suggest("Past Questions 2025.pdf"), { type: "exam", number: null, title: "Past Questions 2025", label: "Past questions 2025" }, "أسئلة سنوات سابقة بلا رقم");
same(U.suggest("midterm exam.pdf").type, "exam", "امتحان نصفي");
same(U.suggest("Lecture 4 exam questions.pdf").type, "lecture", "وجود رقم محاضرة يبقيه محاضرة");
same(U.suggest("Kidney-Slides.pdf"), { type: "lecture", number: null, title: "Kidney", label: "Slides" }, "بلا رقم: العنوان بلا كلمة Slides");
same(U.suggest("Lecture 12.pdf").title, "", "اسم ملف بلا عنوان يعطي عنواناً فارغاً");
same(U.suggest("Lec7 Hormones summary.pdf"), { type: "lecture", number: 7, title: "Hormones", label: "Summary" }, "ملخص");
same(U.suggest("Lecture 5 handout.pdf").label, "Handout", "ورقة عمل");
same(U.suggest("week_2_Lecture_notes.pdf").label, "Lecture notes", "ملاحظات");
same(U.suggest("Cell 3 Biology.pdf").number, null, "Cell 3 لا يُقرأ كمحاضرة (L ضمن كلمة)");
same(U.suggest("Lung 5.pdf").number, null, "Lung 5 لا يُقرأ كمحاضرة (L ضمن كلمة)");
same(U.lectureNumber("lecture_015.pdf").number, 15, "أصفار في البداية");
same(U.lectureNumber("Lecture 1000.pdf"), null, "رقم أكبر من 999");
same(U.uniqueLabel("Slides", []), "Slides", "اسم غير مكرر");
same(U.uniqueLabel("Slides", ["slides"]), "Slides 2", "اسم مكرر يضاف له رقم");
same(U.uniqueLabel("Slides", ["Slides", "Slides 2"]), "Slides 3", "تكرار مرتين");
same(U.gaps([1, 2, 4, 7]), [3, 5, 6], "الأرقام الناقصة");
same(U.gaps([]), [], "لا محاضرات لا فجوات");
same(U.gaps([1, 2, 3]), [], "بلا فجوات");

console.log(fails.length ? `${passes} passed, ${fails.length} failed` : `names OK: ${passes} checks`);
process.exit(fails.length ? 1 : 0);
