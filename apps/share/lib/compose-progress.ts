export type ComposeStage = 'queue' | 'lookup' | 'draft' | 'mint' | 'save' | 'done' | 'error';

export type ComposeProgressEvent = {
  stage: ComposeStage;
  progress: number;
  message: string;
  detail?: string;
  barCount?: number;
  url?: string;
  png?: string;
  token?: string;
  error?: string;
  pay?: boolean;
};

export type ComposeProgressReporter = (event: ComposeProgressEvent) => void;

export function reportProgress(
  onProgress: ComposeProgressReporter | undefined,
  event: ComposeProgressEvent
): void {
  onProgress?.({
    ...event,
    progress: Math.min(100, Math.max(0, Math.round(event.progress))),
  });
}

export function sourceHintFromUrls(urls: string[]): string | undefined {
  const url = urls.find(Boolean);
  if (!url) {
    return undefined;
  }
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return undefined;
  }
}

export function lookupDetail(gathered: { notes: string; urls: string[] }, pastedTable: boolean): string {
  if (pastedTable) {
    return 'Using numbers from your prompt';
  }
  const host = sourceHintFromUrls(gathered.urls);
  if (host && gathered.notes.length > 80) {
    return `Found data on ${host}`;
  }
  if (host) {
    return `Checked ${host}`;
  }
  if (gathered.notes.length > 80) {
    return 'Found notes to chart';
  }
  return 'No published table — estimating shape';
}

/** Guess skeleton bar count from the prompt before draft completes. */
export function guessBarCount(prompt: string): number {
  const asked = prompt.trim();
  const top = asked.match(/\btop\s+(\d{1,2})\b/i);
  if (top) {
    return Math.min(15, Math.max(3, Number.parseInt(top[1] ?? '8', 10)));
  }
  if (/\b(month|monthly|each month|by month)\b/i.test(asked)) {
    return 12;
  }
  if (/\b(line|over time|by year|yearly|since \d{4}|trend)\b/i.test(asked)) {
    return 10;
  }
  if (/\b(countr(y|ies)|nation|team|city|cities|ranking|ranked|by country)\b/i.test(asked)) {
    return 12;
  }
  return 8;
}

export const BUSY_BAR_HEIGHTS = [42, 58, 31, 78, 48, 66, 92, 38, 55, 44, 71, 36, 63, 50, 84] as const;

export function busyBarHeights(count: number): number[] {
  const size = Math.min(15, Math.max(3, count));
  return Array.from({ length: size }, (_, index) => BUSY_BAR_HEIGHTS[index % BUSY_BAR_HEIGHTS.length] ?? 40);
}
