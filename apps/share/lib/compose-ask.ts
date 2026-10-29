import { keepsChartSubject } from './seed';

export type ComposeAsk = {
  prompt: string;
  fresh: boolean;
  fillComposer: boolean;
};

export function composeAsk(input: {
  typed: string;
  freshClick: boolean;
  studio: boolean;
  heroExample: string;
  reviseExample: string;
}): ComposeAsk | null {
  const typed = input.typed.trim();
  const hero = input.heroExample.trim();
  const revise = input.reviseExample.trim();
  const demo = input.freshClick || !input.studio ? hero : revise;
  const prompt = typed.length >= 3 ? typed : demo;
  if (prompt.length < 3) {
    return null;
  }
  const fresh = input.freshClick || (input.studio && !keepsChartSubject(prompt));
  return {
    prompt,
    fresh,
    fillComposer: !fresh && typed.length < 3,
  };
}
