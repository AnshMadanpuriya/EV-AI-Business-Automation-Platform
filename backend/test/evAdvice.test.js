const test = require('node:test');
const assert = require('node:assert/strict');
const { retrieveKnowledge, localAnswer, clearCache } = require('../services/evKnowledge');
const turns = [
  ['Fast charging ke baare mein batao', 'charging', 'DC charger'],
  ['so provide me the detail which evehicle has best battery among all two wheelers vehicle', 'recommendation', 'Ola'],
  ['hy', 'greeting', 'Hi!'],
  ['how i purchase ev', 'purchase', 'written on-road quote'],
  ['which is best car ev in temrs of price and battery', 'recommendation', 'Tata'],
];
test('reported conversation changes intent, respects vehicle category and never fetches for fallback guidance', async t => {
  t.mock.method(global, 'fetch', async () => { throw new Error('Unexpected network request'); });
  const history = [];
  for (const [question, kind, expected] of turns) {
    const knowledge = await retrieveKnowledge(question, history);
    const answer = localAnswer(question, knowledge);
    assert.equal(knowledge.intent.kind, kind);
    assert.match(answer, new RegExp(expected));
    assert.ok(knowledge.fast_answer);
    if (question.includes('two wheelers')) assert.ok(knowledge.vehicles.every(v => v.vehicle_type === 'two_wheeler'));
    if (question.includes('car ev')) {
      assert.ok(knowledge.vehicles.every(v => v.vehicle_type === 'four_wheeler'));
      assert.match(answer, /cannot honestly rank/);
    }
    assert.doesNotMatch(answer, /EVs use model-specific|General AI answers require/);
    history.push({role:'user',content:question}, {role:'assistant',content:answer});
  }
  assert.equal(global.fetch.mock.callCount(), 0);
  clearCache();
});
test('named vehicles stay scoped and unknown battery values are not fabricated', async () => {
  const knowledge = await retrieveKnowledge('recommend the best Ather scooter battery');
  const answer = localAnswer('', knowledge);
  assert.ok(knowledge.vehicles.length);
  assert.ok(knowledge.vehicles.every(v => v.make === 'Ather'));
  assert.match(answer, /not confirmed in this catalog/);
  assert.match(answer, /1,48,998/);
  assert.doesNotMatch(answer, /largest listed pack/);
});
test('recommendation follow-ups inherit category but a new greeting does not', async () => {
  const history = [{role:'user',content:'show two wheelers'}];
  const knowledge = await retrieveKnowledge('which EV has the largest battery?', history);
  assert.ok(knowledge.vehicles.every(v => v.vehicle_type === 'two_wheeler'));
  assert.equal((await retrieveKnowledge('hy', history)).intent.kind, 'greeting');
});

test('budget recommendation retains context through the reported clarification and misspelling', async t => {
  t.mock.method(global, 'fetch', async () => { throw new Error('Unexpected network request'); });
  const history = [];
  for (const question of ['so which ev two vehicle is best in range near 100000 in terms of best battery and charging', 'scooters', 'suffest by your own']) {
    const knowledge = await retrieveKnowledge(question, history);
    const answer = localAnswer(question, knowledge);
    assert.equal(knowledge.intent.kind, 'recommendation');
    assert.equal(knowledge.intent.budget_inr, 100000);
    assert.equal(knowledge.intent.category, 'two_wheeler');
    assert.match(answer, /TVS Orbiter/);
    assert.match(answer, /₹99,250/);
    assert.match(answer, /158 km/);
    assert.match(answer, /4 h 10 min/);
    assert.match(answer, /on-road/);
    assert.doesNotMatch(answer, /What is your total budget|scooter or a car|do not have a confirmed source/);
    assert.ok(knowledge.vehicles.every(v => v.vehicle_type === 'two_wheeler'));
    assert.ok(knowledge.vehicles.every(v => !v.price_reference || v.price_reference.amount_inr <= 100000));
    history.push({role:'user',content:question}, {role:'assistant',content:answer});
  }
  assert.equal(global.fetch.mock.callCount(), 0);
});

test('ambiguous recommendations retain money; revised budgets, category changes and greetings reset correctly', async () => {
  const history = [{role:'user',content:'best EV under 1 lakh for range'}];
  assert.match(localAnswer('', await retrieveKnowledge(history[0].content)), /₹1,00,000.*scooter or a car/s);
  const scooter = await retrieveKnowledge('scooters', history);
  assert.equal(scooter.intent.budget_inr, 100000);
  history.push({role:'user',content:'scooters'});
  const cheaper = await retrieveKnowledge('my budget is 80k', history);
  assert.equal(cheaper.intent.budget_inr, 80000);
  assert.ok(cheaper.vehicles.every(v => !v.price_reference || v.price_reference.amount_inr <= 80000));
  assert.match(localAnswer('', cheaper), /not confirmed options within your budget/);
  const cars = await retrieveKnowledge('cars instead', history);
  // This is a new topic rather than an invitation to apply the scooter price to a car.
  const fresh = await retrieveKnowledge('recommend a car', [...history, {role:'user',content:'hy'}]);
  assert.equal(fresh.intent.budget_inr, null);
  assert.ok(fresh.vehicles.every(v => v.vehicle_type === 'four_wheeler'));
  assert.equal(cars.intent.category, 'four_wheeler');
  assert.equal(cars.intent.budget_inr, null);
  assert.ok(cars.vehicles.length);
  assert.ok(cars.vehicles.every(v => v.vehicle_type === 'four_wheeler'));
  const reset = await retrieveKnowledge('suggest by your own', [...history, {role:'user',content:'which laptop is best?'}]);
  assert.equal(reset.intent.category, null);
  assert.equal(reset.intent.budget_inr, null);
});

test('budget parsing understands Indian amounts without treating range or model numbers as money', () => {
  const { budgetFrom } = require('../services/evAdvice');
  for (const text of ['near 100000', '₹1,00,000', '1 lakh', '1 lac', '100k', 'Rs. 100000', 'budget is 100000']) assert.equal(budgetFrom(text), 100000, text);
  for (const text of ['range 100 km', 'Model 3', '3.1 kWh', '20 vehicles']) assert.equal(budgetFrom(text), null, text);
});
