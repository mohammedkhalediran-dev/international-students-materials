# python3 -I tests/step40_backup_browser.py — unified backup in headless Chromium (simulated server, no real device).
# Export from the PDF reader, wipe this document's study keys, import the file back, and compare bytes.
import subprocess, time, os, sys, json, urllib.parse
from playwright.sync_api import sync_playwright
# Since Step 45 the service worker fetches the pinned CDN files itself; let routing see those requests (Chromium).
os.environ.setdefault('PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS', '1')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CDN = os.environ.get('MEDIXA_CDN_DIR')
PORT = 8781; BASE = f'http://localhost:{PORT}/'
srv = subprocess.Popen(['node', '--no-warnings', os.path.join(ROOT, 'tests', 'dev_server.mjs'), str(PORT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.5)
fails = []; n = 0
def chk(c, m):
    global n; n += 1
    if not c: fails.append(m); print('FAIL', m)
PDF = 'files/المناعة-الطبية/المحاضرة-1-Overview-of-the-Immune-System.pdf'
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); ctx = b.new_context(accept_downloads=True)
        ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        if CDN:
            files = {'pdf.min.js': 'pdfjs-dist-3.11.174/package/build/pdf.min.js', 'pdf.worker.min.js': 'pdfjs-dist-3.11.174/package/build/pdf.worker.min.js', 'pdf-lib.min.js': 'pdf-lib-1.17.1/package/dist/pdf-lib.min.js'}
            ctx.route('**/cdnjs.cloudflare.com/**', lambda r: r.fulfill(path=os.path.join(CDN, files[r.request.url.split('/')[-1].split('?')[0]]), content_type='application/javascript') if r.request.url.split('/')[-1].split('?')[0] in files else r.abort())
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('dialog', lambda d: d.accept())
        url = BASE + 'pdf-notes.html?file=' + urllib.parse.quote(PDF)
        pg.goto(url); pg.wait_for_timeout(2500)
        keys = pg.evaluate("() => MedixaBackup.keysFor(location).list.map(x => x.key)")
        chk(len(keys) == 11, f'11 study keys covered (got {len(keys)})')
        seed = {}
        for k in keys:
            seed[k] = json.dumps([{'page': 1, 'tool': 'pen', 'points': [[1, 2], [3, 4]]}], separators=(',', ':')) if 'annotations' in k else json.dumps({'k': k[-12:]})
        pg.evaluate("s => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); localStorage.setItem('medixa.study.v1:other', 'OTHER'); }", seed)
        pg.click('#mx87-backup')  # real click: since Step 41 nothing covers the button
        with pg.expect_download() as dl:
            pg.click('#mx87-export')
        path = dl.value.path(); data = json.load(open(path, encoding='utf-8'))
        chk(data['format'] == 'medixa-local-backup-v40' and len(data['entries']) == 11, 'export file has 11 entries')
        pg.evaluate("ks => ks.forEach(k => localStorage.removeItem(k))", keys)
        pg.set_input_files('#mx87-import', path); pg.wait_for_timeout(800)
        chk('اكتمل' in pg.inner_text('#mx87-status'), 'import reports success: ' + pg.inner_text('#mx87-status'))
        got = pg.evaluate("ks => Object.fromEntries(ks.map(k => [k, localStorage.getItem(k)]))", keys)
        chk(got == seed, 'all 11 keys restored byte-identical ' + str({k: (seed[k], got[k]) for k in seed if seed[k] != got[k]}))
        chk(pg.evaluate("localStorage.getItem('medixa.study.v1:other')") == 'OTHER', 'other document untouched')
        chk(not errs, f'no JS errors {errs[:2]}')
        b.close()
finally:
    srv.terminate()
print('STEP40 BACKUP BROWSER FAILED' if fails else f'STEP40 BACKUP BROWSER OK: {n} checks')
sys.exit(1 if fails else 0)
