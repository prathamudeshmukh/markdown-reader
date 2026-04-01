import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useHeadings } from './useHeadings';

// Minimal IntersectionObserver stub
function makeObserverStub(triggerEntries: { id: string; isIntersecting: boolean }[] = []) {
  return class {
    callback: IntersectionObserverCallback;
    constructor(cb: IntersectionObserverCallback) {
      this.callback = cb;
    }
    observe(el: Element) {
      if (triggerEntries.some((e) => e.id === (el as HTMLElement).id)) {
        const entry = triggerEntries.find((e) => e.id === (el as HTMLElement).id)!;
        this.callback(
          [{ target: el, isIntersecting: entry.isIntersecting } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }
    }
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds = [];
  };
}

describe('useHeadings', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty headings for blank markdown', () => {
    vi.stubGlobal('IntersectionObserver', makeObserverStub());
    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement>(null);
      return useHeadings('', ref);
    });
    expect(result.current.headings).toEqual([]);
    expect(result.current.activeId).toBeNull();
  });

  it('extracts headings from markdown', () => {
    vi.stubGlobal('IntersectionObserver', makeObserverStub());
    const md = '## Section One\n\n### Sub Section';
    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement>(null);
      return useHeadings(md, ref);
    });
    expect(result.current.headings).toHaveLength(2);
    expect(result.current.headings[0].text).toBe('Section One');
    expect(result.current.headings[1].text).toBe('Sub Section');
  });

  it('re-derives headings when markdownText changes', () => {
    vi.stubGlobal('IntersectionObserver', makeObserverStub());
    let md = '## First';
    const { result, rerender } = renderHook(({ text }: { text: string }) => {
      const ref = useRef<HTMLElement>(null);
      return useHeadings(text, ref);
    }, { initialProps: { text: md } });

    expect(result.current.headings).toHaveLength(1);

    md = '## First\n\n## Second';
    rerender({ text: md });
    expect(result.current.headings).toHaveLength(2);
  });

  it('sets activeId when a heading element is intersecting', () => {
    // Build a real container with a heading element
    const container = document.createElement('div');
    const h2 = document.createElement('h2');
    h2.id = 'section-one';
    container.appendChild(h2);

    vi.stubGlobal(
      'IntersectionObserver',
      makeObserverStub([{ id: 'section-one', isIntersecting: true }]),
    );

    const { result } = renderHook(() => {
      const ref = { current: container } as React.RefObject<HTMLElement>;
      return useHeadings('## Section One', ref);
    });

    expect(result.current.activeId).toBe('section-one');
  });
});
