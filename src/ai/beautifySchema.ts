import type { BeautifyResult, BeautifyNode } from './beautifyTypes';

const THEMES = new Set(['minimal', 'rich', 'technical', 'narrative']);
const NODE_TYPES = new Set([
  'hero', 'prose', 'cards', 'callout', 'timeline',
  'comparison-table', 'faq', 'stats', 'section-divider',
]);
const CALLOUT_VARIANTS = new Set(['info', 'tip', 'warning', 'danger']);
const CARD_COLUMNS = new Set([2, 3, 4]);

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isStrArr(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function isNodeArray(arr: unknown): arr is BeautifyNode[] {
  if (!Array.isArray(arr)) return false;
  return arr.every((item) => isNode(item));
}

function isNode(raw: unknown): raw is BeautifyNode {
  if (!isObj(raw)) return false;
  const { type } = raw;
  if (typeof type !== 'string' || !NODE_TYPES.has(type)) return false;

  switch (type) {
    case 'hero':
      return typeof raw.title === 'string';

    case 'prose':
      return typeof raw.markdown === 'string';

    case 'cards': {
      if (!CARD_COLUMNS.has(raw.columns as number)) return false;
      if (!Array.isArray(raw.cards)) return false;
      return raw.cards.every(
        (c) => isObj(c) && typeof c.title === 'string' && typeof c.body === 'string',
      );
    }

    case 'callout':
      return (
        typeof raw.body === 'string' &&
        typeof raw.variant === 'string' &&
        CALLOUT_VARIANTS.has(raw.variant)
      );

    case 'timeline': {
      if (!Array.isArray(raw.items)) return false;
      return raw.items.every((i) => isObj(i) && typeof i.label === 'string');
    }

    case 'comparison-table': {
      if (!isStrArr(raw.columns)) return false;
      if (!Array.isArray(raw.rows)) return false;
      return raw.rows.every(
        (r) => isObj(r) && typeof r.feature === 'string' && isStrArr(r.values),
      );
    }

    case 'faq': {
      if (!Array.isArray(raw.items)) return false;
      return raw.items.every(
        (i) => isObj(i) && typeof i.question === 'string' && typeof i.answer === 'string',
      );
    }

    case 'stats': {
      if (!Array.isArray(raw.items)) return false;
      return raw.items.every(
        (i) => isObj(i) && typeof i.value === 'string' && typeof i.label === 'string',
      );
    }

    case 'section-divider':
      return true;

    default:
      return false;
  }
}

export function isBeautifyResult(raw: unknown): raw is BeautifyResult {
  if (!isObj(raw)) return false;
  if (typeof raw.theme !== 'string' || !THEMES.has(raw.theme)) return false;
  if (typeof raw.accent !== 'string' || !/^#[0-9a-fA-F]{3,8}$/.test(raw.accent)) return false;
  return isNodeArray(raw.nodes);
}

export function parseBeautifyResult(text: string): BeautifyResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('AI returned invalid JSON');
  }
  if (!isBeautifyResult(parsed)) {
    throw new Error('AI returned an invalid component tree');
  }
  return parsed;
}
