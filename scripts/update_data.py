import io, json, os, re, time, base64
from datetime import datetime, date, timedelta
from pathlib import Path
import requests
from openpyxl import load_workbook

FILE_ID=os.environ['GOOGLE_DRIVE_FILE_ID']
SA_JSON=os.environ['GOOGLE_SERVICE_ACCOUNT_JSON']

def b64url(x): return base64.urlsafe_b64encode(x).rstrip(b'=').decode()
def token():
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    info=json.loads(SA_JSON); now=int(time.time())
    h={'alg':'RS256','typ':'JWT'}
    p={'iss':info['client_email'],'scope':'https://www.googleapis.com/auth/drive.readonly','aud':'https://oauth2.googleapis.com/token','iat':now,'exp':now+3600}
    raw=f"{b64url(json.dumps(h,separators=(',',':')).encode())}.{b64url(json.dumps(p,separators=(',',':')).encode())}".encode()
    key=serialization.load_pem_private_key(info['private_key'].encode(),password=None)
    sig=key.sign(raw,padding.PKCS1v15(),hashes.SHA256())
    jwt=raw.decode()+'.'+b64url(sig)
    r=requests.post('https://oauth2.googleapis.com/token',data={'grant_type':'urn:ietf:params:oauth:grant-type:jwt-bearer','assertion':jwt},timeout=30); r.raise_for_status(); return r.json()['access_token']

def norm(v): return re.sub(r'\s+',' ',str(v or '')).strip().lower()
def parse_date(v):
    if isinstance(v,datetime): return v.date()
    if isinstance(v,date): return v
    if isinstance(v,(int,float)): return date(1899,12,30)+timedelta(days=float(v))
    s=str(v or '').strip()
    for f in ('%Y-%m-%d','%d/%m/%Y','%d-%m-%Y','%d/%m/%y','%d-%m-%y','%d.%m.%Y'):
        try:return datetime.strptime(s,f).date()
        except ValueError:pass
    return None

r=requests.get(f'https://www.googleapis.com/drive/v3/files/{FILE_ID}',params={'alt':'media'},headers={'Authorization':f'Bearer {token()}'},timeout=60); r.raise_for_status()
wb=load_workbook(io.BytesIO(r.content),read_only=True,data_only=True); ws=wb['MAIN']
rows=ws.iter_rows(values_only=True); header=next(rows); hn=[norm(x) for x in header]
def col(*names):
    for n in names:
        if norm(n) in hn:return hn.index(norm(n))
    return None
ni=col('Nama Siswa','Nama'); di=col('Tanggal Lahir','Tanggal Lahir '); gi=col('ANGKATAN','Angkatan')
if ni is None or di is None: raise RuntimeError('Kolom Nama Siswa/Tanggal Lahir tidak ditemukan di MAIN')
people=[]
for row in rows:
    name=str(row[ni] or '').strip(); bd=parse_date(row[di]); gen=str(row[gi] or '').strip() if gi is not None else ''
    if name and bd: people.append({'name':name,'birthday':bd.isoformat(),'angkatan':gen or 'Tidak diketahui'})
people.sort(key=lambda x:(x['birthday'][5:],x['name'].lower()))
Path('public').mkdir(exist_ok=True)
Path('public/data.json').write_text(json.dumps({'updatedAt':datetime.utcnow().isoformat()+'Z','people':people},ensure_ascii=False,indent=2),encoding='utf-8')
print('Exported',len(people),'records')
