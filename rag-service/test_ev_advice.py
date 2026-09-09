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


class BudgetAdviceTests(unittest.TestCase):
    def test_reported_budget_sequence(self):
        history = []
        with patch('ev_catalog.urlopen', side_effect=AssertionError('No network')) as network:
            for question in ['so which ev two vehicle is best in range near 100000 in terms of best battery and charging', 'scooters', 'suffest by your own']:
                k = retrieve_knowledge(question, history)
                answer = reference_answer(question, k)
                self.assertEqual(k['intent']['budget_inr'], 100000)
                self.assertEqual(k['intent']['category'], 'two_wheeler')
                for text in ['TVS Orbiter', '₹99,250', '158 km', '4 h 10 min', 'on-road']:
                    self.assertIn(text, answer)
                self.assertNotIn('What is your total budget', answer)
                self.assertTrue(all(not v.get('price_reference') or v['price_reference']['amount_inr'] <= 100000 for v in k['vehicles']))
                history += [{'role':'user','content':question}, {'role':'assistant','content':answer}]
            network.assert_not_called()

    def test_context_and_budget_changes(self):
        history = [{'role':'user','content':'best EV under 1 lakh for range'}]
        self.assertIn('scooter or a car', reference_answer('', retrieve_knowledge(history[0]['content'])))
        self.assertEqual(retrieve_knowledge('scooters', history)['intent']['budget_inr'], 100000)
        history += [{'role':'user','content':'scooters'}]
        cheaper = retrieve_knowledge('my budget is 80k', history)
        self.assertEqual(cheaper['intent']['budget_inr'], 80000)
        self.assertNotIn('TVS Orbiter', reference_answer('', cheaper))
        fresh = retrieve_knowledge('recommend a car', history + [{'role':'user','content':'hy'}])
        self.assertIsNone(fresh['intent']['budget_inr'])
        self.assertTrue(all(v['vehicle_type'] == 'four_wheeler' for v in fresh['vehicles']))

    def test_budget_formats(self):
        from ev_advice import budget_from
        for text in ['near 100000', '₹1,00,000', '1 lakh', '1 lac', '100k', 'Rs. 100000', 'budget is 100000']:
            self.assertEqual(budget_from(text), 100000, text)
        for text in ['range 100 km', 'Model 3', '3.1 kWh', '20 vehicles']:
            self.assertIsNone(budget_from(text), text)

if __name__ == '__main__':
    unittest.main()
