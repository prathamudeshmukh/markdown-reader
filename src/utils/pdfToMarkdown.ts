import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy, TextItem } from 'pdfjs-dist/types/src/display/api';

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export type PdfImportErrorCode =
  | 'INVALID_FILE_TYPE'
  | 'EMPTY_PDF'
  | 'PARSE_FAILURE'
  | 'EXTRACTION_FAILURE';

const USER_MESSAGES: Record<PdfImportErrorCode, string> = {
  INVALID_FILE_TYPE: 'Please select a PDF file.',
  EMPTY_PDF: 'This PDF contains no text. It may be blank.',
  PARSE_FAILURE: 'Could not read the PDF. It may be password-protected or corrupt.',
  EXTRACTION_FAILURE: 'This PDF appears to be a scanned image and does not contain extractable text.',
};

export class PdfImportError extends Error {
  readonly code: PdfImportErrorCode;
  readonly userMessage: string;

  constructor(code: PdfImportErrorCode) {
    const userMessage = USER_MESSAGES[code];
    super(userMessage);
    this.name = 'PdfImportError';
    this.code = code;
    this.userMessage = userMessage;
  }
}

// ---------------------------------------------------------------------------
// Worker initialisation (idempotent)
// ---------------------------------------------------------------------------

let workerInitialised = false;

export function initPdfWorker(): void {
  if (workerInitialised) return;
  // Use import.meta.url so Vite bundles the worker file as a separate chunk.
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href;
  workerInitialised = true;
}

// ---------------------------------------------------------------------------
// File validation
// ---------------------------------------------------------------------------

export function validatePdfFile(file: File): void {
  const isPdfMime = file.type === 'application/pdf';
  const isPdfExtension = file.name.toLowerCase().endsWith('.pdf');
  if (!isPdfMime && !isPdfExtension) {
    throw new PdfImportError('INVALID_FILE_TYPE');
  }
}

// ---------------------------------------------------------------------------
// PDF document loading
// ---------------------------------------------------------------------------

async function loadPdfDocument(arrayBuffer: ArrayBuffer): Promise<PDFDocumentProxy> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    return await loadingTask.promise;
  } catch {
    throw new PdfImportError('PARSE_FAILURE');
  }
}

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

async function extractPageText(page: PDFPageProxy): Promise<TextItem[]> {
  const content = await page.getTextContent();
  return content.items.filter((item): item is TextItem => 'str' in item);
}

export interface LineData {
  text: string;
  /** Max font height of items on this line — used for heading detection. */
  height: number;
  /** Y-coordinate (PDF units) of this line — used for gap detection. */
  y: number;
}

/**
 * Groups TextItems into lines by y-coordinate (±2px tolerance),
 * sorts each line left-to-right by x-coordinate.
 * Returns LineData with text, height, and y-position for each line.
 */
export function textItemsToLines(items: TextItem[]): LineData[] {
  if (items.length === 0) return [];

  // Group by rounded y-coordinate (transform[5])
  const lineMap = new Map<number, { x: number; str: string; height: number }[]>();
  for (const it of items) {
    if (!it.str.trim()) continue;
    const rawY = it.transform[5];
    // Find existing bucket within ±2px
    let bucket: number | undefined;
    for (const key of lineMap.keys()) {
      if (Math.abs(key - rawY) <= 2) { bucket = key; break; }
    }
    const y = bucket ?? rawY;
    const existing = lineMap.get(y) ?? [];
    existing.push({ x: it.transform[4], str: it.str, height: it.height });
    lineMap.set(y, existing);
  }

  // Sort lines top-to-bottom (descending y in PDF coords), items left-to-right
  return Array.from(lineMap.entries())
    .sort(([a], [b]) => b - a)
    .map(([y, cells]) => ({
      text: cells
        .sort((a, b) => a.x - b.x)
        .map((c) => c.str)
        .join(''),
      height: Math.max(...cells.map((c) => c.height)),
      y,
    }))
    .filter((line) => line.text.trim().length > 0);
}

// ---------------------------------------------------------------------------
// Markdown formatting heuristics
// ---------------------------------------------------------------------------

const BULLET_RE = /^[•\-*◦▪]\s*/;
const NUMBERED_RE = /^\d+\.\s/;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Converts extracted lines to markdown using heuristic rules.
 * @param lines    Text lines in reading order.
 * @param heights  Font heights parallel to lines array.
 * @param yGaps    Vertical gap before each line (parallel to lines, gap[i] = gap above lines[i]).
 */
export function linesToMarkdown(
  lines: string[],
  heights: number[],
  yGaps: number[] = [],
): string {
  const medianHeight = median(heights);
  const headingThreshold = medianHeight * 1.4;
  const paragraphGapThreshold = medianHeight * 1.5;

  const parts: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const height = heights[i] ?? medianHeight;
    const gap = yGaps[i] ?? 0;

    // Paragraph break from large vertical gap
    if (i > 0 && gap > paragraphGapThreshold) {
      parts.push('');
    }

    if (BULLET_RE.test(line)) {
      parts.push(`- ${line.replace(BULLET_RE, '')}`);
    } else if (NUMBERED_RE.test(line)) {
      parts.push(line);
    } else if (height >= headingThreshold) {
      parts.push(`## ${line}`);
    } else {
      parts.push(line);
    }
  }

  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export interface PdfImportResult {
  markdown: string;
  pageCount: number;
}

export async function pdfToMarkdown(file: File): Promise<PdfImportResult> {
  validatePdfFile(file);
  initPdfWorker();

  const arrayBuffer = await file.arrayBuffer();
  const doc = await loadPdfDocument(arrayBuffer);

  try {
    const pageCount = doc.numPages;
    const pageMarkdowns: string[] = [];

    for (let p = 1; p <= pageCount; p++) {
      const page = await doc.getPage(p);
      const items = await extractPageText(page);
      if (items.length === 0) continue;

      const lineData = textItemsToLines(items);
      const lines = lineData.map((l) => l.text);
      const heights = lineData.map((l) => l.height);
      const yGaps = lineData.map((l, idx) => {
        if (idx === 0) return 0;
        return Math.abs(lineData[idx - 1].y - l.y);
      });

      pageMarkdowns.push(linesToMarkdown(lines, heights, yGaps));
    }

    if (pageMarkdowns.length === 0) throw new PdfImportError('EMPTY_PDF');

    return {
      markdown: pageMarkdowns.join('\n\n---\n\n'),
      pageCount,
    };
  } finally {
    doc.destroy();
  }
}
