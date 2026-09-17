import { describe, expect, it } from 'vitest';
import { agentPastePrompt } from './agent-paste';

describe('agentPastePrompt', () => {
  it('points ChatGPT at the public compose contract', () => {
    const prompt = agentPastePrompt();
    expect(prompt).toContain('https://vizzy.run/llms.txt');
    expect(prompt).toContain('https://vizzy.run/api/compose');
    expect(prompt).toContain('Do not invent D3');
  });
});
