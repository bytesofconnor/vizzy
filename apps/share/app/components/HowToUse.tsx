'use client';

import { useState } from 'react';

const SHARE = 'https://vizzy-ruddy.vercel.app';

const MCP_SNIPPET = `{
  "mcpServers": {
    "vizzy": {
      "command": "npx",
      "args": ["-y", "tsx", "apps/mcp/src/cli.ts"],
      "cwd": "/path/to/vizzy",
      "env": {
        "VIZZY_SHARE_URL": "${SHARE}"
      }
    }
  }
}`;

const PROMPT =
  'Chart this table and publish it with Vizzy. Attach a source. Do not invent one.';

const line = {
  fontFamily: 'var(--font-mono), ui-monospace, monospace' as const,
  fontSize: 12,
  lineHeight: 1.55,
};

const step = {
  ...line,
  color: 'var(--mute)' as const,
  margin: '0 0 10px',
  maxWidth: 560,
};

export function HowToUse() {
  const [copied, setCopied] = useState<'mcp' | 'prompt' | null>(null);

  async function copy(label: 'mcp' | 'prompt', text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <section
      id="make-one"
      style={{
        marginTop: 28,
        paddingTop: 24,
        borderTop: '1px solid var(--rule)',
        maxWidth: 560,
      }}
    >
      <p
        style={{
          ...line,
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--mute)',
          margin: 0,
        }}
      >
        What you do
      </p>
      <p style={{ fontSize: 15, lineHeight: 1.5, margin: '10px 0 16px' }}>
        Do not paste this website into Claude. This page is only the picture. You add Vizzy as an MCP{' '}
        <em style={{ fontStyle: 'normal', color: 'var(--ink)' }}>tool</em> in your chat app. Once.
      </p>
      <p style={step}>
        1. Clone{' '}
        <a href="https://github.com/bytesofconnor/vizzy">github.com/bytesofconnor/vizzy</a>.
      </p>
      <p style={step}>
        2. Open MCP settings — Claude Desktop: Settings → Developer → Edit Config. Cursor: Settings →
        MCP. Not the claude.ai website.
      </p>
      <p style={step}>
        3. Paste the JSON below. Set <code style={{ color: 'var(--ink)' }}>cwd</code> to that clone.
        Restart the chat.
      </p>
      <p style={step}>
        4. Say: chart this table and publish it with Vizzy. You get a link here. Copy the image.
      </p>
      <pre
        style={{
          ...line,
          margin: '16px 0 10px',
          padding: 16,
          background: '#e4e2db',
          overflowX: 'auto',
          color: 'var(--ink)',
        }}
      >
        {MCP_SNIPPET}
      </pre>
      <p style={{ ...line, margin: 0 }}>
        <button type="button" onClick={() => copy('mcp', MCP_SNIPPET)}>
          {copied === 'mcp' ? 'Copied config' : 'Copy MCP config'}
        </button>
        <span style={{ color: 'var(--rule)', margin: '0 12px' }}>/</span>
        <button type="button" onClick={() => copy('prompt', PROMPT)}>
          {copied === 'prompt' ? 'Copied prompt' : 'Copy a prompt'}
        </button>
      </p>
    </section>
  );
}
