'use client';

import { FAST_EXAMPLES } from '../../lib/fast-examples';

export function FastExamples({
  onPick,
  disabled = false,
}: {
  onPick: (prompt: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="fast-examples" aria-label="Example questions">
      {FAST_EXAMPLES.map((example) => (
        <button
          key={example.id}
          type="button"
          className="fast-example"
          disabled={disabled}
          onClick={() => onPick(example.prompt)}
        >
          {example.label}
        </button>
      ))}
    </div>
  );
}
