'use client';

import type { ChartSeed } from '../../lib/seed';
import { TellMeMore } from './TellMeMore';

export function ChartExtras({
  seed,
  presetInsight,
  onInsight,
}: {
  seed: ChartSeed;
  presetInsight?: string;
  onInsight: (insight: string | null) => void;
}) {
  return <TellMeMore seed={seed} presetInsight={presetInsight} onInsight={onInsight} />;
}
