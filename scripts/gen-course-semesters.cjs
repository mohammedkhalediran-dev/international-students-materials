// node scripts/gen-course-semesters.cjs — يولّد functions/_lib/course-semesters.js من site/data/courses.js
// (الخادم يحتاج كورس كل مادة واسمها ليرسل إشعار المحاضرة لطلاب الكورس نفسه فقط). يفحصه tests/push_check.mjs.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const ctx = {}; vm.runInNewContext(fs.readFileSync(path.join(root, 'site/data/courses.js'), 'utf8') + '\n;this.C = COURSES;', ctx);
const map = {}; for (const c of ctx.C) map[c.id] = { semester: c.semester, name: c.nameAr || c.name };
const out = '// مولَّد تلقائياً من site/data/courses.js بواسطة scripts/gen-course-semesters.cjs — لا تعدّله يدوياً.\nexport const COURSE_SEMESTERS = ' + JSON.stringify(map, null, 1) + ';\n';
fs.writeFileSync(path.join(root, 'functions/_lib/course-semesters.js'), out);
console.log('course-semesters.js:', Object.keys(map).length, 'courses');
