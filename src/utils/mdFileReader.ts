export type MdFileErrorCode = 'INVALID_FILE_TYPE' | 'FILE_TOO_LARGE' | 'READ_FAILURE';

const USER_MESSAGES: Record<MdFileErrorCode, string> = {
  INVALID_FILE_TYPE: 'Please select a Markdown (.md or .markdown) file.',
  FILE_TOO_LARGE: 'File too large. Maximum size is 1 MB.',
  READ_FAILURE: 'Could not read file. Make sure it is a valid text file.',
};

export class MdFileError extends Error {
  readonly code: MdFileErrorCode;
  readonly userMessage: string;

  constructor(code: MdFileErrorCode) {
    const userMessage = USER_MESSAGES[code];
    super(userMessage);
    this.name = 'MdFileError';
    this.code = code;
    this.userMessage = userMessage;
  }
}

export const MAX_MD_FILE_BYTES = 1_048_576;

const MD_EXTENSIONS = ['.md', '.markdown'];

export interface MdFileResult {
  content: string;
  title: string;
}

export function extractTitle(content: string): string | null {
  for (const line of content.split('\n')) {
    const match = line.match(/^#\s+(.+)/);
    if (match) return match[1].trim();
  }
  return null;
}

function filenameStem(name: string): string {
  for (const ext of MD_EXTENSIONS) {
    if (name.toLowerCase().endsWith(ext)) {
      return name.slice(0, name.length - ext.length);
    }
  }
  return name;
}

function isMdFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return MD_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function readMdFile(file: File): Promise<MdFileResult> {
  if (!isMdFile(file)) throw new MdFileError('INVALID_FILE_TYPE');
  if (file.size > MAX_MD_FILE_BYTES) throw new MdFileError('FILE_TOO_LARGE');

  let content: string;
  try {
    content = await file.text();
  } catch {
    throw new MdFileError('READ_FAILURE');
  }

  const title = extractTitle(content) ?? filenameStem(file.name);
  return { content, title };
}
