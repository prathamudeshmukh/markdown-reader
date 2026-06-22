import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BeautifyView from './BeautifyView';
import type { BeautifyResult } from '../ai/beautifyTypes';

vi.mock('./beautify/HeroNode', () => ({ default: ({ title }: { title: string }) => <div data-testid="hero-node">{title}</div> }));
vi.mock('./beautify/ProseNode', () => ({ default: () => <div data-testid="prose-node" /> }));
vi.mock('./beautify/CardsNode', () => ({ default: () => <div data-testid="cards-node" /> }));
vi.mock('./beautify/CalloutNode', () => ({ default: () => <div data-testid="callout-node" /> }));
vi.mock('./beautify/TimelineNode', () => ({ default: () => <div data-testid="timeline-node" /> }));
vi.mock('./beautify/ComparisonTableNode', () => ({ default: () => <div data-testid="comparison-table-node" /> }));
vi.mock('./beautify/FaqNode', () => ({ default: () => <div data-testid="faq-node" /> }));
vi.mock('./beautify/StatsNode', () => ({ default: () => <div data-testid="stats-node" /> }));
vi.mock('./beautify/SectionDividerNode', () => ({ default: () => <div data-testid="section-divider-node" /> }));

const baseResult: BeautifyResult = {
  theme: 'technical',
  accent: '#6366f1',
  nodes: [{ type: 'hero', title: 'Test Title' }],
};

const fakeUser = { id: 'user-1' };

describe('BeautifyView', () => {
  it('renders a hero node when result has type hero', () => {
    render(<BeautifyView result={baseResult} status="success" error={null} isStale={false} user={fakeUser} onRerun={vi.fn()} />);
    expect(screen.getByTestId('hero-node')).toBeInTheDocument();
  });

  it('renders correct component for each node type', () => {
    const result: BeautifyResult = {
      theme: 'rich',
      accent: '#f59e0b',
      nodes: [
        { type: 'prose', markdown: 'text' },
        { type: 'cards', columns: 2, cards: [] },
        { type: 'callout', variant: 'info', body: 'note' },
        { type: 'timeline', items: [] },
        { type: 'comparison-table', columns: [], rows: [] },
        { type: 'faq', items: [] },
        { type: 'stats', items: [] },
        { type: 'section-divider' },
      ],
    };
    render(<BeautifyView result={result} status="success" error={null} isStale={false} user={fakeUser} onRerun={vi.fn()} />);
    expect(screen.getByTestId('prose-node')).toBeInTheDocument();
    expect(screen.getByTestId('cards-node')).toBeInTheDocument();
    expect(screen.getByTestId('callout-node')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-node')).toBeInTheDocument();
    expect(screen.getByTestId('comparison-table-node')).toBeInTheDocument();
    expect(screen.getByTestId('faq-node')).toBeInTheDocument();
    expect(screen.getByTestId('stats-node')).toBeInTheDocument();
    expect(screen.getByTestId('section-divider-node')).toBeInTheDocument();
  });

  it('shows loading skeleton when status is loading', () => {
    render(<BeautifyView result={null} status="loading" error={null} isStale={false} user={fakeUser} onRerun={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows error banner when status is error', () => {
    render(<BeautifyView result={null} status="error" error="AI failed" isStale={false} user={fakeUser} onRerun={vi.fn()} />);
    expect(screen.getByText(/AI failed/i)).toBeInTheDocument();
  });

  it('calls onRerun when Re-run button is clicked by authenticated user', () => {
    const onRerun = vi.fn();
    render(<BeautifyView result={baseResult} status="success" error={null} isStale={false} user={fakeUser} onRerun={onRerun} />);
    fireEvent.click(screen.getByRole('button', { name: /re-run/i }));
    expect(onRerun).toHaveBeenCalledTimes(1);
  });

  describe('stale banner', () => {
    it('renders stale banner when isStale is true', () => {
      render(<BeautifyView result={baseResult} status="success" error={null} isStale={true} user={fakeUser} onRerun={vi.fn()} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Content has changed since the last AI run/i)).toBeInTheDocument();
    });

    it('does not render stale banner when isStale is false', () => {
      render(<BeautifyView result={baseResult} status="success" error={null} isStale={false} user={fakeUser} onRerun={vi.fn()} />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('calls onRerun when Re-run AI button in stale banner is clicked', () => {
      const onRerun = vi.fn();
      render(<BeautifyView result={baseResult} status="success" error={null} isStale={true} user={fakeUser} onRerun={onRerun} />);
      fireEvent.click(screen.getAllByRole('button', { name: /re-run/i })[0]);
      expect(onRerun).toHaveBeenCalledTimes(1);
    });

    it('old result is still visible under stale banner', () => {
      render(<BeautifyView result={baseResult} status="success" error={null} isStale={true} user={fakeUser} onRerun={vi.fn()} />);
      expect(screen.getByTestId('hero-node')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Re-run button visibility', () => {
    it('Re-run button is visible when user is authenticated', () => {
      render(<BeautifyView result={baseResult} status="success" error={null} isStale={false} user={fakeUser} onRerun={vi.fn()} />);
      expect(screen.getByRole('button', { name: /re-run ai beautification/i })).toBeInTheDocument();
    });

    it('Re-run button is absent when user is null', () => {
      render(<BeautifyView result={baseResult} status="success" error={null} isStale={false} user={null} onRerun={vi.fn()} />);
      expect(screen.queryByRole('button', { name: /re-run ai beautification/i })).not.toBeInTheDocument();
    });

    it('Re-run button is absent when user is undefined', () => {
      render(<BeautifyView result={baseResult} status="success" error={null} isStale={false} user={undefined} onRerun={vi.fn()} />);
      expect(screen.queryByRole('button', { name: /re-run ai beautification/i })).not.toBeInTheDocument();
    });
  });
});
