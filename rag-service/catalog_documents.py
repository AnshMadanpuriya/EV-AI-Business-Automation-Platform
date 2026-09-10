"""Catalog-to-document conversion without network or embedding dependencies."""
import json
from pathlib import Path

CATALOG_PATH = Path(__file__).resolve().parent.parent / 'shared' / 'ev-catalog.json'


def catalog_documents(catalog=None):
    catalog = catalog or json.loads(CATALOG_PATH.read_text(encoding='utf-8'))
    documents = []
    for vehicle in catalog['vehicles']:
        record_id = vehicle['make'] + '|' + vehicle['model']
        text = '\n'.join([
            'EV MODEL: ' + vehicle['make'] + ' ' + vehicle['model'],
            'REFERENCE POLICY: ' + catalog['notice'],
            'Do not infer missing specifications. Keep battery variants and price schemes separate.',
            json.dumps(vehicle, ensure_ascii=False, indent=2),
        ])
        documents.append({'page_content': text, 'metadata': {
            'source': vehicle.get('source_url') or 'Historical catalog identity (no verified manufacturer URL)',
            'brand': vehicle['make'].lower(),
            'model': vehicle['model'],
            'record_id': record_id,
            'vehicle_type': vehicle['vehicle_type'],
            'model_status': vehicle.get('model_status', 'reference'),
            'checked_at': vehicle.get('verified_at') or 'unverified',
        }})
    return documents
