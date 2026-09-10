import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {Simulate} from 'react-dom/test-utils';
import EVChatbot from './EVChatbot';
const firstContext={version:1,category:'two_wheeler',vehicle_subtype:'scooter',brands:[],budget_inr:100000,seen:['TVS|Orbiter 3.1 kWh']};
let container,root,originalFetch,originalScroll;
beforeEach(()=>{
  global.IS_REACT_ACT_ENVIRONMENT=true;
  originalFetch=global.fetch;originalScroll=HTMLElement.prototype.scrollTo;
  HTMLElement.prototype.scrollTo=jest.fn();
  container=document.createElement('div');document.body.appendChild(container);root=createRoot(container);
});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();global.fetch=originalFetch;HTMLElement.prototype.scrollTo=originalScroll;});
async function open(){await act(async()=>root.render(<EVChatbot/>));await act(async()=>container.querySelector('.ev-chat-launcher').click());}
async function send(text){await act(async()=>Simulate.change(container.querySelector('textarea'),{target:{value:text}}));await act(async()=>container.querySelector('.ev-send-button').click());}

test('more-model context survives RAG-to-Node fallback, renders source links and resets with new chat',async()=>{
  const requests=[];
  global.fetch=jest.fn(async(url,options)=>{
    if(url.endsWith('/health'))return {ok:true,json:async()=>({ready:true,mode:'catalog'})};
    const body=JSON.parse(options.body);requests.push({url,body});
    if(body.message==='more names'&&url.includes(':8000'))return {ok:false,status:503,json:async()=>({detail:'temporary failure'})};
    return {ok:true,json:async()=>({answer:'**TVS Orbiter**\n[Manufacturer source](https://www.tvsmotor.com/electric-scooters/tvs-orbiter)\n[bad](javascript:alert)',response:'**More scooter names**',mode:'catalog',catalog_context:firstContext})};
  });
  await open();await send('best scooter under 1 lakh');
  expect(container.querySelector('a[href^="https://www.tvsmotor.com"]').textContent).toBe('Manufacturer source');
  expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
  await send('more names');
  const followups=requests.filter(r=>r.body.message==='more names');
  expect(followups).toHaveLength(2);
  followups.forEach(r=>expect(r.body.catalog_context).toEqual(firstContext));
  expect(followups[1].body.catalogOnly).toBe(true);
  await act(async()=>container.querySelector('[aria-label="New chat and retry connection"]').click());
  await send('show car names');
  expect(requests[requests.length-1].body.catalog_context).toBeNull();
});

test('an in-flight old reply cannot restore cleared conversation context',async()=>{
  let release;
  global.fetch=jest.fn(async(url)=>url.endsWith('/health')?{ok:true,json:async()=>({ready:true,mode:'catalog'})}:new Promise(resolve=>{release=resolve;}));
  await open();await send('old question');
  await act(async()=>container.querySelector('[aria-label="New chat and retry connection"]').click());
  await act(async()=>release({ok:true,json:async()=>({answer:'STALE ANSWER',mode:'catalog',catalog_context:firstContext})}));
  expect(container.textContent).not.toContain('STALE ANSWER');
  expect(container.querySelector('textarea').disabled).toBe(false);
});
