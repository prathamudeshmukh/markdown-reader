import type { BeautifyResult, BeautifyNode } from '../ai/beautifyTypes';
import HeroNode from './beautify/HeroNode';
import ProseNode from './beautify/ProseNode';
import CardsNode from './beautify/CardsNode';
import CalloutNode from './beautify/CalloutNode';
import TimelineNode from './beautify/TimelineNode';
import ComparisonTableNode from './beautify/ComparisonTableNode';
import FaqNode from './beautify/FaqNode';
import StatsNode from './beautify/StatsNode';
import SectionDividerNode from './beautify/SectionDividerNode';

interface BeautifyViewProps {
  result: BeautifyResult | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  isStale: boolean;
  user: { id: string } | null | undefined;
  onRerun: () => void;
}

function renderNode(node: BeautifyNode, i: number) {
  switch (node.type) {
    case 'hero':             return <HeroNode key={i} {...node} />;
    case 'prose':            return <ProseNode key={i} {...node} />;
    case 'cards':            return <CardsNode key={i} {...node} />;
    case 'callout':          return <CalloutNode key={i} {...node} />;
    case 'timeline':         return <TimelineNode key={i} {...node} />;
    case 'comparison-table': return <ComparisonTableNode key={i} {...node} />;
    case 'faq':              return <FaqNode key={i} {...node} />;
    case 'stats':            return <StatsNode key={i} {...node} />;
    case 'section-divider':  return <SectionDividerNode key={i} {...node} />;
  }
}

function LoadingSkeleton() {
  return (
    <div role="status" aria-label="Loading beautified view" className="animate-pulse space-y-4 p-6 max-w-3xl mx-auto">
      <div className="h-8 rounded-lg w-1/2 mx-auto" style={{ backgroundColor: 'var(--bg-secondary)' }} />
      <div className="h-4 rounded w-3/4 mx-auto" style={{ backgroundColor: 'var(--bg-secondary)' }} />
      <div className="grid grid-cols-3 gap-4 mt-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }} />
        ))}
      </div>
      <div className="space-y-2 mt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-3 rounded" style={{ backgroundColor: 'var(--bg-secondary)', width: `${85 - i * 10}%` }} />
        ))}
      </div>
    </div>
  );
}

function StaleBanner({ onRerun }: { onRerun: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
      style={{
        backgroundColor: 'var(--bg-elevated, var(--bg-secondary))',
        borderBottom: '1px solid var(--border)',
        color: 'var(--text-secondary)',
      }}
    >
      <span>Content has changed since the last AI run.</span>
      <button
        onClick={onRerun}
        className="shrink-0 px-3 py-1 text-xs font-medium rounded-full transition-colors"
        style={{
          backgroundColor: 'var(--accent)',
          color: '#fff',
          border: 'none',
        }}
      >
        Re-run AI
      </button>
    </div>
  );
}

export default function BeautifyView({ result, status, error, isStale, user, onRerun }: BeautifyViewProps) {
  return (
    <div className="flex-1 overflow-auto animate-mode-enter" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {status === 'loading' && <LoadingSkeleton />}

      {status === 'error' && (
        <div
          className="mx-auto max-w-3xl px-4 py-4 mt-4 rounded-xl text-sm"
          style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}
        >
          {error ?? 'AI beautification failed. Try again.'}
        </div>
      )}

      {status === 'success' && result && (
        <div
          className="relative"
          style={{ '--beautify-accent': result.accent } as React.CSSProperties}
        >
          {isStale && <StaleBanner onRerun={onRerun} />}

          <div className="sticky top-0 z-10 flex justify-end px-4 pt-2 pb-1 pointer-events-none">
            {user && (
              <button
                onClick={onRerun}
                aria-label="Re-run AI beautification"
                className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-all duration-150"
                style={{
                  backgroundColor: 'var(--bg-elevated, var(--bg-primary))',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--beautify-accent)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--beautify-accent)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.95" />
                </svg>
                Re-run AI
              </button>
            )}
          </div>

          <div className="max-w-3xl mx-auto px-4 sm:px-10 pb-12 space-y-6">
            {result.nodes.map((node, i) => renderNode(node, i))}
          </div>
        </div>
      )}

      {status === 'idle' && (
        <div
          className="flex-1 flex items-center justify-center h-full text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          Click "Re-run AI" or switch to Beautify mode to generate a view.
        </div>
      )}
    </div>
  );
}
