import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from ev_catalog import CATALOG, identify, reference_knowledge, reference_answer
from ev_conversation import context_for, clean_catalog_context
from catalog_documents import catalog_documents
from index_paths import active_index, new_index, publish_index


class CoverageTests(unittest.TestCase):
    def test_requested_names_have_exactly_one_match(self):
        names=json.loads((Path(__file__).parent.parent/'shared/ev-requested-models.json').read_text())
        for name in names:
            with self.subTest(name=name):
                self.assertEqual(len(identify('give data of '+name)[1]),1)
        self.assertFalse(identify('give one more EV name')[1])
        self.assertEqual(identify('TVS iQube ST')[1][0]['model'],'iQube ST')

    def test_pagination_does_not_repeat_without_history(self):
        context=None;seen=set()
        for page in range(12):
            k=reference_knowledge('give or suggesy more ev names' if page else 'list 20 EVs',catalog_context=context)
            rows={v['make']+'|'+v['model'] for v in k['vehicles']}
            self.assertFalse(rows & seen)
            seen |= rows
            context=context_for(k)
            if not rows:break
        self.assertEqual(len(seen),sum(v.get('model_status')!='unverified-name' for v in CATALOG['vehicles']))
        self.assertIn('seen all matching',reference_answer('more names',k))

    def test_scooter_budget_scope_survives_more_names(self):
        k=reference_knowledge('best scooter under 1 lakh for range and battery')
        k=reference_knowledge('more names',catalog_context=context_for(k))
        self.assertEqual(k['intent']['budget_inr'],100000)
        self.assertTrue(k['vehicles'])
        self.assertTrue(all(v['vehicle_subtype']=='scooter' for v in k['vehicles']))
        self.assertTrue(all(not v.get('price_reference') or v['price_reference']['amount_inr']<=100000 for v in k['vehicles']))
        cars=reference_knowledge('more car names',catalog_context=context_for(k))
        self.assertIsNone(cars['intent']['budget_inr'])
        self.assertTrue(all(v['vehicle_type']=='four_wheeler' for v in cars['vehicles']))

    def test_status_and_battery_rental_never_become_retail_guarantees(self):
        for name in ['Citroen eC3X','Kia Syros EV','Tata Sierra EV']:
            k=reference_knowledge(name)
            self.assertEqual(k['vehicles'][0]['model_status'],'unverified-name')
            self.assertIn('unverified name',reference_answer(name,k))
            self.assertNotIn('battery_capacity',k['vehicles'][0])
        answer=reference_answer('price',reference_knowledge('MG Hector Tomahawk EV'))
        self.assertIn('₹4.90/km',answer)
        self.assertIn('NOT the full',answer)
        self.assertFalse(any(v['model']=='F99' for v in reference_knowledge('recommend the best Ultraviolette bike')['vehicles']))

    def test_catalog_context_drops_forged_values(self):
        k=clean_catalog_context(dict(version=1,category='two_wheeler',brands=['Ather','http://127.0.0.1'],budget_inr='1',seen=['fake','Tata|Nexon EV','Tata|Nexon EV']),CATALOG)
        self.assertEqual(k['brands'],['Ather']);self.assertIsNone(k['budget_inr'])
        self.assertEqual(k['seen'],['Tata|Nexon EV'])

    def test_rag_document_coverage_has_each_model_and_status(self):
        docs=catalog_documents()
        self.assertEqual(len(docs),len(CATALOG['vehicles']))
        self.assertEqual(len({d['metadata']['record_id'] for d in docs}),len(docs))
        f99=next(d for d in docs if d['metadata']['record_id']=='Ultraviolette|F99')
        self.assertIn('racing-platform',f99['page_content'])
        self.assertEqual(f99['metadata']['source'],'https://www.ultraviolette.com/f99')
        for doc in docs:
            self.assertIn('missing specifications',doc['page_content'])
            self.assertTrue(all(isinstance(v,str) for v in doc['metadata'].values()))

    def test_failed_rebuild_leaves_previous_active_index(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'chroma.sqlite3').touch()
            self.assertEqual(active_index(root),root)
            candidate=new_index(root)
            with self.assertRaises(ValueError):publish_index(root,candidate)
            self.assertEqual(active_index(root),root)
            (candidate/'chroma.sqlite3').touch()
            publish_index(root,candidate)
            self.assertEqual(active_index(root),candidate)
            other=new_index(root);(other/'chroma.sqlite3').touch()
            with patch('index_paths.os.replace',side_effect=OSError('disk full')):
                with self.assertRaises(OSError):publish_index(root,other)
            self.assertEqual(active_index(root),candidate)
            (root/'active-index.json').write_text(json.dumps(dict(version=1,directory='../outside')))
            self.assertEqual(active_index(root),root)
