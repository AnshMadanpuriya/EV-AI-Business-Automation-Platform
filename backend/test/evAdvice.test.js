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
