import React, { useEffect, useRef, useState } from 'react';

import './EVVoiceAgent.css';

const AGENT_ID = 'agent_6701knpzdtj4fjy85jkrc0kbqye9';

export default function EVVoiceAgent() {
  const widgetRef = useRef(null);
  const [initialStateReady, setInitialStateReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timerId;
    let attempts = 0;
    let dismissRequested = false;

    const finish = () => {
      if (!cancelled) setInitialStateReady(true);
    };

    const closeWidget = () => {
      if (cancelled) return;

      const shadowRoot = widgetRef.current?.shadowRoot;
      const closedLauncher = shadowRoot?.querySelector(
        'button[aria-label="Open chat"]',
      );

      if (closedLauncher) {
        finish();
        return;
      }

      const dismissButton = shadowRoot?.querySelector(
        'button[aria-label="Dismiss"]',
      );

      if (dismissButton && !dismissRequested) {
        dismissRequested = true;
        dismissButton.click();
      }

      attempts += 1;

      if (attempts < 120) {
        timerId = window.setTimeout(closeWidget, 100);
      } else {
        finish();
      }
    };

    if (window.customElements?.get('elevenlabs-convai')) {
      closeWidget();
    } else if (window.customElements) {
      window.customElements.whenDefined('elevenlabs-convai').then(closeWidget);
    } else {
      finish();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, []);

  return React.createElement('elevenlabs-convai', {
    ref: widgetRef,
    id: 'tataev-voice-agent',
    'agent-id': AGENT_ID,
    variant: 'compact',
    placement: 'bottom-right',
    dismissible: 'true',
    'default-expanded': 'false',
    'always-expanded': 'false',
    'data-initial-state': initialStateReady ? 'closed' : 'loading',
    'aria-label': 'Start a call with the TataEV Voice Agent',
  });
}
