import { counterName, type FunnelEvent, type FunnelProps } from '../../../convex/funnel';
import { bumpEvent } from './telemetry';

export type TrackSink = (name: string) => Promise<void> | void;

export async function track(
  event: FunnelEvent,
  props?: FunnelProps,
  sink: TrackSink = bumpEvent
): Promise<boolean> {
  const name = counterName(event, props);
  if (!name) {
    return false;
  }
  await sink(name);
  return true;
}
