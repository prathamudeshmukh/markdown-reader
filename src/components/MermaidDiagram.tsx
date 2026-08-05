import { useEffect, useRef, useState } from 'react';
import { renderMermaidToDataUrl } from '../diagrams/mermaidRenderer';
import { registerPendingRender } from '../diagrams/pendingDiagramRenders';
import { track } from '../telemetry';
import type { PreviewThemeId } from '../themes/previewThemes';
import DiagramLightbox from './DiagramLightbox';

const RERENDER_DEBOUNCE_MS = 400;

type DiagramState =
  | { status: 'loading' }
  | { status: 'success'; dataUrl: string }
  | { status: 'error'; message: string };

interface MermaidDiagramProps {
  source: string;
  theme: PreviewThemeId;
}

export default function MermaidDiagram({ source, theme }: MermaidDiagramProps) {
  const [state, setState] = useState<DiagramState>({ status: 'loading' });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const generationRef = useRef(0);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    const generation = ++generationRef.current;
    const isFirstRender = !hasMountedRef.current;
    hasMountedRef.current = true;

    function startRender() {
      setState({ status: 'loading' });
      const renderPromise = renderMermaidToDataUrl(source, theme);
      registerPendingRender(renderPromise);

      renderPromise.then(
        (dataUrl) => {
          if (generationRef.current !== generation) return;
          setState({ status: 'success', dataUrl });
        },
        (err: unknown) => {
          if (generationRef.current !== generation) return;
          const message = err instanceof Error ? err.message : 'Failed to render diagram';
          setState({ status: 'error', message });
          track('diagram_render_failed', { error_type: 'invalid_syntax' });
        },
      );
    }

    if (isFirstRender) {
      startRender();
      return;
    }

    const timer = setTimeout(startRender, RERENDER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [source, theme]);

  if (state.status === 'loading') {
    return (
      <div
        data-testid="diagram-skeleton"
        role="status"
        aria-label="Rendering diagram"
        className="my-4 rounded-lg animate-pulse"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', height: '160px' }}
      />
    );
  }

  if (state.status === 'error') {
    return (
      <div
        role="alert"
        className="my-4 rounded-lg p-4 text-sm"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      >
        <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Couldn&apos;t render this diagram
        </p>
        <p className="mb-3" style={{ color: 'var(--text-muted)' }}>
          {state.message}
        </p>
        <details>
          <summary className="cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            Show diagram source
          </summary>
          <pre className="mt-2 whitespace-pre-wrap text-xs" style={{ color: 'var(--text-secondary)' }}>
            {source}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <>
      <img
        src={state.dataUrl}
        alt="Mermaid diagram"
        className="my-4 mx-auto block max-w-full h-auto cursor-zoom-in rounded-lg"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        onClick={() => setLightboxOpen(true)}
      />
      {lightboxOpen && (
        <DiagramLightbox src={state.dataUrl} alt="Mermaid diagram" onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
}
