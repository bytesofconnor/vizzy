export function ComposeBox({ error }: { error?: string }) {
  return (
    <form action="/api/compose" method="post" style={{ marginTop: 28, maxWidth: 560 }}>
      <label
        htmlFor="prompt"
        style={{
          display: 'block',
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--mute)',
          marginBottom: 10,
        }}
      >
        Make one
      </label>
      <textarea
        id="prompt"
        name="prompt"
        required
        minLength={3}
        maxLength={4000}
        rows={4}
        placeholder="July cash by month, or paste a table"
        style={{
          display: 'block',
          width: '100%',
          resize: 'vertical',
          border: 0,
          borderBottom: '1px solid var(--rule)',
          background: 'transparent',
          color: 'var(--ink)',
          font: 'inherit',
          fontSize: 16,
          lineHeight: 1.45,
          padding: '0 0 10px',
          outline: 'none',
        }}
      />
      <p style={{ margin: '12px 0 0' }}>
        <button type="submit">Make chart</button>
      </p>
      {error ? (
        <p
          style={{
            fontFamily: 'var(--font-mono), ui-monospace, monospace',
            fontSize: 12,
            color: 'var(--mute)',
            margin: '10px 0 0',
          }}
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
