import unittest
from unittest.mock import patch
from ev_catalog import retrieve_knowledge, reference_answer

class AdviceTests(unittest.TestCase):
    def test_reported_conversation(self):
        turns = [
            ('Fast charging ke baare mein batao', 'charging', 'DC charger'),
            ('so provide me the detail which evehicle has best battery among all two wheelers vehicle', 'recommendation', 'Ola'),
            ('hy', 'greeting', 'Hi!'),
            ('how i purchase ev', 'purchase', 'written on-road quote'),
            ('which is best car ev in temrs of price and battery', 'recommendation', 'Tata'),
        ]
        history = []
        with patch('ev_catalog.urlopen', side_effect=AssertionError('No network')) as network:
            for question, kind, expected in turns:
                knowledge = retrieve_knowledge(question, history)
                answer = reference_answer(question, knowledge)
                self.assertEqual(knowledge['intent']['kind'], kind)
                self.assertIn(expected, answer)
                self.assertTrue(knowledge['fast_answer'])
                if 'two wheelers' in question:
                    self.assertTrue(all(v['vehicle_type'] == 'two_wheeler' for v in knowledge['vehicles']))
                if 'car ev' in question:
                    self.assertTrue(all(v['vehicle_type'] == 'four_wheeler' for v in knowledge['vehicles']))
                    self.assertIn('cannot honestly rank', answer)
                history += [{'role':'user','content':question}, {'role':'assistant','content':answer}]
            network.assert_not_called()

    def test_scoped_ather_with_unknown_capacities(self):
        knowledge = retrieve_knowledge('recommend the best Ather scooter battery')
        self.assertTrue(all(v['make'] == 'Ather' for v in knowledge['vehicles']))
        answer = reference_answer('', knowledge)
        self.assertIn('not confirmed in this catalog', answer)
        self.assertIn('1,48,998', answer)
        self.assertNotIn('largest listed pack', answer)

    def test_category_followup(self):
        knowledge = retrieve_knowledge('which EV has the largest battery?', [{'role':'user','content':'show two wheelers'}])
        self.assertTrue(all(v['vehicle_type'] == 'two_wheeler' for v in knowledge['vehicles']))

if __name__ == '__main__':
    unittest.main()
