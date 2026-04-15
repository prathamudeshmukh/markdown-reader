// Decorative chrome for bottom-sheet sidebars on mobile:
// a gradient top rule that mirrors the bottom bar design, and a drag handle pill.
export default function MobileSheetChrome() {
  return (
    <>
      <div
        aria-hidden="true"
        className="sm:hidden shrink-0"
        style={{
          height: '1px',
          background: 'linear-gradient(90deg, var(--border) 0%, color-mix(in srgb, var(--accent) 60%, var(--border)) 50%, var(--border) 100%)',
          opacity: 0.7,
        }}
      />
      <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0" aria-hidden="true">
        <div className="w-9 h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
      </div>
    </>
  );
}
