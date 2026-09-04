import React from 'react';

import './WhatsAppButton.css';

const WHATSAPP_NUMBER = '919343144870';
const SMART_MESSAGE = [
  'Namaste TataEV team! 👋',
  'I am visiting your EV AI website and would like help choosing an electric vehicle.',
  'Please share suitable models, range, pricing and test-drive options.',
].join('\n');

const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(SMART_MESSAGE)}`;

function WhatsAppIcon() {
  return (
    <svg
      aria-hidden="true"
      className="whatsapp-smart-chat__icon"
      viewBox="0 0 32 32"
      fill="none"
    >
      <path
        d="M16 4.25c-6.49 0-11.75 5.04-11.75 11.25 0 2.31.73 4.46 1.98 6.25L4.5 27.75l6.25-1.64a12.1 12.1 0 0 0 5.25 1.19c6.49 0 11.75-5.04 11.75-11.25S22.49 4.25 16 4.25Z"
        fill="white"
      />
      <path
        d="M12.24 10.37c.22-.48.45-.49.66-.5h.56c.18 0 .46.07.7.58.24.5.82 1.97.89 2.11.08.14.12.31.03.49-.08.18-.13.29-.27.45-.14.16-.29.35-.41.46-.14.13-.28.27-.12.55.16.27.71 1.12 1.53 1.81 1.05.89 1.93 1.17 2.21 1.3.28.14.44.12.61-.07.16-.18.7-.78.89-1.05.18-.27.37-.23.62-.14.26.09 1.63.74 1.91.87.28.14.46.2.53.32.07.11.07.65-.16 1.27-.23.62-1.35 1.18-1.86 1.25-.47.07-1.07.1-1.72-.1-.4-.12-.91-.28-1.56-.55-.65-.27-2.85-1.01-4.86-2.91-1.57-1.48-2.63-3.31-2.94-3.87-.3-.56-.03-1.73.23-2.23Z"
        fill="#18b957"
      />
    </svg>
  );
}

export default function WhatsAppButton() {
  return (
    <a
      className="whatsapp-smart-chat"
      href={WHATSAPP_URL}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Chat with TataEV on WhatsApp"
      title="Chat with TataEV on WhatsApp"
    >
      <span className="whatsapp-smart-chat__icon-wrap">
        <WhatsAppIcon />
      </span>
    </a>
  );
}
