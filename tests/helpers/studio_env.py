# Shared harness for Study Studio browser tests (Playwright + dev_server + synthetic PDFs). Run tests with python3 -I.
import os, sys, subprocess, time, json, urllib.parse, tempfile
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
CDN = os.environ.get('MEDIXA_CDN_DIR')
if not CDN: sys.exit('set MEDIXA_CDN_DIR to a folder holding pdfjs-dist-3.11.174/ and pdf-lib-1.17.1/ (npm pack)')
FILES = {'pdf.min.js': 'pdfjs-dist-3.11.174/package/build/pdf.min.js', 'pdf.worker.min.js': 'pdfjs-dist-3.11.174/package/build/pdf.worker.min.js', 'pdf-lib.min.js': 'pdf-lib-1.17.1/package/dist/pdf-lib.min.js'}
FX = tempfile.mkdtemp(prefix='studio-fx-')
subprocess.run(['node', os.path.join(ROOT, 'tests', 'helpers', 'make_studio_pdfs.cjs'), FX, os.path.join(CDN, FILES['pdf-lib.min.js'])], check=True, stdout=subprocess.DEVNULL)
def start_server(port):
    srv = subprocess.Popen(['node', '--no-warnings', os.path.join(ROOT, 'tests', 'dev_server.mjs'), str(port)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.5); return srv
def reader(base, f): return base + 'pdf-notes.html?file=' + urllib.parse.quote(f, safe='')
def new_context(browser, fixtures, **kw):
    ctx = browser.new_context(**kw)
    ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    def cdn(r):
        n = r.request.url.split('/')[-1].split('?')[0]
        if n in FILES: r.fulfill(path=os.path.join(CDN, FILES[n]), content_type='application/javascript')
        else: r.abort()
    ctx.route('**/cdnjs.cloudflare.com/**', cdn)
    def serve(name): return lambda r: r.fulfill(path=os.path.join(FX, name), content_type='application/pdf')
    for url, name in fixtures.items(): ctx.route('**/' + url, serve(name))
    return ctx
class Checker:
    def __init__(self, title): self.title = title; self.n = 0; self.fails = []
    def __call__(self, cond, msg):
        self.n += 1
        if not cond: self.fails.append(msg); print('FAIL', msg)
    def done(self):
        print(f"{self.title} {'FAILED' if self.fails else 'OK'}: {self.n} checks"); sys.exit(1 if self.fails else 0)
