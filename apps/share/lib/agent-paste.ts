import { publicOrigin } from './site';

/** Copied into ChatGPT / Claude. Always vizzy.run so the model hits production. */
export function agentPastePrompt(): string {
  const origin = publicOrigin();
  return [
    'I need a chart I can paste: a public URL plus a PNG, with the source on the image.',
    `Read ${origin}/llms.txt, then POST ${origin}/api/compose with JSON { "prompt": "<the question>" }.`,
    'Bar, line, or scatter only. Gather real rows. Do not invent D3 or a source URL.',
  ].join('\n');
}
