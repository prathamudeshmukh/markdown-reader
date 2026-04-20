export interface InsertionResult {
  newValue: string;
  newCursorStart: number;
  newCursorEnd: number;
}

// ── Inline wrap helpers ────────────────────────────────────────────────────

function wrapInline(
  value: string,
  start: number,
  end: number,
  open: string,
  close: string,
): InsertionResult {
  const before = value.slice(0, start);
  const selected = value.slice(start, end);
  const after = value.slice(end);

  if (start === end) {
    // No selection: insert empty delimiters, cursor between them
    const newValue = before + open + close + after;
    const cursor = start + open.length;
    return { newValue, newCursorStart: cursor, newCursorEnd: cursor };
  }

  const newValue = before + open + selected + close + after;
  const cursor = start + open.length + selected.length + close.length;
  return { newValue, newCursorStart: cursor, newCursorEnd: cursor };
}

// ── Line-prefix helpers ────────────────────────────────────────────────────

function prefixLine(value: string, start: number, prefix: string): InsertionResult {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
  const cursor = start + prefix.length;
  return { newValue, newCursorStart: cursor, newCursorEnd: cursor };
}

// ── Public API ─────────────────────────────────────────────────────────────

export function applyBold(value: string, start: number, end: number): InsertionResult {
  return wrapInline(value, start, end, '**', '**');
}

export function applyItalic(value: string, start: number, end: number): InsertionResult {
  return wrapInline(value, start, end, '_', '_');
}

export function applyCode(value: string, start: number, end: number): InsertionResult {
  return wrapInline(value, start, end, '`', '`');
}

export function applyHeading(value: string, start: number, _end: number): InsertionResult {
  return prefixLine(value, start, '## ');
}

export function applyQuote(value: string, start: number, _end: number): InsertionResult {
  return prefixLine(value, start, '> ');
}

export function applyList(value: string, start: number, _end: number): InsertionResult {
  return prefixLine(value, start, '- ');
}

export function applyLink(
  value: string,
  start: number,
  end: number,
  linkText?: string,
  url?: string,
): InsertionResult {
  const before = value.slice(0, start);
  const after = value.slice(end);

  if (start !== end) {
    // Selection present: wrap it, cursor inside ()
    const selected = value.slice(start, end);
    const inserted = `[${selected}]()`;
    const newValue = before + inserted + after;
    const cursor = start + inserted.length - 1; // inside ()
    return { newValue, newCursorStart: cursor, newCursorEnd: cursor };
  }

  if (linkText !== undefined && url !== undefined) {
    // Both params provided: insert complete link
    const inserted = `[${linkText}](${url})`;
    const newValue = before + inserted + after;
    const cursor = start + inserted.length;
    return { newValue, newCursorStart: cursor, newCursorEnd: cursor };
  }

  // No selection, no params: insert template, cursor inside ()
  const inserted = '[text]()';
  const newValue = before + inserted + after;
  const cursor = start + inserted.length - 1; // inside ()
  return { newValue, newCursorStart: cursor, newCursorEnd: cursor };
}

export function applyTable(
  value: string,
  start: number,
  rows: number,
  cols: number,
): InsertionResult {
  const headerCells = Array.from({ length: cols }, (_, i) => ` Column ${i + 1} `).join('|');
  const separatorCells = Array.from({ length: cols }, () => ' --- ').join('|');
  const dataCell = Array.from({ length: cols }, () => '  ').join('|');

  const headerRow = `|${headerCells}|`;
  const separatorRow = `|${separatorCells}|`;
  const dataRow = `|${dataCell}|`;

  const dataRows = Array.from({ length: rows }, () => dataRow).join('\n');
  const tableStr = `${headerRow}\n${separatorRow}\n${dataRows}`;

  const before = value.slice(0, start);
  const after = value.slice(start);
  const newValue = before + tableStr + after;
  const cursor = start + tableStr.length;
  return { newValue, newCursorStart: cursor, newCursorEnd: cursor };
}
