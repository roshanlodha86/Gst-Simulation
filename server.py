import sqlite3
import os
import json
import urllib.parse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import random
import string
from datetime import datetime

import shutil

PORT = int(os.environ.get("PORT", 8000))
HOST = os.environ.get("HOST", "0.0.0.0")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")

IS_SERVERLESS = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
if IS_SERVERLESS:
    DATA_DIR = os.path.join("/tmp", "gst_data")
    os.makedirs(DATA_DIR, exist_ok=True)
    src_json = os.path.join(BASE_DIR, "data", "database.json")
    dst_json = os.path.join(DATA_DIR, "database.json")
    if os.path.exists(src_json) and not os.path.exists(dst_json):
        shutil.copy2(src_json, dst_json)
    src_db = os.path.join(BASE_DIR, "data", "gst_database.db")
    dst_db = os.path.join(DATA_DIR, "gst_database.db")
    if os.path.exists(src_db) and not os.path.exists(dst_db):
        shutil.copy2(src_db, dst_db)
else:
    DATA_DIR = os.path.join(BASE_DIR, "data")

DATA_FILE = os.path.join(DATA_DIR, "database.json")
DB_PATH = os.path.join(DATA_DIR, "gst_database.db")

def load_db():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"taxpayers": [], "applications": [], "sampleInvoices": []}

def save_db(db):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2)

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_sqlite_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS form_submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            form_name TEXT NOT NULL,
            section TEXT,
            taxpayer_gstin TEXT,
            fy TEXT,
            period TEXT,
            data_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS gstr1_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            gstin TEXT NOT NULL,
            fy TEXT,
            period TEXT,
            table_name TEXT NOT NULL,
            invoice_no TEXT,
            invoice_date TEXT,
            pos TEXT,
            rate REAL,
            taxable_value REAL,
            igst REAL,
            cgst REAL,
            sgst REAL,
            total_value REAL,
            record_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS taxpayers (
            gstin TEXT PRIMARY KEY,
            legal_name TEXT,
            trade_name TEXT,
            pan TEXT,
            state TEXT,
            state_code TEXT,
            status TEXT,
            data_json TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS challans (
            cpin TEXT PRIMARY KEY,
            gstin TEXT,
            cin TEXT,
            amount REAL,
            status TEXT,
            data_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS eway_bills (
            ewb_no TEXT PRIMARY KEY,
            from_gstin TEXT,
            to_gstin TEXT,
            doc_no TEXT,
            amount REAL,
            data_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS returns_filed (
            arn TEXT PRIMARY KEY,
            gstin TEXT,
            return_type TEXT,
            fy TEXT,
            period TEXT,
            status TEXT,
            data_json TEXT NOT NULL,
            filed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS grievances (
            ticket_no TEXT PRIMARY KEY,
            gstin TEXT,
            category TEXT,
            status TEXT,
            data_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Seed taxpayers from database.json if empty
    cur.execute("SELECT COUNT(*) FROM taxpayers")
    if cur.fetchone()[0] == 0 and os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                seed_data = json.load(f)
            for tp in seed_data.get("taxpayers", []):
                cur.execute("""
                    INSERT OR REPLACE INTO taxpayers (gstin, legal_name, trade_name, pan, state, state_code, status, data_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    tp.get("gstin"), tp.get("legalName"), tp.get("tradeName"),
                    tp.get("pan"), tp.get("state"), tp.get("stateCode"),
                    tp.get("status", "Active"), json.dumps(tp)
                ))
            for ewb in seed_data.get("ewayBills", []):
                cur.execute("""
                    INSERT OR REPLACE INTO eway_bills (ewb_no, from_gstin, to_gstin, doc_no, amount, data_json)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    ewb.get("ewbNo"), ewb.get("fromGstin"), ewb.get("toGstin"),
                    ewb.get("docNo"), ewb.get("taxableAmount", 0), json.dumps(ewb)
                ))
        except Exception as e:
            print("Notice: Seeding SQLite error:", e)

    conn.commit()
    conn.close()

def save_form_submission(form_name, data, section=None, gstin=None, fy=None, period=None):
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO form_submissions (form_name, section, taxpayer_gstin, fy, period, data_json)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (form_name, section, gstin, fy, period, json.dumps(data)))
        sub_id = cur.lastrowid

        # If GSTR-1, record individual table transactions
        if form_name in ['GSTR-1', 'GSTR-1_FILED'] and isinstance(data, dict):
            tables_data = data.get('tables') if 'tables' in data else data
            if isinstance(tables_data, dict):
                for tbl in ['b2b', 'b2cl', 'exp', 'b2cs', 'cdnr', 'cdnur', 'hsn']:
                    rows = tables_data.get(tbl, [])
                    if isinstance(rows, list):
                        for r in rows:
                            cur.execute("""
                                INSERT INTO gstr1_records (
                                    gstin, fy, period, table_name, invoice_no, invoice_date, pos, rate,
                                    taxable_value, igst, cgst, sgst, total_value, record_json
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                gstin or '', fy or '', period or '', tbl,
                                r.get('invoiceNumber') or r.get('noteNumber') or r.get('code') or '',
                                r.get('invoiceDate') or r.get('noteDate') or '',
                                r.get('posState') or r.get('posCode') or '',
                                float(r.get('rate') or 0),
                                float(r.get('taxableValue') or 0),
                                float(r.get('igst') or 0),
                                float(r.get('cgst') or 0),
                                float(r.get('sgst') or 0),
                                float(r.get('total') or r.get('totalValue') or 0),
                                json.dumps(r)
                            ))
        conn.commit()
        conn.close()
        return sub_id
    except Exception as e:
        print("save_form_submission DB error:", e)
        return None

class GSTSimulationHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def send_json(self, data, status=200):
        body = json.dumps(data, indent=2).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Route API endpoints
        if path == '/api/taxpayers':
            db = load_db()
            self.send_json({"success": True, "taxpayers": db.get("taxpayers", [])})
            return

        elif path.startswith('/api/taxpayers/'):
            gstin = path.split('/')[3].upper()
            db = load_db()
            found = next((t for t in db.get("taxpayers", []) if t.get("gstin") == gstin), None)
            if found:
                self.send_json({"success": True, "taxpayer": found})
            else:
                self.send_json({"success": False, "error": "Taxpayer not found with GSTIN: " + gstin}, 404)
            return

        elif path == '/api/taxpayer/search':
            q = query.get('query', [''])[0].strip().upper()
            db = load_db()
            results = []
            for t in db.get("taxpayers", []):
                if q in t.get("gstin", "") or q in t.get("pan", "") or q in t.get("legalName", "").upper() or q in t.get("tradeName", "").upper():
                    results.append(t)
            self.send_json({"success": True, "results": results})
            return

        elif path == '/api/application/track':
            arn = query.get('arn', [''])[0].strip().upper()
            db = load_db()
            found = next((a for a in db.get("applications", []) if a.get("arn") == arn), None)
            if found:
                self.send_json({"success": True, "application": found})
            else:
                self.send_json({"success": False, "error": "No application found for ARN: " + arn}, 404)
            return

        elif path == '/api/returns/gstr2b':
            gstin = query.get('gstin', [''])[0].strip().upper()
            period = query.get('period', ['August'])[0]
            db = load_db()
            # Return sample inward supply invoices
            invoices = db.get("sampleInvoices", [])
            eligible_itc = {"igst": 45000, "cgst": 9000, "sgst": 9000, "cess": 0}
            self.send_json({
                "success": True,
                "gstin": gstin,
                "period": period,
                "invoices": invoices,
                "summary": eligible_itc
            })
            return

        elif path == '/api/profile':
            gstin = query.get('gstin', [''])[0].strip().upper()
            db = load_db()
            found = next((t for t in db.get("taxpayers", []) if t.get("gstin") == gstin), None)
            if not found and db.get("taxpayers"):
                found = db["taxpayers"][0]
            if found:
                self.send_json({"success": True, "taxpayer": found})
            else:
                self.send_json({"success": False, "error": "Taxpayer not found"}, 404)
            return

        elif path == '/api/notices':
            gstin = query.get('gstin', [''])[0].strip().upper()
            db = load_db()
            found = next((t for t in db.get("taxpayers", []) if t.get("gstin") == gstin), None)
            if not found and db.get("taxpayers"):
                found = db["taxpayers"][0]
            notices = found.get("notices", []) if found else []
            self.send_json({"success": True, "notices": notices})
            return

        elif path == '/api/ewaybill/list':
            gstin = query.get('gstin', [''])[0].strip().upper()
            db = load_db()
            all_ewb = db.get("ewayBills", [])
            filtered = [e for e in all_ewb if not gstin or e.get("generatedBy") == gstin or e.get("fromGstin") == gstin or e.get("toGstin") == gstin]
            self.send_json({"success": True, "ewayBills": filtered})
            return

        elif path == '/api/ewaybill/get':
            ewb_no = query.get('ewb', [''])[0].strip()
            db = load_db()
            found = next((e for e in db.get("ewayBills", []) if e.get("ewbNo") == ewb_no), None)
            if found:
                self.send_json({"success": True, "ewayBill": found})
            else:
                self.send_json({"success": False, "error": "e-Way Bill not found"}, 404)
            return

        elif path == '/api/ledgers':
            gstin = query.get('gstin', [''])[0].strip().upper()
            db = load_db()
            found = next((t for t in db.get("taxpayers", []) if t.get("gstin") == gstin), None)
            if not found and db.get("taxpayers"):
                found = db["taxpayers"][0]
            if found:
                self.send_json({
                    "success": True,
                    "gstin": found.get("gstin"),
                    "legalName": found.get("legalName"),
                    "tradeName": found.get("tradeName"),
                    "cashLedger": found.get("cashLedger", {}),
                    "creditLedger": found.get("creditLedger", {}),
                    "liabilityRegister": found.get("liabilityRegister", {}),
                    "transactions": found.get("transactions", [])
                })
            else:
                self.send_json({"success": False, "error": "Taxpayer ledgers not found"}, 404)
            return

        elif path == '/api/grievance/track':
            ticket_no = (query.get('ticket') or query.get('ticketNo') or [''])[0].strip().upper()
            db = load_db()
            found = next((g for g in db.get("grievances", []) if g.get("ticketNo", "").upper() == ticket_no), None)
            if not found and db.get("grievances"):
                found = next((g for g in db.get("grievances", []) if ticket_no and ticket_no in g.get("ticketNo", "").upper()), None)
            if found:
                self.send_json({"success": True, "grievance": found})
            else:
                self.send_json({"success": False, "error": "Grievance ticket not found"}, 404)
            return

        # Database & Submissions Endpoints
        elif path == '/api/database/status':
            try:
                conn = get_db()
                cur = conn.cursor()
                counts = {}
                for t in ['form_submissions', 'gstr1_records', 'taxpayers', 'challans', 'eway_bills', 'returns_filed', 'grievances']:
                    cur.execute(f"SELECT COUNT(*) FROM {t}")
                    counts[t] = cur.fetchone()[0]
                conn.close()
                self.send_json({
                    "success": True,
                    "database": "data/gst_database.db",
                    "status": "connected",
                    "counts": counts
                })
            except Exception as e:
                self.send_json({"success": False, "error": str(e)}, 500)
            return

        elif path == '/api/database/submissions' or path == '/api/form/submissions':
            try:
                form_name = query.get('formName', [''])[0].strip()
                gstin = query.get('gstin', [''])[0].strip().upper()
                period = query.get('period', [''])[0].strip()
                fy = query.get('fy', [''])[0].strip()
                limit = int(query.get('limit', [100])[0])

                conn = get_db()
                cur = conn.cursor()
                sql = "SELECT * FROM form_submissions WHERE 1=1"
                params = []
                if form_name:
                    sql += " AND form_name = ?"
                    params.append(form_name)
                if gstin:
                    sql += " AND taxpayer_gstin = ?"
                    params.append(gstin)
                if period:
                    sql += " AND period = ?"
                    params.append(period)
                if fy:
                    sql += " AND fy = ?"
                    params.append(fy)
                sql += " ORDER BY id DESC LIMIT ?"
                params.append(limit)

                cur.execute(sql, tuple(params))
                rows = []
                for r in cur.fetchall():
                    try:
                        data_obj = json.loads(r['data_json'])
                    except Exception:
                        data_obj = r['data_json']
                    rows.append({
                        "id": r['id'],
                        "formName": r['form_name'],
                        "section": r['section'],
                        "gstin": r['taxpayer_gstin'],
                        "fy": r['fy'],
                        "period": r['period'],
                        "createdAt": r['created_at'],
                        "data": data_obj
                    })
                conn.close()
                self.send_json({"success": True, "count": len(rows), "submissions": rows})
            except Exception as e:
                self.send_json({"success": False, "error": str(e)}, 500)
            return

        elif path == '/api/database/gstr1-records':
            try:
                gstin = query.get('gstin', [''])[0].strip().upper()
                table_name = query.get('table', [''])[0].strip()
                conn = get_db()
                cur = conn.cursor()
                sql = "SELECT * FROM gstr1_records WHERE 1=1"
                params = []
                if gstin:
                    sql += " AND gstin = ?"
                    params.append(gstin)
                if table_name:
                    sql += " AND table_name = ?"
                    params.append(table_name)
                sql += " ORDER BY id DESC LIMIT 100"
                cur.execute(sql, tuple(params))
                records = []
                for r in cur.fetchall():
                    records.append(dict(r))
                conn.close()
                self.send_json({"success": True, "count": len(records), "records": records})
            except Exception as e:
                self.send_json({"success": False, "error": str(e)}, 500)
            return

        # Default: Serve static files from public directory
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else "{}"
        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        if path == '/api/form/save':
            form_name = payload.get('formName', 'GENERIC_FORM')
            section = payload.get('section', '')
            gstin = payload.get('gstin', '')
            fy = payload.get('fy', '2024-25')
            period = payload.get('period', 'August')
            form_data = payload.get('data', payload)

            sub_id = save_form_submission(form_name, form_data, section=section, gstin=gstin, fy=fy, period=period)
            self.send_json({
                "success": True,
                "message": f"Data saved to SQLite database successfully for {form_name}.",
                "submissionId": sub_id
            })
            return

        elif path == '/api/auth/login':
            username = payload.get('username', '')
            password = payload.get('password', '')
            captcha = payload.get('captcha', '')
            db = load_db()
            # If username matches a GSTIN or PAN or sample user
            found = next((t for t in db.get("taxpayers", []) if t.get("gstin") == username or t.get("pan") == username), None)
            if not found:
                # Default to first taxpayer if generic login
                found = db.get("taxpayers", [])[0] if db.get("taxpayers") else None

            # Generate simulated OTP
            simulated_otp = str(random.randint(100000, 999999))
            self.send_json({
                "success": True,
                "message": "Credentials verified. Simulated OTP sent.",
                "otp": simulated_otp,
                "taxpayer": found
            })
            return

        elif path == '/api/registration/part-a':
            state_code = payload.get('stateCode', '27')
            pan = payload.get('pan', '').upper()
            legal_name = payload.get('legalName', '').upper()
            trn = f"{state_code}{datetime.now().strftime('%y')}000{random.randint(1000, 9999)}TRN"
            simulated_otp = str(random.randint(100000, 999999))
            self.send_json({
                "success": True,
                "message": "Part-A verified successfully. TRN generated.",
                "trn": trn,
                "otp": simulated_otp
            })
            return

        elif path == '/api/registration/part-b':
            db = load_db()
            state_code = payload.get('stateCode', '27')
            pan = payload.get('pan', f"AABC{random.choice(string.ascii_uppercase)}{random.randint(1000,9999)}{random.choice(string.ascii_uppercase)}")
            legal_name = payload.get('legalName', 'NEW TAXPAYER ENTERPRISE')
            trade_name = payload.get('tradeName', legal_name)
            state = payload.get('state', 'Maharashtra')
            taxpayer_type = payload.get('type', 'Regular')

            new_gstin = f"{state_code}{pan}1Z{random.choice(string.ascii_uppercase)}"
            arn = f"AA{state_code}{datetime.now().strftime('%m%y')}{random.randint(1000000, 9999999)}"

            new_tp = {
                "gstin": new_gstin,
                "legalName": legal_name,
                "tradeName": trade_name,
                "pan": pan,
                "state": state,
                "stateCode": state_code,
                "type": taxpayer_type,
                "constitution": payload.get('constitution', 'Private Limited Company'),
                "registrationDate": datetime.now().strftime('%d/%m/%Y'),
                "status": "Active",
                "centerJurisdiction": "RANGE-01, DIVISION-II",
                "stateJurisdiction": "NODAL WARD 1",
                "address": payload.get('address', 'Unit 101, Business Hub, ' + state),
                "cashLedger": {
                    "igst": { "tax": 0, "interest": 0, "penalty": 0, "fee": 0, "other": 0 },
                    "cgst": { "tax": 0, "interest": 0, "penalty": 0, "fee": 0, "other": 0 },
                    "sgst": { "tax": 0, "interest": 0, "penalty": 0, "fee": 0, "other": 0 },
                    "cess": { "tax": 0, "interest": 0, "penalty": 0, "fee": 0, "other": 0 }
                },
                "creditLedger": { "igst": 0, "cgst": 0, "sgst": 0, "cess": 0 },
                "liabilityRegister": { "igst": 0, "cgst": 0, "sgst": 0, "cess": 0 },
                "returns": {},
                "challans": []
            }
            db["taxpayers"].append(new_tp)

            db["applications"].append({
                "arn": arn,
                "trn": payload.get('trn', 'SIMULATED_TRN'),
                "legalName": legal_name,
                "pan": pan,
                "state": state,
                "appliedDate": datetime.now().strftime('%d/%m/%Y'),
                "status": "Approved",
                "stage": "GSTIN Generated",
                "generatedGstin": new_gstin
            })
            save_db(db)

            self.send_json({
                "success": True,
                "message": "Registration Application Submitted Successfully.",
                "arn": arn,
                "gstin": new_gstin,
                "taxpayer": new_tp
            })
            return

        elif path == '/api/challan/create':
            gstin = payload.get('gstin', '')
            cpin = f"{datetime.now().strftime('%y%m%d')}{random.randint(10000000, 99999999)}"
            challan = {
                "cpin": cpin,
                "gstin": gstin,
                "createdDate": datetime.now().strftime('%d/%m/%Y'),
                "amounts": payload.get('amounts', {}),
                "totalAmount": payload.get('totalAmount', 0),
                "paymentMode": payload.get('paymentMode', 'E-Payment'),
                "status": "PENDING"
            }
            self.send_json({"success": True, "challan": challan})
            return

        elif path == '/api/challan/pay':
            db = load_db()
            gstin = payload.get('gstin', '')
            amounts = payload.get('amounts', {})
            cin = f"SBIN{datetime.now().strftime('%y%m%d')}{random.randint(100000, 999999)}"

            # Credit Cash Ledger
            tp = next((t for t in db.get("taxpayers", []) if t.get("gstin") == gstin), None)
            if tp:
                for head in ['igst', 'cgst', 'sgst', 'cess']:
                    added = int(amounts.get(head, 0))
                    tp["cashLedger"][head]["tax"] = tp["cashLedger"][head].get("tax", 0) + added

                tp.setdefault("challans", []).append({
                    "cpin": payload.get('cpin', 'CPIN123'),
                    "cin": cin,
                    "date": datetime.now().strftime('%d/%m/%Y'),
                    "amount": payload.get('totalAmount', 0),
                    "bank": payload.get('bank', 'State Bank of India'),
                    "status": "SUCCESS"
                })
                save_db(db)

            self.send_json({
                "success": True,
                "message": "Payment Successful. Electronic Cash Ledger Credited.",
                "cin": cin,
                "updatedCashLedger": tp["cashLedger"] if tp else {}
            })
            return

        elif path == '/api/returns/gstr1/file':
            db = load_db()
            gstin = payload.get('gstin', '')
            period = payload.get('period', 'August')
            fy = payload.get('fy', '2024-25')
            arn = f"AA{gstin[:2]}{datetime.now().strftime('%m%y')}{random.randint(1000000, 9999999)}"

            tp = next((t for t in db.get("taxpayers", []) if t.get("gstin") == gstin), None)
            if tp:
                tp.setdefault("returns", {}).setdefault(fy, {}).setdefault(period, {})
                tp["returns"][fy][period]["gstr1"] = {
                    "status": "FILED",
                    "arn": arn,
                    "filedDate": datetime.now().strftime('%d/%m/%Y'),
                    "invoices": payload.get('invoices', []),
                    "tables": payload.get('tables', {}),
                    "summary": payload.get('summary', {})
                }
                save_db(db)

            self.send_json({
                "success": True,
                "message": "GSTR-1 Filed Successfully.",
                "arn": arn
            })
            return

        elif path == '/api/returns/gstr3b/file':
            db = load_db()
            gstin = payload.get('gstin', '')
            period = payload.get('period', 'August')
            fy = payload.get('fy', '2024-25')
            arn = f"AA{gstin[:2]}{datetime.now().strftime('%m%y')}{random.randint(1000000, 9999999)}"

            tp = next((t for t in db.get("taxpayers", []) if t.get("gstin") == gstin), None)
            if tp:
                paid_cash = payload.get('paidCash', {})
                paid_itc = payload.get('paidItc', {})
                if not isinstance(paid_cash, dict):
                    paid_cash = {}
                if not isinstance(paid_itc, dict):
                    paid_itc = {}

                for h in ['igst', 'cgst', 'sgst', 'cess']:
                    cash_ded = int(paid_cash.get(h, 0) or 0)
                    tp["cashLedger"][h]["tax"] = max(0, tp["cashLedger"][h].get("tax", 0) - cash_ded)

                    itc_ded = int(paid_itc.get(h, 0) or 0)
                    tp["creditLedger"][h] = max(0, tp["creditLedger"].get(h, 0) - itc_ded)

                tp.setdefault("returns", {}).setdefault(fy, {}).setdefault(period, {})
                tp["returns"][fy][period]["gstr3b"] = {
                    "status": "FILED",
                    "arn": arn,
                    "filedDate": datetime.now().strftime('%d/%m/%Y'),
                    "liabilitySummary": payload.get('summary', {})
                }
                save_db(db)

            self.send_json({
                "success": True,
                "message": "GSTR-3B Filed Successfully. Taxes discharged.",
                "arn": arn,
                "updatedCashLedger": tp["cashLedger"] if tp else {},
                "updatedCreditLedger": tp["creditLedger"] if tp else {}
            })
            return

        elif path == '/api/notices/reply':
            db = load_db()
            ref_no = payload.get('referenceNo', '')
            gstin = payload.get('gstin', '')
            remarks = payload.get('remarks', '')
            ack_din = f"DIN{datetime.now().strftime('%Y%m%d')}{random.randint(100000, 999999)}"
            for tp in db.get("taxpayers", []):
                for n in tp.get("notices", []):
                    if n.get("referenceNo") == ref_no:
                        n["status"] = "REPLIED"
                        n["reply"] = {
                            "replyRefNo": ack_din,
                            "replyDate": datetime.now().strftime('%d/%m/%Y'),
                            "remarks": remarks,
                            "status": "Reply Submitted Successfully (Under Verification)"
                        }
            save_db(db)
            self.send_json({
                "success": True,
                "message": "Reply to Notice submitted successfully.",
                "din": ack_din
            })
            return

        elif path == '/api/ewaybill/create':
            db = load_db()
            state_code = payload.get('fromStateCode', '27')
            ewb_no = f"{state_code}{datetime.now().strftime('%m%d')}{random.randint(100000, 999999)}"
            ewb_item = {
                "ewbNo": ewb_no,
                "ewbDate": datetime.now().strftime('%d/%m/%Y %I:%M %p'),
                "generatedBy": payload.get('fromGstin', ''),
                "validUpto": datetime.now().strftime('%d/%m/%Y 11:59 PM'),
                "supplyType": payload.get('supplyType', 'Outward - Supply'),
                "docType": payload.get('docType', 'Tax Invoice'),
                "docNo": payload.get('docNo', f"INV-{random.randint(100,999)}"),
                "docDate": payload.get('docDate', datetime.now().strftime('%d/%m/%Y')),
                "fromGstin": payload.get('fromGstin', ''),
                "fromTrader": payload.get('fromTrader', ''),
                "fromState": payload.get('fromState', ''),
                "fromAddress": payload.get('fromAddress', ''),
                "toGstin": payload.get('toGstin', ''),
                "toTrader": payload.get('toTrader', ''),
                "toState": payload.get('toState', ''),
                "toAddress": payload.get('toAddress', ''),
                "taxableAmount": float(payload.get('taxableAmount', 0)),
                "igst": float(payload.get('igst', 0)),
                "cgst": float(payload.get('cgst', 0)),
                "sgst": float(payload.get('sgst', 0)),
                "cess": float(payload.get('cess', 0)),
                "totalAmount": float(payload.get('totalAmount', 0)),
                "hsn": payload.get('hsn', '9999'),
                "itemDesc": payload.get('itemDesc', 'General Merchandise'),
                "mode": payload.get('mode', 'Road'),
                "vehicleNo": payload.get('vehicleNo', 'MH01AB1234'),
                "approxDistance": payload.get('approxDistance', 150),
                "transporterId": payload.get('transporterId', ''),
                "transporterName": payload.get('transporterName', 'Direct Transport'),
                "status": "ACT - Active"
            }
            db.setdefault("ewayBills", []).insert(0, ewb_item)
            save_db(db)
            self.send_json({
                "success": True,
                "message": "e-Way Bill Generated Successfully.",
                "ewayBill": ewb_item
            })
            return

        elif path == '/api/grievance/lodge':
            db = load_db()
            ticket_no = f"GST-GRV-{datetime.now().year}-{random.randint(100000, 999999)}"
            grv = {
                "ticketNo": ticket_no,
                "date": datetime.now().strftime('%d/%m/%Y'),
                "gstin": payload.get('gstin', ''),
                "category": payload.get('category', 'General Query'),
                "subject": payload.get('subject', 'Helpdesk Request'),
                "description": payload.get('description', ''),
                "status": "In Progress (Assigned to Helpdesk Officer)",
                "reply": "Your grievance has been acknowledged and assigned to the nodal desk. Estimated resolution within 48 hours."
            }
            db.setdefault("grievances", []).insert(0, grv)
            save_db(db)
            self.send_json({
                "success": True,
                "message": "Grievance lodged successfully.",
                "ticketNo": ticket_no
            })
            return

        elif path == '/api/returns/gstr9/file':
            db = load_db()
            gstin = payload.get('gstin', '')
            fy = payload.get('fy', '2023-24')
            arn = f"AA{gstin[:2]}{datetime.now().strftime('%m%y')}{random.randint(1000000, 9999999)}"
            tp = next((t for t in db.get("taxpayers", []) if t.get("gstin") == gstin), None)
            if tp:
                tp.setdefault("returns", {}).setdefault(fy, {}).setdefault("annual", {})
                tp["returns"][fy]["annual"]["gstr9"] = {
                    "status": "FILED",
                    "arn": arn,
                    "filedDate": datetime.now().strftime('%d/%m/%Y'),
                    "turnover": payload.get('turnover', 0),
                    "taxPaid": payload.get('taxPaid', 0)
                }
                save_db(db)
            self.send_json({
                "success": True,
                "message": "Annual Return Form GSTR-9 Filed Successfully.",
                "arn": arn
            })
            return

        self.send_json({"error": "Endpoint not found"}, 404)

if __name__ == '__main__':
    init_sqlite_db()
    os.chdir(BASE_DIR)
    print(f"Starting GST Simulation Server on port {PORT}...")
    server = ThreadingHTTPServer((HOST, PORT), GSTSimulationHandler)
    print(f"Server running at http://{HOST}:{PORT}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
