const pending = new Set<Promise<unknown>>();

/**
 * Tracks an in-flight diagram render so handleExportPdf (App.tsx) can wait for
 * it before calling window.print() — otherwise a diagram mid-render at export
 * time would print as its loading skeleton.
 */
export function registerPendingRender(render: Promise<unknown>): void {
  pending.add(render);
  const untrack = () => pending.delete(render);
  render.then(untrack, untrack);
}

export async function waitForPendingRenders(maxWaitMs: number): Promise<void> {
  if (pending.size === 0) return;

  const allSettled = Promise.allSettled(Array.from(pending)).then(() => undefined);
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, maxWaitMs));
  await Promise.race([allSettled, timeout]);
}
