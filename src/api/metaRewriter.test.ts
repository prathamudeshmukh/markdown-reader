import { describe, it, expect } from 'vitest';
import { injectDocMeta } from './metaRewriter';
import type { DocMeta } from './docMeta';

const HTML_FIXTURE = `<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <title>Openmark — Free Online Markdown Editor &amp; Viewer</title>
    <meta name="description" content="Generic site description." />
    <link rel="canonical" href="https://openmark.cc/" />

    <!-- Open Graph -->
    <meta property="og:type"        content="website" />
    <meta property="og:title"       content="Openmark — Free Online Markdown Editor &amp; Viewer" />
    <meta property="og:description" content="Generic site description." />
    <meta property="og:url"         content="https://openmark.cc/" />
    <meta property="og:image"       content="https://openmark.cc/logo.png" />
    <meta property="og:site_name"   content="Openmark" />

    <!-- Twitter Card -->
    <meta name="twitter:card"        content="summary" />
    <meta name="twitter:title"       content="Openmark — Free Online Markdown Editor &amp; Viewer" />
    <meta name="twitter:description" content="Generic site description." />
    <meta name="twitter:image"       content="https://openmark.cc/logo.png" />

    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="apple-touch-icon" href="/logo.png" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

const VALID_META: DocMeta = {
  title: 'My Doc Title',
  description: 'A snippet of the document content.',
  url: 'https://openmark.cc/d/abc1234',
  imageUrl: 'https://openmark.cc/api/og/abc1234.png',
};

describe('injectDocMeta', () => {
  it('rewrites <title> to the doc title', () => {
    const html = injectDocMeta(HTML_FIXTURE, VALID_META);
    expect(html).toContain('<title>My Doc Title</title>');
  });

  it('rewrites og:title, og:description, og:url, and og:image', () => {
    const html = injectDocMeta(HTML_FIXTURE, VALID_META);
    expect(html).toContain('<meta property="og:title"       content="My Doc Title" />');
    expect(html).toContain('<meta property="og:description" content="A snippet of the document content." />');
    expect(html).toContain('<meta property="og:url"         content="https://openmark.cc/d/abc1234" />');
    expect(html).toContain('<meta property="og:image"       content="https://openmark.cc/api/og/abc1234.png" />');
  });

  it('rewrites twitter:title, twitter:description, and twitter:image', () => {
    const html = injectDocMeta(HTML_FIXTURE, VALID_META);
    expect(html).toContain('<meta name="twitter:title"       content="My Doc Title" />');
    expect(html).toContain('<meta name="twitter:description" content="A snippet of the document content." />');
    expect(html).toContain('<meta name="twitter:image"       content="https://openmark.cc/api/og/abc1234.png" />');
  });

  it('upgrades twitter:card to summary_large_image', () => {
    const html = injectDocMeta(HTML_FIXTURE, VALID_META);
    expect(html).toContain('<meta name="twitter:card"        content="summary_large_image" />');
  });

  it('rewrites the canonical link', () => {
    const html = injectDocMeta(HTML_FIXTURE, VALID_META);
    expect(html).toContain('<link rel="canonical" href="https://openmark.cc/d/abc1234" />');
  });

  it('escapes unsafe characters in derived fields instead of injecting them raw', () => {
    const unsafeMeta: DocMeta = {
      title: `<script>alert(1)</script> & "quotes" 'apos'`,
      description: `Description with < > & " '`,
      url: 'https://openmark.cc/d/abc1234',
      imageUrl: 'https://openmark.cc/api/og/abc1234.png',
    };
    const html = injectDocMeta(HTML_FIXTURE, unsafeMeta);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quotes&quot; &#39;apos&#39;');
    expect(html).toContain('Description with &lt; &gt; &amp; &quot; &#39;');
  });

  it('leaves untargeted fields untouched', () => {
    const html = injectDocMeta(HTML_FIXTURE, VALID_META);
    expect(html).toContain('<meta property="og:type"        content="website" />');
    expect(html).toContain('<meta property="og:site_name"   content="Openmark" />');
    expect(html).toContain('<link rel="icon" type="image/png" href="/favicon.png" />');
    expect(html).toContain('<link rel="apple-touch-icon" href="/logo.png" />');
    expect(html).toContain('<meta name="description" content="Generic site description." />');
  });
});
