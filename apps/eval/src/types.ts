export const PROMPT_STYLES = [
  'short',
  'time',
  'ranking',
  'compare',
  'pasted',
  'overloaded',
] as const;

export const DATA_SITUATIONS = [
  'lookup_hit',
  'lookup_miss',
  'in_progress',
  'pasted_numbers',
] as const;

export const DOMAINS = ['climate', 'macro', 'sports', 'messy'] as const;

export type PromptStyle = (typeof PROMPT_STYLES)[number];
export type DataSituation = (typeof DATA_SITUATIONS)[number];
export type Domain = (typeof DOMAINS)[number];
export type ChartType = 'bar' | 'line' | 'scatter';
export type SourceMethod =
  | 'official'
  | 'export'
  | 'scraped'
  | 'estimate'
  | 'manual'
  | 'example'
  | 'unknown';

export type EvalPrompt = {
  id: string;
  style: PromptStyle;
  situation: DataSituation;
  domain: Domain;
  prompt: string;
  expectedType: ChartType;
  /** When situation is pasted_numbers, compose must keep these y values (order). */
  expectedYs?: number[];
};

export type EvalDraft = {
  title: string;
  chartType: ChartType;
  xLabel: string;
  yLabel: string;
  sourceLabel: string;
  sourceMethod: SourceMethod;
  sourceUrl?: string;
  evidence: string;
  forecastFrom?: string | number;
  rows: Array<{ x: string | number; y: number }>;
};

export type IssueCode =
  | 'COMPILE'
  | 'AXIS_LETTER'
  | 'PLACEHOLDER_X'
  | 'INVENTED_URL'
  | 'TYPE_MISMATCH'
  | 'TOO_FEW_ROWS'
  | 'PASTED_NUMBERS_IGNORED'
  | 'MISSING_FORECAST'
  | 'LOOKUP_MISS_PRETENDS_PUBLISHED'
  | 'LOOKUP_HIT_UNSOURCED';

export type EvalIssue = {
  code: IssueCode;
  path: string;
  message: string;
};

export type EvalCase = {
  promptId: string;
  model: string;
  seed: number;
  prompt: EvalPrompt;
  draft: EvalDraft;
  pass: boolean;
  issues: EvalIssue[];
};

export type EvalRun = {
  id: string;
  at: string;
  kind: 'canned' | 'compose';
  models: string[];
  repeats: number;
  cases: EvalCase[];
};

export type SliceRate = {
  key: string;
  n: number;
  passed: number;
  rate: number;
};

export type BrittleCell = {
  promptId: string;
  model: string;
  passes: boolean[];
};

export type EvalAggregate = {
  n: number;
  passed: number;
  rate: number;
  byStyle: SliceRate[];
  bySituation: SliceRate[];
  byModel: SliceRate[];
  byDomain: SliceRate[];
  byIssue: Array<{ code: IssueCode; n: number }>;
  brittle: BrittleCell[];
};

export type RecKind = 'fixture' | 'system' | 'rewriter' | 'model_routing';

export type EvalRec = {
  id: string;
  kind: RecKind;
  claim: string;
  evidence: string;
  examplePromptIds: string[];
  suggestedChange: string;
};
