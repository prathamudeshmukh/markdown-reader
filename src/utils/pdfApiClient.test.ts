import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pdfFileToMarkdown, PdfApiError } from './pdfApiClient';

function makeFile(content = '%PDF'): File {
  return new File([content], 'test.pdf', { type: 'application/pdf' });
}

function makeJsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('pdfFileToMarkdown', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('POSTs to the correct endpoint with the file in FormData', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeJsonResponse({ markdown: '# Hello', pageCount: 1 }),
    );

    await pdfFileToMarkdown(makeFile());

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('/mreader/api/pdf/convert');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBeInstanceOf(FormData);
  });

  it('returns PdfImportResult with markdown and pageCount on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeJsonResponse({ markdown: '# Title\n\nBody', pageCount: 3 }),
    );

    const result = await pdfFileToMarkdown(makeFile());

    expect(result.markdown).toBe('# Title\n\nBody');
    expect(result.pageCount).toBe(3);
  });

  it('throws PdfApiError with CONVERSION_FAILED on 422', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeJsonResponse({ error: 'bad url' }, 422));

    await expect(pdfFileToMarkdown(makeFile())).rejects.toSatisfy(
      (err: unknown) => err instanceof PdfApiError && err.code === 'CONVERSION_FAILED',
    );
  });

  it('throws PdfApiError with CONVERSION_FAILED on 500', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeJsonResponse({ error: 'oops' }, 500));

    await expect(pdfFileToMarkdown(makeFile())).rejects.toSatisfy(
      (err: unknown) => err instanceof PdfApiError && err.code === 'CONVERSION_FAILED',
    );
  });

  it('throws PdfApiError with NETWORK_ERROR when fetch rejects', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network error'));

    await expect(pdfFileToMarkdown(makeFile())).rejects.toSatisfy(
      (err: unknown) => err instanceof PdfApiError && err.code === 'NETWORK_ERROR',
    );
  });

  it('exposes a user-friendly message on 422', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeJsonResponse({ error: 'bad' }, 422));

    await expect(pdfFileToMarkdown(makeFile())).rejects.toSatisfy(
      (err: unknown) => err instanceof PdfApiError && err.userMessage.length > 0,
    );
  });
});
