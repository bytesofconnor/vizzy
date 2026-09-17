'use client';

import { useState } from 'react';
import { agentPastePrompt } from '../../lib/agent-paste';

export function AgentPaste() {
  const [copied, setCopied] = useState(false);
  const prompt = agentPastePrompt();

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      void fetch('/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'copy_agent_paste' }),
        keepalive: true,
      });
    } catch {
      setCopied(false);
    }
  }

  return (
    <aside className="agent-paste" id="chatgpt" aria-label="Prompt for ChatGPT or Claude">
      <p className="agent-paste-line">
        Already in ChatGPT or Claude?{' '}
        <button type="button" className="agent-paste-copy" onClick={() => void copy()}>
          {copied ? 'Copied' : 'Copy a Vizzy prompt'}
        </button>
      </p>
    </aside>
  );
}
