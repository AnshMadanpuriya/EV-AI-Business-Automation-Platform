const test = require('node:test');
const assert = require('node:assert/strict');
const {catalog, identifyVehicles, searchCatalog, retrieveKnowledge, localAnswer, contextFor, clearCache} = require('../services/evKnowledge');
const {cleanCatalogContext} = require('../services/evConversation');
const requested = require('../../shared/ev-requested-models.json');
const key = v => `${v.make}|${v.model}`;
function offline(t) {
  const old = {EV_API_KEY:process.env.EV_API_KEY,EV_LIVE_WEB_ENABLED:process.env.EV_LIVE_WEB_ENABLED};
  process.env.EV_API_KEY='';process.env.EV_LIVE_WEB_ENABLED='false';clearCache();
  t.after(()=>{for(const [k,v] of Object.entries(old))v===undefined?delete process.env[k]:process.env[k]=v;clearCache();});
}

test('all user supplied EV names resolve to one model, including aliases and short names',()=>{
  for(const name of requested) {
    const rows=identifyVehicles(`give data of ${name}`).vehicles;
    assert.equal(rows.length,1, name);
    assert.ok(rows[0].source_url || rows[0].model_status==='legacy-reference', name);
  }
  assert.equal(identifyVehicles('TVS iQube ST battery').vehicles[0].model,'iQube ST');
  assert.equal(identifyVehicles('Audi RS e-tron GT range').vehicles[0].model,'RS e-tron GT');
  assert.equal(searchCatalog('Hyundai','Creta Electric')[0].model,'Creta EV');
  assert.equal(searchCatalog('Ather','Apex')[0].model,'450 Apex');
  assert.equal(identifyVehicles('give one more EV name').vehicles.length,0);
  assert.equal(identifyVehicles('Which battery handles cold air?').vehicles.length,0);
});

test('successive more-name pages never repeat and terminate honestly without a network call',async t=>{
  offline(t);t.mock.method(global,'fetch',()=>{throw Error('No network expected');});
  let context=null;const seen=new Set();let k;
  for(let i=0;i<12;i++){
    const q=i?'give or suggesy more ev names':'Give me 20 list of both two vehicles and four vehicles';
    k=await retrieveKnowledge(q,[],{catalogContext:context});
    assert.equal(k.intent.kind,'list');
    for(const v of k.vehicles){assert.ok(!seen.has(key(v)),key(v));seen.add(key(v));}
    context=contextFor(k);
    if(!k.vehicles.length)break;
  }
  assert.equal(seen.size,catalog.vehicles.filter(v=>v.model_status!=='unverified-name').length);
  assert.match(localAnswer('more names',k),/seen all matching/);
  assert.equal(context.seen.length,seen.size);
});

test('more scooter suggestions preserve budget, subtype and exclusions across short context',async t=>{
  offline(t);
  let k=await retrieveKnowledge('best scooter under 1 lakh for range and battery');
  const prior=new Set(k.vehicles.map(key));
  k=await retrieveKnowledge('more names',[],{catalogContext:contextFor(k)});
  assert.equal(k.intent.budget_inr,100000);
  assert.equal(k.intent.vehicle_subtype,'scooter');
  assert.ok(k.vehicles.length>0);
  for(const v of k.vehicles){assert.equal(v.vehicle_subtype,'scooter');assert.ok(!prior.has(key(v)));assert.ok(!v.price_reference || v.price_reference.amount_inr<=100000);}
  assert.match(localAnswer('more names',k),/not confirmed within your budget/);
  const cars=await retrieveKnowledge('more car names',[],{catalogContext:contextFor(k)});
  assert.equal(cars.intent.budget_inr,null);
  assert.ok(cars.vehicles.every(v=>v.vehicle_type==='four_wheeler'));
});

test('model-status and battery-rental limitations remain visible in offline answers',async t=>{
  offline(t);
  for(const name of ['Citroen eC3X','Kia Syros EV','Tata Sierra EV']){
    const k=await retrieveKnowledge(name);
    assert.equal(k.vehicles.length,1);
    assert.match(localAnswer(name,k),/unverified name/);
    assert.ok(!k.vehicles[0].battery_capacity);
  }
  const f99=await retrieveKnowledge('Ultraviolette F99');
  assert.match(localAnswer('F99',f99),/racing platform/);
  const mg=await retrieveKnowledge('MG Hector Tomahawk EV price');
  assert.match(localAnswer('price',mg),/₹4.90\/km/);
  assert.match(localAnswer('price',mg),/NOT the full/);
  assert.ok(!mg.vehicles[0].price_reference);
  const rec=await retrieveKnowledge('recommend the best Ultraviolette bike');
  assert.ok(rec.vehicles.every(v=>v.model!=='F99'));
});

test('untrusted pagination payload cannot introduce a URL, fake price or made-up model',()=>{
  const result=cleanCatalogContext({version:1,category:'two_wheeler',brands:['Ather','http://127.0.0.1'],budget_inr:'1',seen:['Tata|Nexon EV','fake','Tata|Nexon EV'],vehicle_subtype:'car'});
  assert.deepEqual(result.brands,['Ather']);assert.equal(result.budget_inr,null);assert.equal(result.vehicle_subtype,null);
  assert.deepEqual(result.seen,['Tata|Nexon EV']);
});

test('live lookup is model-specific, bounded, cached, and never uses navigation-only matches',async t=>{
  offline(t);process.env.EV_LIVE_WEB_ENABLED='true';
  const model=catalog.vehicles.find(v=>v.make==='Kia'&&v.model==='Carens Clavis EV');
  const mock=t.mock.method(global,'fetch',async(url,options)=>{
    assert.equal(url,model.source_url);assert.equal(options.redirect,'error');assert.ok(options.signal);
    return new Response('<html><main><h1>Kia Carens Clavis EV</h1><p>Battery and range are specified separately for each variant. The 42 kWh pack has a manufacturer estimate of 404 km.</p></main></html>',{headers:{'content-type':'text/html'}});
  });
  const first=await retrieveKnowledge('Kia Carens Clavis EV latest range');
  const second=await retrieveKnowledge('Kia Carens Clavis EV latest range');
  assert.equal(first.mode,'live-retrieval');assert.equal(second.pages[0].retrieved_at,first.pages[0].retrieved_at);assert.equal(mock.mock.callCount(),1);
  clearCache();mock.mock.restore();
  t.mock.method(global,'fetch',async()=>new Response('<nav>Kia Carens Clavis EV</nav><main>Other car battery 50 kWh range 400 km. Prices and charging vary by model, region and configuration.</main>',{headers:{'content-type':'text/html'}}));
  assert.equal((await retrieveKnowledge('Kia Carens Clavis EV latest range')).pages.length,0);
});
