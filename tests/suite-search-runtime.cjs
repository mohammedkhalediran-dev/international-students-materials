const {test} = require('node:test');
const assert = require('node:assert/strict');
const {suiteHarness} = require('./helpers/suite-harness.cjs');
function deferred() {let resolve, reject; const promise = new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function documentStub({text = 'kidney physiology', fail = false, pending} = {}) {
 const doc = {numPages: 1, destroyed: 0, calls: 0, async getPage() {doc.calls++; return {async getTextContent() {if(pending)await pending.promise;if(fail)throw Error('text extraction failed');return {items:[{str:text}]};}};}, async destroy(){doc.destroyed++;}}; return doc;
}
async function searchHarness(documents) {
 const h = suiteHarness(); let next = 0;
 const lib = {getDocument(){const doc=documents[next++]; return {promise: doc?.promise || Promise.resolve(doc)};}};
 h.context.window.pdfjsLib = lib; h.context.pdfjsLib = lib;
 await h.view('search'); h.nodes.get('suite-query').value = 'kidney'; return h;
}
test('successful PDF search renders escaped excerpts and releases PDF', async () => {
 const doc=documentStub({text:'kidney <script>alert(1)</script>'}),h=await searchHarness([doc]); await h.click('suite-search');
 assert.match(h.nodes.get('suite-results').innerHTML,/&lt;script&gt;/); assert.match(h.nodes.get('suite-results').innerHTML,/data-resultpage="1"/); assert.equal(doc.destroyed,1);
});
test('text extraction failure reports an error and releases PDF resources', async () => {
 const doc=documentStub({fail:true}),h=await searchHarness([doc]);await h.click('suite-search');
 assert.match(h.nodes.get('suite-results').textContent,/تعذر البحث/);assert.equal(doc.destroyed,1);
});
test('a slower old search cannot replace a newer search result', async () => {
 const gate=deferred(),old=documentStub({text:'kidney old',pending:gate}),fresh=documentStub({text:'kidney fresh'}),h=await searchHarness([old,fresh]);
 const first=h.click('suite-search');await Promise.resolve();await Promise.resolve();await h.click('suite-search');gate.resolve();await first;
 assert.match(h.nodes.get('suite-results').innerHTML,/fresh/);assert.doesNotMatch(h.nodes.get('suite-results').innerHTML,/old/);assert.equal(old.destroyed,1);assert.equal(fresh.destroyed,1);
});
test('changing tabs cancels stale output and releases the search document', async () => {
 const gate=deferred(),doc=documentStub({pending:gate}),h=await searchHarness([doc]),out=h.nodes.get('suite-results');
 const pending=h.click('suite-search');await Promise.resolve();await Promise.resolve();await h.view('dashboard');gate.resolve();await pending;
 assert.equal(out.innerHTML,'');assert.equal(doc.destroyed,1);
});
test('explicit cancellation prevents results and cleans up exactly once', async () => {
 const gate=deferred(),doc=documentStub({pending:gate}),h=await searchHarness([doc]);
 const pending=h.click('suite-search');await Promise.resolve();await Promise.resolve();await h.click('suite-cancel-search');gate.resolve();await pending;
 assert.match(h.nodes.get('suite-results').textContent,/إلغاء/);assert.equal(h.nodes.get('suite-results').innerHTML,'');assert.equal(doc.destroyed,1);
});
test('cancelled loading job is discarded and cleaned up when loading finishes', async () => {
 const loading=deferred(),doc=documentStub(),h=await searchHarness([loading]);
 const pending=h.click('suite-search');await h.click('suite-cancel-search');loading.resolve(doc);await pending;
 assert.equal(doc.calls,0);assert.equal(doc.destroyed,1);assert.equal(h.nodes.get('suite-results').innerHTML,'');
});
test('Escape cancels search without affecting unrelated stored data', async () => {
 const gate=deferred(),doc=documentStub({pending:gate}),h=await searchHarness([doc]);h.values.set('ms.study','keep');
 const pending=h.click('suite-search');await Promise.resolve();await Promise.resolve();
 for(const fn of h.windowEvents.keydown||[])fn({key:'Escape'});gate.resolve();await pending;
 assert.equal(h.nodes.get('suite-results').innerHTML,'');assert.equal(doc.destroyed,1);assert.equal(h.values.get('ms.study'),'keep');
});
