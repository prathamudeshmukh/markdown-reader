import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist the mock so it's available inside the vi.mock factory (which is hoisted to the top).
const { mockGetDocument } = vi.hoisted(() => ({ mockGetDocument: vi.fn() }));

// Mock pdfjs-dist — full module mock so no real PDF processing occurs in tests.
// GlobalWorkerOptions.workerSrc is set in initPdfWorker(); mocking it here means
// the worker is never actually spawned during test runs.
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' as unknown },
  getDocument: mockGetDocument,
}));

import {
  PdfImportError,
  validatePdfFile,
  textItemsToLines,
  linesToMarkdown,
  pdfToMarkdown,
  type LineData,
} from './pdfToMarkdown';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(name: string, type: string): File {
  const file = new File(['%PDF-1.4'], name, { type });
  // jsdom's File implementation lacks .arrayBuffer() — polyfill for tests
  Object.assign(file, { arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) });
  return file;
}

/** Build a minimal TextItem-shaped object for testing. */
function item(str: string, x: number, y: number, height = 12): object {
  return { str, transform: [1, 0, 0, 1, x, y], height, width: str.length * 6, dir: 'ltr', fontName: 'g_d0_f1', hasEOL: false };
}

// ---------------------------------------------------------------------------
// validatePdfFile
// ---------------------------------------------------------------------------

describe('validatePdfFile', () => {
  it('accepts a file with application/pdf MIME type', () => {
    expect(() => validatePdfFile(makeFile('doc.pdf', 'application/pdf'))).not.toThrow();
  });

  it('accepts a .pdf file with generic MIME type', () => {
    expect(() => validatePdfFile(makeFile('doc.pdf', 'application/octet-stream'))).not.toThrow();
  });

  it('rejects a non-PDF file and throws INVALID_FILE_TYPE', () => {
    const err = (() => {
      try { validatePdfFile(makeFile('doc.txt', 'text/plain')); }
      catch (e) { return e; }
    })();
    expect(err).toBeInstanceOf(PdfImportError);
    expect((err as PdfImportError).code).toBe('INVALID_FILE_TYPE');
  });
});

// ---------------------------------------------------------------------------
// textItemsToLines
// ---------------------------------------------------------------------------

describe('textItemsToLines', () => {
  it('groups items with the same y-coordinate into one line', () => {
    const items = [item('Hello', 50, 700), item(' World', 80, 700)];
    const lines: LineData[] = textItemsToLines(items as never);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('Hello World');
  });

  it('separates items with different y-coordinates into different lines', () => {
    const items = [item('Line A', 50, 700), item('Line B', 50, 680)];
    const lines: LineData[] = textItemsToLines(items as never);
    expect(lines).toHaveLength(2);
  });

  it('sorts items within a line by x-coordinate (left to right)', () => {
    const items = [item('World', 80, 700), item('Hello ', 50, 700)];
    const lines: LineData[] = textItemsToLines(items as never);
    expect(lines[0].text).toBe('Hello World');
  });

  it('ignores items with empty string content', () => {
    const items = [item('', 50, 700), item('Text', 100, 700)];
    const lines: LineData[] = textItemsToLines(items as never);
    expect(lines[0].text).toBe('Text');
  });

  it('returns the max font height across items on the same line', () => {
    const items = [item('Small', 50, 700, 10), item('Big', 80, 700, 20)];
    const lines: LineData[] = textItemsToLines(items as never);
    expect(lines[0].height).toBe(20);
  });

  it('returns the y-coordinate for each line', () => {
    const items = [item('Top', 50, 700), item('Bottom', 50, 650)];
    const lines: LineData[] = textItemsToLines(items as never);
    expect(lines[0].y).toBe(700);
    expect(lines[1].y).toBe(650);
  });

  it('returns empty array when given no items', () => {
    expect(textItemsToLines([])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// linesToMarkdown
// ---------------------------------------------------------------------------

describe('linesToMarkdown', () => {
  it('converts a bullet character line to a markdown list item', () => {
    const result = linesToMarkdown(['• Item one'], [12]);
    expect(result).toContain('- Item one');
  });

  it('converts a numbered line to a markdown ordered list item', () => {
    const result = linesToMarkdown(['1. First item'], [12]);
    expect(result).toContain('1. First item');
  });

  it('marks a line with significantly larger font height as a heading', () => {
    // 3 lines: median of [20, 12, 12] = 12, threshold = 16.8; 20 ≥ 16.8 → heading
    const result = linesToMarkdown(['Introduction', 'body text here', 'more text'], [20, 12, 12]);
    expect(result).toMatch(/^## Introduction/m);
  });

  it('inserts a blank line between paragraphs with a large vertical gap', () => {
    // yGaps[1]=30 means the gap above line[1] is 30; threshold = 12*1.5 = 18 → paragraph break
    const result = linesToMarkdown(['Para one', 'Para two'], [12, 12], [0, 30]);
    expect(result).toContain('\n\n');
  });

  it('outputs plain text for a regular line with no special markers', () => {
    const result = linesToMarkdown(['Just a regular sentence.'], [12]);
    expect(result.trim()).toBe('Just a regular sentence.');
  });
});

// ---------------------------------------------------------------------------
// pdfToMarkdown — integration (pdfjs-dist fully mocked)
// ---------------------------------------------------------------------------

describe('pdfToMarkdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns markdown and pageCount on a well-formed PDF', async () => {
    const mockPage = {
      getTextContent: vi.fn().mockResolvedValue({
        items: [item('Hello world', 50, 700)],
      }),
    };
    mockGetDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue(mockPage),
        destroy: vi.fn(),
      }),
    });

    const result = await pdfToMarkdown(makeFile('test.pdf', 'application/pdf'));
    expect(result.pageCount).toBe(1);
    expect(result.markdown).toContain('Hello world');
  });

  it('throws EMPTY_PDF when all pages have no text items', async () => {
    const mockPage = {
      getTextContent: vi.fn().mockResolvedValue({ items: [] }),
    };
    mockGetDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue(mockPage),
        destroy: vi.fn(),
      }),
    });

    await expect(pdfToMarkdown(makeFile('empty.pdf', 'application/pdf'))).rejects.toSatisfy(
      (e: unknown) => e instanceof PdfImportError && (e as PdfImportError).code === 'EMPTY_PDF',
    );
  });

  it('throws PARSE_FAILURE when pdfjs-dist throws a PasswordException', async () => {
    const passwordError = Object.assign(new Error('Password required'), { name: 'PasswordException' });
    mockGetDocument.mockReturnValue({ promise: Promise.reject(passwordError) });

    await expect(pdfToMarkdown(makeFile('locked.pdf', 'application/pdf'))).rejects.toSatisfy(
      (e: unknown) => e instanceof PdfImportError && (e as PdfImportError).code === 'PARSE_FAILURE',
    );
  });

  it('throws INVALID_FILE_TYPE for a non-PDF file before touching pdfjs-dist', async () => {
    await expect(pdfToMarkdown(makeFile('image.png', 'image/png'))).rejects.toSatisfy(
      (e: unknown) => e instanceof PdfImportError && (e as PdfImportError).code === 'INVALID_FILE_TYPE',
    );
    expect(mockGetDocument).not.toHaveBeenCalled();
  });

  it('calls onProgress once per page with correct current and total', async () => {
    const mockPage = {
      getTextContent: vi.fn().mockResolvedValue({
        items: [item('Page content', 50, 700)],
      }),
    };
    mockGetDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 3,
        getPage: vi.fn().mockResolvedValue(mockPage),
        destroy: vi.fn(),
      }),
    });

    const onProgress = vi.fn();
    await pdfToMarkdown(makeFile('multi.pdf', 'application/pdf'), { onProgress });

    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 3);
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 3);
    expect(onProgress).toHaveBeenNthCalledWith(3, 3, 3);
  });

  it('joins multiple pages with a horizontal rule separator', async () => {
    const mockPage = {
      getTextContent: vi.fn().mockResolvedValue({
        items: [item('Page content', 50, 700)],
      }),
    };
    mockGetDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 2,
        getPage: vi.fn().mockResolvedValue(mockPage),
        destroy: vi.fn(),
      }),
    });

    const result = await pdfToMarkdown(makeFile('multi.pdf', 'application/pdf'));
    expect(result.markdown).toContain('---');
    expect(result.pageCount).toBe(2);
  });
});
