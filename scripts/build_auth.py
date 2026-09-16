import hashlib,json,os
from pathlib import Path
p=os.environ['DASHBOARD_PASSWORD']
h=hashlib.sha256(p.encode()).hexdigest()
Path('public/auth.json').write_text(json.dumps({'algorithm':'SHA-256','passwordHash':h}),encoding='utf-8')
