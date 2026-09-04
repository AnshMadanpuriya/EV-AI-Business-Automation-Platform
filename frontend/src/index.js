import React from 'react';
import ReactDOM from 'react-dom/client';

import './index.css';

import App from './App';
import EVChatbot from './components/EVChatbot';
import EVVoiceAgent from './components/EVVoiceAgent';
import WhatsAppButton from './components/WhatsAppButton';

const root = ReactDOM.createRoot(
  document.getElementById('root')
);

root.render(
  <React.StrictMode>
    <App />
    <EVChatbot />
    <WhatsAppButton />
    <EVVoiceAgent />
  </React.StrictMode>
);
