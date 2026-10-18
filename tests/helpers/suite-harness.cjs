// Executes the shipped browser script with minimal DOM and fault-injectable storage.
// This fixture tests event-handler behavior, not browser layout or native DOM fidelity.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../../site/js/study-suite-v85.js'), 'utf8');
function suiteHarness({initial = {}, fault, confirmed = true, pageCount = 3} = {}) {
  const values = new Map(Object.entries(initial));
  const calls = [], alerts = [], confirmations = [], nodes = new Map(), windowEvents = {};
  let storageFault = fault;
  const storage = {};
  for (const op of ['getItem', 'setItem', 'removeItem']) storage[op] = (key, value) => {
    const call = {op, key, value}; calls.push(call);
    const action = storageFault?.(call, calls, values);
    if (action === 'throw') { const e = Error('simulated storage failure'); e.name = op === 'getItem' ? 'SecurityError' : 'QuotaExceededError'; throw e; }
    if (action === 'ignore') return op === 'getItem' ? null : undefined;
    if (op === 'getItem') return values.has(key) ? values.get(key) : null;
    if (op === 'setItem') values.set(key, String(value));
    else values.delete(key);
  };
  class Element {
    constructor(tag = 'div', id = '') {
      this.tagName = tag.toUpperCase(); this.id = id; this.value = ''; this.dataset = {};
      this.textContent = ''; this.hidden = false; this.listeners = {}; this.children = []; this.style = {};
      this.attrs = {}; this.classes = new Set();
      this.classList = {add: x => this.classes.add(x), remove: x => this.classes.delete(x),
        contains: x => this.classes.has(x), toggle: (x, on) => { const yes = on ?? !this.classes.has(x); yes ? this.classes.add(x) : this.classes.delete(x); return yes; }};
      if (id) nodes.set(id, this);
    }
    setAttribute(k, v) { this.attrs[k] = v; }
    hasAttribute(k) { return Object.hasOwn(this.attrs, k) || (k.startsWith('data-') && Object.hasOwn(this.dataset, k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()))); }
    appendChild(n) { this.children.push(n); if (n.id) nodes.set(n.id, n); return n; }
    append(...ns) { ns.forEach(n => this.appendChild(n)); }
    set innerHTML(html) {
      this.html = html;
      for (const match of html.matchAll(/<(input|textarea|span|div|button|nav|select|p)\b([^>]*)>/g)) {
        const [, tag, attrs] = match, id = attrs.match(/\bid="([^"]+)"/);
        if (!id) continue;
        const n = new Element(tag, id[1]);
        n.value = attrs.match(/\bvalue="([^"]*)"/)?.[1] || '';
        if (tag === 'textarea') n.value = html.slice(match.index + match[0].length).split('</textarea>')[0];
        this.children.push(n);
      }
    }
    get innerHTML() { return this.html || ''; }
    querySelector(s) {
      if (s.startsWith('#')) return nodes.get(s.slice(1));
      const m = s.match(/^\[data-iqinput="(\d+)"\]$/);
      return m ? nodes.get('answer-input-' + m[1]) : null;
    }
    querySelectorAll() { return []; }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    async dispatch(type, target, extras = {}) {
      const e = {target, ...extras};
      if (this['on' + type]) await this['on' + type](e);
      for (const fn of this.listeners[type] || []) await fn(e);
    }
    closest(selector) { return selector === 'button' && this.tagName === 'BUTTON' || selector === '[data-view]' && this.dataset.view ? this : null; }
    replaceChildren(...children) { this.children = children; this.options = children; }
    add(option) { this.options.push(option); }
    click() { return this.onclick?.({target: this}); }
  }
  const body = new Element('body'), header = new Element('header'), root = new Element('main', 'pages');
  const pageNodes = Array.from({length: pageCount}, () => ({scrollIntoView() {}}));
  root.querySelectorAll = () => pageNodes;
  const document = {readyState: 'complete', body, getElementById: id => nodes.get(id),
    querySelector: s => s === 'header' ? header : null, createElement: tag => new Element(tag)};
  const window = {addEventListener(type, fn) { (windowEvents[type] ||= []).push(fn); }};
  const context = {document, window, location: {href: 'https://example.test/pdf-notes.html?file=lecture.pdf', search: '?file=lecture.pdf', pathname: '/pdf-notes.html'},
    localStorage: storage, URL, URLSearchParams, Blob, Date, crypto: {randomUUID: () => 'test-card'},
    Option: class { constructor(label, value) {this.label = label; this.value = value;} },
    alert: message => alerts.push(String(message)), confirm: message => { confirmations.push(message); return confirmed; }, setTimeout() {}, console};
  vm.runInNewContext(source, context, {filename: 'study-suite-v85.js'});
  const content = nodes.get('suite-content');
  return {values, calls, alerts, confirmations, storage, nodes, context, windowEvents,
    setFault(fn) { storageFault = fn; },
    async import(data, {size, raw} = {}) { const text = raw ?? JSON.stringify(data); await content.dispatch('change', {id: 'suite-import', value: 'selected.json', files: [{size: size ?? Buffer.byteLength(text), text: async () => text}]}); },
    async view(name) { const b = new Element('button'); b.dataset.view = name; await nodes.get('suite-nav').dispatch('click', b); },
    async note(text, page = 1) { if (!nodes.has('suite-note')) await this.view('split'); nodes.get('suite-page').value = String(page); nodes.get('suite-note').value = text; await content.dispatch('input', nodes.get('suite-note')); },
    async input(id, value) { nodes.get(id).value = value; await content.dispatch('input', nodes.get(id)); },
    async click(id, dataset = {}) { const b = nodes.get(id) || new Element('button', id); b.dataset = dataset; await content.dispatch('click', b); },
    status() { return nodes.get('suite-save-status')?.textContent || ''; },
    snapshot() { return Object.fromEntries(values); }
  };
}
module.exports = {suiteHarness};
