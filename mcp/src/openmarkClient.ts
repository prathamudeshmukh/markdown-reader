export interface OpenMarkClientConfig {
  apiKey: string;
  baseUrl: string;
}

export interface CreatedDoc {
  slug: string;
  url: string;
}

export interface ReadDoc {
  slug: string;
  title: string | null;
  content: string;
  url: string;
}

export interface UpdatedDoc {
  slug: string;
  url: string;
}

export function extractSlug(input: string): string {
  try {
    const url = new URL(input);
    const parts = url.pathname.split('/');
    const last = parts[parts.length - 1];
    return last || input;
  } catch {
    return input;
  }
}

async function handleErrorResponse(res: Response): Promise<never> {
  const text = await res.text().catch(() => '');
  throw new Error(`${res.status}: ${text}`);
}

export class OpenMarkClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: OpenMarkClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
  }

  private authHeaders(): Record<string, string> {
    return {
      'X-OpenMark-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private docUrl(slug: string): string {
    return `${this.baseUrl}/d/${slug}`;
  }

  async createDoc(content: string, title?: string): Promise<CreatedDoc> {
    const body: Record<string, unknown> = { content };
    if (title !== undefined) body.title = title;

    const res = await fetch(`${this.baseUrl}/api/docs`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) await handleErrorResponse(res);

    const data = (await res.json()) as { slug: string };
    return { slug: data.slug, url: this.docUrl(data.slug) };
  }

  async readDoc(slugOrUrl: string): Promise<ReadDoc> {
    const slug = extractSlug(slugOrUrl);
    const res = await fetch(`${this.baseUrl}/api/docs/${encodeURIComponent(slug)}`, {
      headers: { 'X-OpenMark-Key': this.apiKey },
    });

    if (!res.ok) await handleErrorResponse(res);

    const data = (await res.json()) as { slug: string; content: string; title: string | null };
    return { slug: data.slug, title: data.title, content: data.content, url: this.docUrl(data.slug) };
  }

  async updateDoc(slugOrUrl: string, content: string, title?: string): Promise<UpdatedDoc> {
    const slug = extractSlug(slugOrUrl);
    const body: Record<string, unknown> = { content };
    if (title !== undefined) body.title = title;

    const res = await fetch(`${this.baseUrl}/api/docs/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) await handleErrorResponse(res);

    const data = (await res.json()) as { slug: string };
    return { slug: data.slug, url: this.docUrl(data.slug) };
  }
}
