import { counterName, type FunnelProps, type TrackEvent } from '../../../convex/funnel';
import { classifyGatewayFailure, type ModelFailure } from './gateway-errors';
import { bumpEvent } from './telemetry';

export type TrackSink = (name: string) => Promise<void> | void;

export const MODEL_ROUTES = ['compose', 'revisions', 'prompt-ideas', 'lookup', 'insight'] as const;

export type ModelRoute = (typeof MODEL_ROUTES)[number];

export type ModelOutcome = 'ok' | ModelFailure;

export type ModelAttemptProps = {
  route: ModelRoute;
  model: string;
  outcome: ModelOutcome;
};

const MODEL_OUTCOMES = new Set<ModelOutcome>(['ok', 'not_found', 'forbidden', 'rate_limit', 'schema', 'error']);

export function modelAttemptCounter(props: ModelAttemptProps | undefined): string | null {
  if (!props || !MODEL_ROUTES.includes(props.route) || !MODEL_OUTCOMES.has(props.outcome)) {
    return null;
  }
  const model = props.model
    .trim()
    .replaceAll('/', '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 40);
  if (!model) {
    return null;
  }
  const name = `model_attempt:${props.route}:${props.outcome}:${model}`;
  return name.length <= 80 ? name : name.slice(0, 80);
}

export async function track(
  event: TrackEvent | 'model_attempt',
  props?: FunnelProps | ModelAttemptProps,
  sink: TrackSink = bumpEvent
): Promise<boolean> {
  const name =
    event === 'model_attempt'
      ? modelAttemptCounter(props as ModelAttemptProps | undefined)
      : counterName(event, props as FunnelProps | undefined);
  if (!name) {
    return false;
  }
  await sink(name);
  return true;
}

export async function trackModelAttempt(
  route: ModelRoute,
  model: string,
  error: unknown | null,
  sink?: TrackSink
): Promise<void> {
  await track(
    'model_attempt',
    { route, model, outcome: error ? classifyGatewayFailure(error) : 'ok' },
    sink
  );
}
