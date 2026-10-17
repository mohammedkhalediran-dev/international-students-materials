from pathlib import Path
import json,base64,mimetypes,re

root=Path(__file__).resolve().parents[1]/'site'
import sys
out=Path(sys.argv[1]) if len(sys.argv)>1 else root.parent/'medixa-preview.html'
data={'pages':{},'text':{},'assets':{}}
for p in root.rglob('*'):
 if not p.is_file() or p.name.startswith('.'):continue
 rel=p.relative_to(root).as_posix()
 if p.suffix=='.html':data['pages'][rel]=p.read_text()
 elif p.suffix in ['.js','.css']:data['text'][rel]=p.read_text()
 elif p.suffix in ['.webp','.png','.pdf']:
  data['assets'][rel]={'mime':mimetypes.guess_type(p.name)[0] or 'application/octet-stream','data':base64.b64encode(p.read_bytes()).decode()}
payload=json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
html=r'''<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Medixa — معاينة التصميم</title><style>
*{box-sizing:border-box}html,body{height:100%;margin:0}body{font:14px system-ui,sans-serif;background:#e8eeed;color:#10283f;display:flex;flex-direction:column}header{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 16px;background:#fff;border-bottom:1px solid #ccdada}header strong{font:700 23px Georgia,serif;letter-spacing:-1px}header p{margin:0;color:#637784;font-size:12px}select,button{font:inherit;border:1px solid #cbd9da;background:#fff;color:#0d5863;border-radius:8px;padding:7px 11px;min-height:36px}button{cursor:pointer}header>div{display:flex;align-items:center;gap:6px;margin-inline-start:auto}.stage{flex:1;min-height:0;display:flex;justify-content:center;overflow:hidden;padding:12px}iframe{width:100%;height:100%;border:0;background:#f5f6f3;border-radius:12px;box-shadow:0 8px 24px #10283f15}iframe.phone{width:390px;max-width:100%}iframe.tablet{width:820px;max-width:100%}@media(max-width:600px){header{gap:8px;padding:8px}header p{flex-basis:100%;order:3}header>div{margin-inline-start:0}header select{max-width:170px}.stage{padding:0}iframe{border-radius:0}header .sizes{display:none}}
</style></head><body><header><strong>Medixa</strong><select id="page" aria-label="الواجهة"><option value="index.html">الرئيسية</option><option value="semester.html?id=3">الكورس الثالث</option><option value="course.html?id=physiology-kidney">المادة والمحاضرات</option><option value="study.html?id=medical-immunology&lec=1">الدراسة خطوة بخطوة</option><option value="workspace.html?view=search">البحث</option><option value="workspace.html?view=favorites">المفضلة</option><option value="workspace.html?view=professors">الأساتذة</option><option value="workspace.html?view=planner">مخطط الدراسة</option><option value="workspace.html?view=questions">بنك الأسئلة</option><option value="workspace.html?view=results">نتائج التدريب</option><option value="workspace.html?view=settings">الإعدادات</option><option value="workspace.html?view=help">المساعدة</option><option value="upload.html">رفع المحاضرات</option></select><div class="sizes"><button data-size="">حاسوب</button><button data-size="tablet">لوحي</button><button data-size="phone">هاتف</button></div><p>معاينة محلية • رفع الملفات يحتاج النسخة المتصلة بالموقع</p></header><div class="stage"><iframe id="screen" title="معاينة Medixa" sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-downloads"></iframe></div><script type="application/json" id="bundle">PAYLOAD</script><script>
"use strict";
const bundle=JSON.parse(document.getElementById("bundle").textContent),screen=document.getElementById("screen"),selector=document.getElementById("page");
const assets={};for(const [path,item] of Object.entries(bundle.assets)){const bytes=Uint8Array.from(atob(item.data),c=>c.charCodeAt(0));assets[path]=URL.createObjectURL(new Blob([bytes],{type:item.mime}));}
window.MX_ASSETS=assets;const memory={};window.MX_STORAGE={getItem(k){if(k in memory)return memory[k];try{return localStorage.getItem("medixa-preview:"+k);}catch(e){return null;}},setItem(k,v){memory[k]=String(v);try{localStorage.setItem("medixa-preview:"+k,String(v));}catch(e){}},removeItem(k){delete memory[k];try{localStorage.removeItem("medixa-preview:"+k);}catch(e){}}};
let route="index.html",serial=0;
function js(code,path){
 code=code.replace(/\b(?:window\.)?location\./g,"window.MX_LOC.").replace(/\blocalStorage\./g,"window.MX_STORAGE.");
 for(const [key,value] of Object.entries(assets)){if(!key.startsWith("assets/"))continue;code=code.split('"'+key+'"').join(JSON.stringify(value));code=code.split("'"+key+"'").join(JSON.stringify(value));}
 if(path==="data/courses.js")code+=';SITE.aiEndpoint="";COURSES.forEach(function(c){c.lectures.forEach(function(l){l.files.forEach(function(f){if(f.path && parent.MX_ASSETS["files/"+f.path])f.url=parent.MX_ASSETS["files/"+f.path];});});});';
 return code.replace(/<\/script/gi,"<\\/script");
}
function css(code){return code.replace(/url\(\s*['"]?(\.\.\/)?([^)'"\s]+)['"]?\s*\)/g,function(all,up,path){return assets[path]?"url("+JSON.stringify(assets[path])+")":all;});}
function show(value){
 const parsed=new URL(value,"https://medixa-preview.local/"),file=parsed.pathname.replace(/^\//,"")||"index.html";if(!bundle.pages[file])return;
 route=file+parsed.search+parsed.hash;selector.value=file+parsed.search;serial++;
 const id=serial,local={pathname:"/"+file,search:parsed.search,hash:parsed.hash,protocol:"file:",origin:"null"};
 const bootstrap='window.MX_STORAGE=parent.MX_STORAGE;window.MX_LOC='+JSON.stringify(local)+';Object.defineProperty(window.MX_LOC,"href",{get:function(){return "https://medixa-preview.local"+this.pathname+this.search+this.hash;},set:function(v){parent.postMessage({medixaNavigate:v},"*");}});window.MX_LOC.replace=function(v){parent.postMessage({medixaNavigate:v},"*");};window.MX_LOC.reload=function(){parent.postMessage({medixaNavigate:'+JSON.stringify(route)+'},"*");};window.UPLOADS=[];const nativeFetch=window.fetch;window.fetch=function(url,opts){if(String(url).includes("api/"))return Promise.resolve(new Response(JSON.stringify({error:"رفع الملفات غير متاح في المعاينة المحلية"}),{status:503,headers:{"Content-Type":"application/json"}}));return nativeFetch(url,opts);};document.addEventListener("click",function(e){const a=e.target.closest("a[href]");if(!a)return;const raw=a.getAttribute("href");if(!raw||raw.startsWith("blob:")||raw.startsWith("data:")||raw.startsWith("mailto:"))return;const u=new URL(raw,window.MX_LOC.href);if(u.origin!=="https://medixa-preview.local")return;if(u.pathname.endsWith(".html")||raw.startsWith("#")){e.preventDefault();e.stopImmediatePropagation();parent.postMessage({medixaNavigate:u.pathname.slice(1)+u.search+u.hash},"*");}},true);window.addEventListener("load",function(){if(window.MX_LOC.hash){const node=document.getElementById(decodeURIComponent(window.MX_LOC.hash.slice(1)));if(node)node.scrollIntoView();}});';
 let html=bundle.pages[file].replace(/<script\b([^>]*)src="([^"]+)"([^>]*)>\s*<\/script>/gi,function(all,a,src,b){const path=src.split("?")[0];if(path.startsWith("api/"))return "";return bundle.text[path]?"<script>"+js(bundle.text[path],path)+"<\/script>":all;});
 // Inline existing scripts only once; already transformed references are left intact.
 html=html.replace(/<script>([\s\S]*?)<\/script>/gi,function(all,code){return "<script>"+js(code,"")+"<\/script>";});
 html=html.replace(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/gi,function(all,src){const path=src.split("?")[0];return bundle.text[path]?"<style>"+css(bundle.text[path])+"</style>":all;});
 html=html.replace(/\b(src|href)="(assets\/[^"]+)"/g,function(all,key,path){return assets[path]?key+'="'+assets[path]+'"':all;});
 html=html.replace(/<link[^>]*rel="manifest"[^>]*>/gi,"");
 const loader='const mxSrc=Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype,"src");Object.defineProperty(HTMLScriptElement.prototype,"src",{get:mxSrc.get,set:function(v){const key=String(v).split("?")[0];mxSrc.set.call(this,parent.MX_SCRIPTS[key]||v);}});';
 html=html.replace(/<head>/i,"<head><script>"+bootstrap+loader+"<\/script>");
 screen.srcdoc=html;
}
window.addEventListener("message",function(e){if(e.source!==screen.contentWindow||!e.data||typeof e.data.medixaNavigate!=="string")return;show(e.data.medixaNavigate);});
window.MX_SCRIPTS={};for(const [p,source] of Object.entries(bundle.text)){if(p.endsWith(".js"))window.MX_SCRIPTS[p]=URL.createObjectURL(new Blob([js(source,p)],{type:"text/javascript"}));}
selector.addEventListener("change",()=>show(selector.value));document.querySelectorAll("[data-size]").forEach(b=>b.addEventListener("click",()=>{screen.className=b.dataset.size;}));show(route);
</script></body></html>'''
html=html.replace('PAYLOAD',payload)
out.write_text(html)
print(out.name,round(out.stat().st_size/1048576,2),'MiB')
