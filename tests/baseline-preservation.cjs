const fs = require('node:fs'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const hashes = require('./baseline-content-sha256.json');
// Deliberate, documented edits since Step 32. Each entry pins the exact new content, so any other change still fails.
const intentional = require('./baseline-intentional-changes.json');
let same = 0;
for (const [file, hash] of Object.entries(hashes)) {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (intentional[file]) { assert.equal(actual, intentional[file].sha256, file + ' differs from its documented Step ' + intentional[file].step + ' change'); continue; }
  assert.equal(actual, hash, file + ' differs from Step 32');
  same++;
}
console.log(`PASS: ${same} educational, PDF, image and server files byte-identical to Step 32; ${Object.keys(intentional).length} documented intentional change(s) pinned`);
