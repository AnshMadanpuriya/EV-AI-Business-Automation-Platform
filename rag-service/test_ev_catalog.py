import unittest
import json
import re
from pathlib import Path
from unittest.mock import patch
from ev_catalog import CATALOG, identify, reference_knowledge, reference_answer, retrieve_knowledge


class CatalogTests(unittest.TestCase):
    def test_every_brand_has_models(self):
        for brand in CATALOG['brands']:
            self.assertTrue(identify(brand['make'])[1], brand['make'])

    def test_ather_brand_question(self):
        for question in ['give data of ather', 'Ather ke models batao', 'एथर की जानकारी']:
            knowledge = reference_knowledge(question)
            self.assertTrue(all(v['make'] == 'Ather' for v in knowledge['vehicles']))
            self.assertIn('450X', reference_answer(question, knowledge))
            self.assertTrue(knowledge['sources'])

    def test_followup_and_unknown_brand(self):
        history = [{'role': 'user', 'content': 'BMW iX1 range'}]
        self.assertEqual(identify('iski battery?', history)[1][0]['model'], 'iX1 LWB')
        self.assertFalse(identify('what about UnknownBrand range', history)[1])

    def test_unknown_model_does_not_invent(self):
        self.assertFalse(identify('UnknownBrand vehicle')[1])
        self.assertIn('not have a confirmed source', reference_answer('UnknownBrand vehicle', reference_knowledge('UnknownBrand vehicle')))

    def test_current_price_is_not_guessed(self):
        answer = reference_answer('BMW i4 price today', reference_knowledge('BMW i4'))
        self.assertIn('not confirmed', answer)
        self.assertNotIn('₹', answer)

    def test_shared_conversation_regressions(self):
        fixtures = json.loads((Path(__file__).parent.parent / 'shared' / 'ev-chat-cases.json').read_text())
        for entry in fixtures:
            with self.subTest(question=entry['question']):
                knowledge = reference_knowledge(entry['question'], entry.get('history'))
                answer = reference_answer(entry['question'], knowledge)
                if entry.get('detail'):
                    self.assertIn('450X', answer)
                    continue
                self.assertEqual(len(knowledge['vehicles']), entry['count'])
                self.assertEqual(sum(v['vehicle_type'] == 'two_wheeler' for v in knowledge['vehicles']), entry['two'])
                self.assertEqual(sum(v['vehicle_type'] == 'four_wheeler' for v in knowledge['vehicles']), entry['four'])
                self.assertEqual(len(re.findall(r'^\d+\. ', answer, re.M)), entry['count'])
                if entry.get('makes'):
                    self.assertTrue(all(v['make'] in entry['makes'] for v in knowledge['vehicles']))
                if entry.get('price'):
                    self.assertIn(entry['price'], answer)
                if entry.get('shortfall'):
                    self.assertIn('requested 20; only 10', answer)
                self.assertEqual(knowledge['notice'], '')

    def test_dated_price_reference(self):
        answer = reference_answer('Ather 450X price', reference_knowledge('Ather 450X'))
        self.assertIn('₹1,48,998', answer)
        self.assertIn('2026-09-07', answer)
        self.assertIn('advertised starting price', answer)
        self.assertIn('on-road price is not confirmed', answer)

    def test_common_answers_skip_context_network(self):
        with patch('ev_catalog.urlopen', side_effect=AssertionError('No network')) as network:
            for question in ['hi', 'give data of ather', 'BMW iX1 range', 'Tesla Model Y range']:
                self.assertTrue(retrieve_knowledge(question).get('fast_answer'), question)
            network.assert_not_called()
        self.assertFalse(reference_knowledge('Ather price today').get('fast_answer'))
        self.assertFalse(reference_knowledge('why is Ather better than Ola').get('fast_answer'))

    def test_backend_failure_keeps_reference_answers(self):
        with patch('ev_catalog.urlopen', side_effect=TimeoutError()):
            result = retrieve_knowledge('Tesla Model Y')
        self.assertEqual(result['mode'], 'catalog')
        self.assertTrue(result['vehicles'])


if __name__ == '__main__':
    unittest.main()
