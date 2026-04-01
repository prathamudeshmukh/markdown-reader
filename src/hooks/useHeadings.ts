import { useMemo, useState, useEffect, type RefObject } from 'react';
import { extractHeadings, type Heading } from '../utils/headings';

interface UseHeadingsResult {
  headings: Heading[];
  activeId: string | null;
}

export function useHeadings(
  markdownText: string,
  scrollContainerRef: RefObject<HTMLElement | null>,
): UseHeadingsResult {
  const headings = useMemo(() => extractHeadings(markdownText), [markdownText]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (headings.length === 0) {
      setActiveId(null);
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) return;

    const headingEls = headings
      .map((h) => container.querySelector<HTMLElement>(`#${CSS.escape(h.id)}`))
      .filter((el): el is HTMLElement => el !== null);

    if (headingEls.length === 0) return;

    // Track which headings are currently intersecting
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).id;
          if (entry.isIntersecting) {
            visible.add(id);
          } else {
            visible.delete(id);
          }
        }
        // Pick the topmost visible heading (first in DOM order)
        const first = headingEls.find((el) => visible.has(el.id));
        if (first) setActiveId(first.id);
      },
      { root: container, rootMargin: '0px 0px -80% 0px', threshold: 0 },
    );

    for (const el of headingEls) observer.observe(el);
    return () => observer.disconnect();
  }, [headings, scrollContainerRef]);

  return { headings, activeId };
}
