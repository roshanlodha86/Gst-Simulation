import glob
import os
import re

files = sorted(glob.glob('public/*.html'))
for f in files:
    with open(f, 'r', encoding='utf-8', errors='ignore') as fp:
        c = fp.read()
    ids = re.findall(r'id=["\'](gst-[^"\']+)["\']', c)
    match = [i for i in ids if any(k in i.lower() for k in ['top', 'header', 'nav', 'footer', 'bread'])]
    print(f'{os.path.basename(f):22} | {match}')
