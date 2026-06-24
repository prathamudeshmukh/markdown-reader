export type BeautifyTheme = 'minimal' | 'rich' | 'technical' | 'narrative';

export interface BeautifyResult {
  theme: BeautifyTheme;
  accent: string;
  nodes: BeautifyNode[];
}

export type BeautifyNode =
  | HeroNode
  | ProseNode
  | CardsNode
  | CalloutNode
  | TimelineNode
  | ComparisonTableNode
  | FaqNode
  | StatsNode
  | SectionDividerNode;

export interface HeroNode {
  type: 'hero';
  title: string;
  subtitle?: string;
  badge?: string;
}

export interface ProseNode {
  type: 'prose';
  markdown: string;
}

export interface CardsNode {
  type: 'cards';
  columns: 2 | 3 | 4;
  cards: Array<{
    title: string;
    body: string;
    icon?: string;
    badge?: string;
  }>;
}

export interface CalloutNode {
  type: 'callout';
  variant: 'info' | 'tip' | 'warning' | 'danger';
  title?: string;
  body: string;
}

export interface TimelineNode {
  type: 'timeline';
  items: Array<{
    label: string;
    description?: string;
    date?: string;
  }>;
}

export interface ComparisonTableNode {
  type: 'comparison-table';
  columns: string[];
  rows: Array<{
    feature: string;
    values: string[];
  }>;
}

export interface FaqNode {
  type: 'faq';
  items: Array<{
    question: string;
    answer: string;
  }>;
}

export interface StatsNode {
  type: 'stats';
  items: Array<{
    value: string;
    label: string;
    trend?: 'up' | 'down' | 'neutral';
  }>;
}

export interface SectionDividerNode {
  type: 'section-divider';
  label?: string;
}
