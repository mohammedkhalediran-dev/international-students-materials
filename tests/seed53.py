# seeds test accounts on the local dev server (test data only)
import json, urllib.request, urllib.parse
def seed(BASE, n=24):
    names = ['أحمد علي','سارة حسن','عمر حسين','نور أحمد','زيد كريم','مريم سعد','علي فاضل','فاطمة سالم','حسن وليد','رنا يوسف','مصطفى مازن','ليلى جواد','يوسف عادل','هدى كاظم','كرار باسم','زينب رعد','حيدر سامي','آية محمد','محمد جاسم','دعاء علي','بلال حميد','سجى ماهر','عباس فلاح','تبارك نزار']
    cookies = {}
    for i, nm in enumerate(names[:n]):
        email = f'student{i+1}@test.medixa'
        tok = urllib.request.urlopen(BASE + '__test/token?' + urllib.parse.urlencode({'email': email, 'sub': f'seed-{i}', 'name': nm})).read().decode()
        req = urllib.request.Request(BASE + 'api/auth/google', data=json.dumps({'credential': tok}).encode(), headers={'content-type': 'application/json'}, method='POST')
        res = urllib.request.urlopen(req); ck = res.headers['set-cookie'].split(';')[0]; cookies[email] = ck
        sem = [3, 3, 2, 1, None][i % 5]
        if sem:
            r = urllib.request.Request(BASE + 'api/sync', data=json.dumps({'items': {'ms.sem': {'v': sem, 't': 1000}, 'ms.fav': {'v': ['a','b','c'][:i % 4], 't': 1000}}}).encode(), headers={'content-type': 'application/json', 'cookie': ck}, method='PUT')
            urllib.request.urlopen(r)
    return cookies
