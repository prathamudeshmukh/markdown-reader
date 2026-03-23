import type { PdfImportResult } from './pdfToMarkdown';

export type PdfApiErrorCode = 'CONVERSION_FAILED' | 'NETWORK_ERROR';

const USER_MESSAGES: Record<PdfApiErrorCode, string> = {
  CONVERSION_FAILED: 'The PDF conversion service failed. Please try again.',
  NETWORK_ERROR: 'Could not reach the conversion service. Check your connection.',
};

export class PdfApiError extends Error {
  readonly code: PdfApiErrorCode;
  readonly userMessage: string;

  constructor(code: PdfApiErrorCode, message?: string) {
    const userMessage = message ?? USER_MESSAGES[code];
    super(userMessage);
    this.name = 'PdfApiError';
    this.code = code;
    this.userMessage = userMessage;
  }
}

interface ConvertResponse {
  markdown: string;
  pageCount: number;
}

export async function pdfFileToMarkdown(file: File): Promise<PdfImportResult> {
  const formData = new FormData();
  formData.append('pdf', file);

  let response: Response;
  try {
    response = await fetch('/mreader/api/pdf/convert', { method: 'POST', body: formData });
  } catch {
    throw new PdfApiError('NETWORK_ERROR');
  }

  if (response.status === 422) {
    throw new PdfApiError('CONVERSION_FAILED', 'The PDF could not be converted. Please try a different file.');
  }

  if (!response.ok) {
    throw new PdfApiError('CONVERSION_FAILED');
  }

  const data = (await response.json()) as ConvertResponse;
  return { markdown: data.markdown, pageCount: data.pageCount };
}
