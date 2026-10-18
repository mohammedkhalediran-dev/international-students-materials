// Step 46: sentence splitting and cloze for site/js/study-text-cards-v92.js (pure functions, Node VM).
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../site/js/study-text-cards-v92.js'), 'utf8'),
  {window, document: {getElementById: () => null, createElement: () => ({}), head: {appendChild() {}}}, location: {search: '', href: 'https://x.test/'}, URLSearchParams, URL, String, Number, Math});
const T = window.MedixaTextCards;
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

const en = 'The innate immune system responds within hours. Adaptive immunity takes days to develop! Is immune memory antigen specific? Yes.';
const s1 = T.sentences(en);
ok(s1.length === 3, 'English: 3 sentences of 20+ chars (short "Yes." dropped): ' + JSON.stringify(s1));
ok(s1[0] === 'The innate immune system responds within hours.', 'keeps the full stop');
const ar = 'الجهاز المناعي الفطري يستجيب خلال ساعات. هل المناعة المكتسبة نوعية للمستضد؟ نعم؛ وتحتاج أياماً حتى تتكون بشكل كامل.';
const s2 = T.sentences(ar);
ok(s2.length === 3 || s2.length === 2, 'Arabic punctuation . ؟ ؛ splits: ' + JSON.stringify(s2));
ok(s2.some(x => x.endsWith('؟')), 'Arabic question mark kept');
ok(T.sentences('Line one of the slide here\nLine two of the same slide here').length === 2, 'pdf.js line ends split sentences');
ok(T.sentences('Same sentence repeated twice here. Same sentence repeated twice here.').length === 1, 'duplicates removed');
ok(T.sentences('x'.repeat(301)).length === 0, 'overlong text skipped');
ok(T.sentences(Array.from({length: 100}, (_, i) => 'Sentence number ' + i + ' is long enough.').join(' ')).length === 60, 'capped at 60');
ok(T.sentences(null).length === 0 && T.sentences('').length === 0, 'empty input');
const c = T.cloze('Neutrophils are the first responders in inflammation.');
ok(c && c.answer === 'inflammation' && c.question.includes('_____') && !c.question.includes('inflammation'), 'cloze hides the longest word');
const c2 = T.cloze('الخلايا البلعمية تبتلع الميكروبات بسرعة كبيرة.');
ok(c2 && c2.answer.length >= 5 && c2.question.includes('_____'), 'cloze works for Arabic');
ok(T.cloze('a an to of it is') === null, 'no cloze without a 5+ letter word');
ok(T.itemsToText([{str: 'Hello', hasEOL: false}, {str: 'world', hasEOL: true}, {str: 'next'}]) === 'Hello world\nnext ', 'pdf.js items to text');
console.log(`PASS: ${n} text-to-card checks (sentences, cloze, pdf.js items)`);
