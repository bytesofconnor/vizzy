import type { ClientPiece } from './compose-progress';

export const COMPOSE_DISPOSITIONS = ['ask', 'send'] as const;

export type ComposeDisposition = (typeof COMPOSE_DISPOSITIONS)[number];

export type ClarifyOption = {
  readonly label: string;
  readonly prompt: string;
};

export type OneToThree<T> = readonly [T] | readonly [T, T] | readonly [T, T, T];

export type ClarifyAsk = {
  readonly question: string;
  readonly options: OneToThree<ClarifyOption>;
};

export type ComposeOutcome =
  | {
      readonly kind: 'chart';
      readonly url: string;
      readonly png?: string;
      readonly token?: string;
      readonly piece?: ClientPiece;
    }
  | { readonly kind: 'clarify'; readonly ask: ClarifyAsk }
  | { readonly kind: 'fail'; readonly error: string; readonly pay?: boolean };

const FAIL_ERROR = 'Could not generate that chart';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function oneToThree(options: readonly ClarifyOption[]): OneToThree<ClarifyOption> | undefined {
  if (options.length === 1) {
    return [options[0]!];
  }
  if (options.length === 2) {
    return [options[0]!, options[1]!];
  }
  if (options.length === 3) {
    return [options[0]!, options[1]!, options[2]!];
  }
  return undefined;
}

function readOptions(value: unknown): OneToThree<ClarifyOption> | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const options: ClarifyOption[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.label !== 'string' || typeof item.prompt !== 'string') {
      return undefined;
    }
    options.push({ label: item.label, prompt: item.prompt });
  }
  return oneToThree(options);
}

function readAsk(value: unknown): ClarifyAsk | undefined {
  if (!isRecord(value) || typeof value.question !== 'string') {
    return undefined;
  }
  const options = readOptions(value.options);
  if (!options) {
    return undefined;
  }
  return { question: value.question, options };
}

function readPiece(value: unknown): ClientPiece | undefined {
  if (!isRecord(value) || typeof value.slug !== 'string' || typeof value.title !== 'string' || !Array.isArray(value.data)) {
    return undefined;
  }
  return value as ClientPiece;
}

function failError(body: Record<string, unknown>): string {
  return typeof body.error === 'string' && body.error.length > 0 ? body.error : FAIL_ERROR;
}

export function readComposeOutcome(body: unknown): ComposeOutcome {
  if (!isRecord(body)) {
    return { kind: 'fail', error: FAIL_ERROR };
  }
  const url = typeof body.url === 'string' ? body.url : undefined;
  const clarifyPresent = 'clarify' in body && body.clarify != null;
  if (url && clarifyPresent) {
    return { kind: 'fail', error: failError(body) };
  }
  if (body.ok === true && url && !clarifyPresent) {
    const piece = readPiece(body.piece);
    return {
      kind: 'chart',
      url,
      ...(typeof body.png === 'string' ? { png: body.png } : {}),
      ...(typeof body.token === 'string' ? { token: body.token } : {}),
      ...(piece ? { piece } : {}),
    };
  }
  const ask = readAsk(body.clarify);
  if (ask && !url) {
    return { kind: 'clarify', ask };
  }
  return { kind: 'fail', error: failError(body) };
}
