# tests/guest_mode.py — منذ Step 60 تظهر صفحة الدخول أولاً لمن لم يسجّل ولم يختر «المتابعة كزائر».
# الفحوص القديمة تفترض الزائر، فهذا الملف يضع ms.guest في كل سياق متصفح جديد. فحص البوابة نفسها: tests/step60_login_first.py (بلا هذا الملف).
from playwright.sync_api import Browser
_orig = Browser.new_context
def _new_context(self, *a, **k):
    c = _orig(self, *a, **k)
    c.add_init_script("try{if(!localStorage.getItem('ms.guest'))localStorage.setItem('ms.guest','1')}catch(e){}")
    return c
Browser.new_context = _new_context
