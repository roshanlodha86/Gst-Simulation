import glob
import os
import urllib.request
import urllib.error

pages = [
    'index.html',
    'login.html',
    'registration.html',
    'dashboard.html',
    'returns.html',
    'gstr1.html',
    'gstr2b.html',
    'gstr3b.html',
    'gstr9.html',
    'ledgers.html',
    'challan.html',
    'track-status.html',
    'search-taxpayer.html',
    'profile.html',
    'notices.html',
    'ewaybill.html',
    'gst-law.html',
    'downloads.html',
    'help.html',
    'shell-test.html'
]

print("=== CHECKING ALL 20 HTML PAGES ON LOCAL SERVER ===")
all_pass = True
for p in pages:
    url = f"http://127.0.0.1:8000/{p}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            status = resp.getcode()
            content = resp.read().decode('utf-8', errors='ignore')
            size = len(content)
            has_shell = 'js/shell.js' in content
            print(f"[{status}] {p:22} | Size: {size:6} bytes | Shell.js: {has_shell}")
            if status != 200:
                all_pass = False
    except Exception as e:
        print(f"[FAIL] {p:22} | Error: {e}")
        all_pass = False

print("\n=== CHECKING BACKEND API ENDPOINTS ===")
apis = [
    '/api/taxpayers',
    '/api/profile?gstin=27AAACB2234K1ZV',
    '/api/notices?gstin=27AAACB2234K1ZV',
    '/api/ledgers?gstin=27AAACB2234K1ZV',
    '/api/ewaybill/list?gstin=27AAACB2234K1ZV',
    '/api/grievance/track?ticketNo=GST-GRV-2024-819204'
]

for a in apis:
    url = f"http://127.0.0.1:8000{a}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            status = resp.getcode()
            print(f"[{status}] {a:55} | OK")
    except Exception as e:
        print(f"[FAIL] {a:55} | Error: {e}")
        all_pass = False

if all_pass:
    print("\n>>> ALL 20 PAGES AND BACKEND APIS VERIFIED 100% OPERATIONAL! <<<")
else:
    print("\n>>> SOME CHECKS FAILED! <<<")
