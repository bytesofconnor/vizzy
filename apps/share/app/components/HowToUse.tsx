export function HowToUse() {
  return (
    <section
      id="make-one"
      style={{
        marginTop: 72,
        paddingTop: 36,
        borderTop: '1px solid var(--rule)',
        maxWidth: 540,
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--mute)',
          margin: 0,
        }}
      >
        Make one
      </p>
      <p style={{ fontSize: 15, lineHeight: 1.5, margin: '10px 0 0' }}>
        Ask a chat to chart your table and publish it with Vizzy. You get a link. Copy the image.
      </p>
    </section>
  );
}
