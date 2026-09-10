# GST Portal Interactive Simulation

A full-fidelity simulation of the Goods and Services Tax (GST) Portal of India, complete with taxpayer profiles, ledgers (cash, credit, liability), returns filing (GSTR-1, GSTR-3B, GSTR-9), e-Way Bill generation, challan creation, notice tracking, and SQLite persistence.

## Features
- **Authentic UI/UX**: Pixel-perfect simulation of the official GST portal navigation, styling, and workflows.
- **Taxpayer Simulation**: Pre-seeded active taxpayers with realistic state codes, PANs, GSTINs, and ledger balances.
- **Returns Lifecycle**: GSTR-1, GSTR-2B view, GSTR-3B monthly filing, and GSTR-9 annual return.
- **Services & Tools**: Challan generation with CPIN/CIN, e-Way bill creation, taxpayer search, and grievance lodging.
- **Zero External Dependencies**: Built with pure Python standard library HTTP server + SQLite database.

---

## Local Development

Run the server with Python:
```bash
python server.py
# or
py server.py
```
Open your browser and navigate to:
```
http://localhost:8000/
```

---

## Deployment to Render

This project is pre-configured for **Render** via `render.yaml` and `Procfile`.

1. Push this repository to GitHub.
2. Log into [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** > **Web Service**.
4. Connect your GitHub repository: `https://github.com/roshanlodha86/Gst-Simulation.git`.
5. Configuration:
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt` (or leave empty)
   - **Start Command**: `python server.py`
6. Click **Deploy**. Render automatically injects `$PORT` and routes traffic.

---

## Deployment to Vercel

This project is pre-configured for **Vercel** via `vercel.json` and `api/index.py`.

1. Push this repository to GitHub.
2. Log into [Vercel Dashboard](https://vercel.com/).
3. Click **Add New** > **Project** and import your GitHub repository.
4. Leave framework preset as **Other**.
5. Click **Deploy**. Vercel will serve all static files from `public/` and route `/api/*` to the Python serverless function.
