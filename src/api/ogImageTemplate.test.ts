import { describe, it, expect } from 'vitest';
import { buildOgImageHtml, OG_IMAGE_WORDMARK_TEXT, OG_IMAGE_FOOTER_TEXT } from './ogImageTemplate';

describe('buildOgImageHtml', () => {
  it('includes the openmark wordmark and domain footer', () => {
    const html = buildOgImageHtml('My Document');

    expect(html).toContain(OG_IMAGE_WORDMARK_TEXT);
    expect(html).toContain(OG_IMAGE_FOOTER_TEXT);
  });

  it('renders the title exactly once, distinct from the wordmark and footer', () => {
    const html = buildOgImageHtml('My Document');

    expect(html.match(/My Document/g)).toHaveLength(1);
  });

  it('uses a gradient background, not the old flat color', () => {
    const html = buildOgImageHtml('My Document');

    expect(html).toContain('radial-gradient');
    expect(html).not.toContain('#0f172a');
  });

  it('escapes unsafe characters in the title', () => {
    const html = buildOgImageHtml(`<script>alert('x')</script>`);

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('truncates an overly long title with an ellipsis instead of overflowing', () => {
    const longTitle = 'Extremely Long Document Title That Just Keeps Going And Going '.repeat(4).trim();

    const html = buildOgImageHtml(longTitle);

    expect(html).not.toContain(longTitle);
    expect(html).toContain('…');
  });
});
