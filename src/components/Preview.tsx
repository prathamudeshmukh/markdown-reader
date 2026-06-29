import { useEffect, useRef, forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import type { PreviewThemeId } from '../themes/previewThemes';
import type { Comment } from '../types/comments';

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [['className', 'hljs', /^language-/]],
    span: [['className', /^hljs-/]],
    input: ['checked', 'disabled', 'type'],
  },
  tagNames: [...(defaultSchema.tagNames ?? []), 'input'],
};

const MAX_ANCHOR_CHARS = 500;
const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_THRESHOLD = 10;
const BLOCK_ELEMENTS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'TD']);

interface PreviewProps {
  content: string;
  theme?: PreviewThemeId;
  comments?: Comment[];
  onSelectionChange?: (text: string | null) => void;
  onLongPress?: (anchorText: string | null, coords: { x: number; y: number }) => void;
  onAnchorClick?: (commentIds: string[], rect: DOMRect) => void;
}

function applyHighlights(container: HTMLElement, comments: Comment[]): void {
  // Clean up existing comment-anchor marks
  const existingMarks = container.querySelectorAll('mark.comment-anchor');
  existingMarks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
  });

  const commentsWithAnchor = comments.filter((c) => c.anchorText !== null && !c.resolved);
  if (commentsWithAnchor.length === 0) return;

  // Group comments by anchorText
  const anchorMap = new Map<string, string[]>();
  for (const c of commentsWithAnchor) {
    if (!c.anchorText) continue;
    const existing = anchorMap.get(c.anchorText) ?? [];
    anchorMap.set(c.anchorText, [...existing, c.id]);
  }

  // Walk text nodes and wrap matches
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    textNodes.push(node);
  }

  for (const [anchorText, ids] of anchorMap) {
    for (const textNode of textNodes) {
      const text = textNode.textContent ?? '';
      const idx = text.indexOf(anchorText);
      if (idx === -1) continue;

      const before = text.slice(0, idx);
      const after = text.slice(idx + anchorText.length);

      const mark = document.createElement('mark');
      mark.className = 'comment-anchor';
      mark.dataset.commentIds = ids.join(',');
      mark.textContent = anchorText;
      mark.style.backgroundColor = 'color-mix(in srgb, #facc15 40%, transparent)';
      mark.style.borderRadius = '2px';
      mark.style.cursor = 'pointer';

      const parent = textNode.parentNode;
      if (!parent) continue;

      if (before) parent.insertBefore(document.createTextNode(before), textNode);
      parent.insertBefore(mark, textNode);
      if (after) parent.insertBefore(document.createTextNode(after), textNode);
      parent.removeChild(textNode);
      break;
    }
  }
}

function findNearestBlockText(element: Element): string | null {
  let el: Element | null = element;
  while (el) {
    if (BLOCK_ELEMENTS.has(el.tagName)) {
      const text = (el.textContent ?? '').trim().slice(0, MAX_ANCHOR_CHARS);
      return text.length > 0 ? text : null;
    }
    el = el.parentElement;
  }
  return null;
}

const Preview = forwardRef<HTMLDivElement, PreviewProps>(function Preview(
  { content, theme = 'default', comments = [], onSelectionChange, onLongPress, onAnchorClick },
  ref,
) {
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = (ref as React.RefObject<HTMLDivElement>) ?? internalRef;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    applyHighlights(el, comments);
  }, [comments, content, containerRef]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function handleMouseUp() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        onSelectionChange?.(null);
        return;
      }
      const range = selection.getRangeAt(0);
      if (!el!.contains(range.commonAncestorContainer)) {
        onSelectionChange?.(null);
        return;
      }
      const text = selection.toString().trim().slice(0, MAX_ANCHOR_CHARS);
      onSelectionChange?.(text.length > 0 ? text : null);
    }

    el.addEventListener('mouseup', handleMouseUp);
    return () => el.removeEventListener('mouseup', handleMouseUp);
  }, [onSelectionChange, containerRef]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onLongPress) return;

    let timerId: ReturnType<typeof setTimeout> | null = null;
    let startX = 0;
    let startY = 0;

    function handleTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      timerId = setTimeout(() => {
        const target = document.elementFromPoint(startX, startY);
        const anchorText = target ? findNearestBlockText(target) : null;
        onLongPress?.(anchorText, { x: startX, y: startY });
        timerId = null;
      }, LONG_PRESS_MS);
    }

    function handleTouchMove(e: TouchEvent) {
      if (!timerId) return;
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - startX);
      const dy = Math.abs(touch.clientY - startY);
      if (dx > LONG_PRESS_MOVE_THRESHOLD || dy > LONG_PRESS_MOVE_THRESHOLD) {
        clearTimeout(timerId);
        timerId = null;
      }
    }

    function handleTouchEnd() {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
    }

    el.addEventListener('touchstart', handleTouchStart);
    el.addEventListener('touchmove', handleTouchMove);
    el.addEventListener('touchend', handleTouchEnd);
    return () => {
      if (timerId) clearTimeout(timerId);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onLongPress, containerRef]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onAnchorClick) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as Element;
      const mark = target.closest?.('mark.comment-anchor');
      if (!mark) return;
      const ids = (mark as HTMLElement).dataset.commentIds?.split(',') ?? [];
      if (ids.length > 0) {
        onAnchorClick?.(ids, mark.getBoundingClientRect());
      }
    }

    el.addEventListener('click', handleClick);
    return () => el.removeEventListener('click', handleClick);
  }, [onAnchorClick, containerRef]);

  if (!content.trim()) {
    return (
      <div
        className="flex-1 flex items-center justify-center text-sm animate-fade-in"
        style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-primary)' }}
      >
        Nothing to preview — switch to editor mode to add content.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto animate-mode-enter"
      style={{ backgroundColor: 'var(--bg-primary)', touchAction: 'pan-y' }}
      data-preview-theme={theme}
    >
      <div className="max-w-3xl mx-auto px-3 sm:px-10 pt-4 pb-10 prose prose-sm sm:prose-base font-mono">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight, [rehypeSanitize, sanitizeSchema]]}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
});

export default Preview;
