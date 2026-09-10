import json

data = json.load(open('data/database.json', 'r', encoding='utf-8'))
print('Taxpayers in DB:')
taxpayers = data.get('taxpayers', [])
if isinstance(taxpayers, list):
    for v in taxpayers:
        print(f"  GSTIN: {v.get('gstin')} | Trade: {v.get('tradeName')} | Type: {v.get('taxpayerType')}")
elif isinstance(taxpayers, dict):
    for k, v in taxpayers.items():
        print(f"  GSTIN: {k} | Trade: {v.get('tradeName')} | Type: {v.get('taxpayerType')}")
