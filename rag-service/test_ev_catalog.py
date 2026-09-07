import unittest
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
        answer = reference_answer('Ather price today', reference_knowledge('Ather'))
        self.assertIn('not confirmed', answer)
        self.assertNotIn('₹', answer)

    def test_backend_failure_keeps_reference_answers(self):
        with patch('ev_catalog.urlopen', side_effect=TimeoutError()):
            result = retrieve_knowledge('Tesla Model Y')
        self.assertEqual(result['mode'], 'catalog')
        self.assertTrue(result['vehicles'])


if __name__ == '__main__':
    unittest.main()
