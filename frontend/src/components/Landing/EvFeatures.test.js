import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { EVExplorer } from './EvFeatures';

jest.mock('./BookingForm', () => () => null);
jest.mock('framer-motion', () => {
  const React = require('react');
  const make = tag => React.forwardRef(({ children, initial, animate, exit, transition, whileHover, whileTap, layout, ...props }, ref) => React.createElement(tag, { ...props, ref }, children));
  return { motion: { div: make('div'), form: make('form'), button: make('button') },
    AnimatePresence: ({ children }) => children, useInView: () => true };
});

let root, container, originalFetch;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  originalFetch = global.fetch;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  global.fetch = originalFetch;
});
const brandButton = name => [...container.querySelectorAll('button')].find(b => b.textContent.includes(name));
const response = (make, model) => ({ json: async () => ({ success: true, notice: 'Showing reference catalog. Live vehicle API is not configured.',
  vehicles: [{ make, model, source: 'reference-catalog', source_url: 'https://www.bmw.in/', data_note: 'Reference only' }] }) });

test('BMW renders a reference result, source and usable booking action without live API', async () => {
  global.fetch = jest.fn().mockResolvedValue(response('BMW', 'iX1 LWB'));
  await act(async () => root.render(<EVExplorer />));
  await act(async () => brandButton('BMW').click());
  expect(container.textContent).toContain('iX1 LWB');
  expect(container.textContent).toContain('Live vehicle API is not configured');
  expect(container.textContent).toContain('Not confirmed');
  expect(container.querySelector('a[href="https://www.bmw.in/"]')).not.toBeNull();
  expect(brandButton('Book Test Drive')).toBeDefined();
});

test('a slow previous BMW response cannot overwrite the later Tesla search', async () => {
  let resolveBMW;
  global.fetch = jest.fn().mockImplementationOnce(() => new Promise(resolve => { resolveBMW = resolve; }))
    .mockResolvedValueOnce(response('Tesla', 'Model Y'));
  await act(async () => root.render(<EVExplorer />));
  await act(async () => brandButton('BMW').click());
  await act(async () => brandButton('Tesla').click());
  await act(async () => resolveBMW(response('BMW', 'iX1 LWB')));
  expect(container.textContent).toContain('Model Y');
  expect(container.textContent).not.toContain('iX1 LWB');
});
