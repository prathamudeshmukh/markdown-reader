import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerPendingRender, waitForPendingRenders } from './pendingDiagramRenders';

describe('pendingDiagramRenders', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('resolves immediately when nothing is pending', async () => {
    await expect(waitForPendingRenders(1000)).resolves.toBeUndefined();
  });

  it('waits for a registered render to settle before resolving', async () => {
    let resolveRender!: () => void;
    const renderPromise = new Promise<void>((resolve) => {
      resolveRender = resolve;
    });
    registerPendingRender(renderPromise);

    let waitResolved = false;
    const waitPromise = waitForPendingRenders(5000).then(() => {
      waitResolved = true;
    });

    await Promise.resolve();
    expect(waitResolved).toBe(false);

    resolveRender();
    await waitPromise;
    expect(waitResolved).toBe(true);
  });

  it('does not hang forever on a render that rejects', async () => {
    const renderPromise = Promise.reject(new Error('mermaid render failed'));
    registerPendingRender(renderPromise);

    await expect(waitForPendingRenders(1000)).resolves.toBeUndefined();
  });

  it('stops tracking a render once it settles, so a later wait is instant', async () => {
    const renderPromise = Promise.resolve();
    registerPendingRender(renderPromise);
    await renderPromise;
    await Promise.resolve();

    const start = Date.now();
    await waitForPendingRenders(5000);
    expect(Date.now() - start).toBeLessThan(50);
  });

  // Registers a render that never settles, permanently leaking an entry into
  // the module-level registry — keep this test last in the file.
  it('gives up after maxWaitMs when a render never settles', async () => {
    vi.useFakeTimers();
    const neverSettles = new Promise<void>(() => {});
    registerPendingRender(neverSettles);

    const waitPromise = waitForPendingRenders(2000);
    await vi.advanceTimersByTimeAsync(2000);

    await expect(waitPromise).resolves.toBeUndefined();
  });
});
