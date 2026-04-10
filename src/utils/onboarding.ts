export const ONBOARDING_KEY = 'mreader:onboarding';

export interface OnboardingData {
  sampleDocShown: boolean;
  tooltips: {
    copyLink: boolean;
    qrCode: boolean;
    sidebar: boolean;
  };
}

export type TooltipId = keyof OnboardingData['tooltips'];

export const SAMPLE_DOC = `# Welcome to Scriptorum

> **This is a sample document.** Edit or delete it — it won't appear again.

---

## What you can do

Scriptorum is a **distraction-free markdown editor** that turns any document
into an instant shareable link — no account required.

### Formatting

Write markdown as usual: **bold**, _italic_, ~~strikethrough~~, and \`inline code\`
all render in Preview mode.

### Code blocks

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

### Lists

- Write your document
- Press **Save** → get a permanent URL
- Share the link or QR code with anyone

### Tables

| Feature          | Available         |
|------------------|-------------------|
| Markdown editor  | ✓                 |
| Live preview     | ✓                 |
| Shareable URLs   | ✓ No sign-in      |
| QR code sharing  | ✓                 |
| Collections      | ✓ Signed-in only  |

### Blockquotes

> Great writing starts with a blank page.
> Delete this and start fresh whenever you're ready.

---

## Three things to try right now

1. **Switch to Preview** — click the toggle in the header to see this rendered.
2. **Press Save** — you get a permanent URL you can share with anyone.
3. **Open QR** — after saving, generate a scannable QR code in one click.

---

*Ready? Select all and start writing.*
`;

const DEFAULT_DATA: OnboardingData = {
  sampleDocShown: false,
  tooltips: { copyLink: false, qrCode: false, sidebar: false },
};

export function readOnboardingData(): OnboardingData | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY);
    if (raw === null) return null;
    return JSON.parse(raw) as OnboardingData;
  } catch {
    return null;
  }
}

export function writeOnboardingData(data: OnboardingData): void {
  localStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));
}

export function markSampleDocShown(): void {
  const existing = readOnboardingData() ?? { ...DEFAULT_DATA };
  writeOnboardingData({ ...existing, sampleDocShown: true });
}

export function dismissTooltip(id: TooltipId): void {
  const existing = readOnboardingData() ?? { ...DEFAULT_DATA };
  writeOnboardingData({
    ...existing,
    tooltips: { ...existing.tooltips, [id]: true },
  });
}

export function getInitialMarkdownText(isNewDoc: boolean): string {
  if (!isNewDoc) return '';
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY);
    if (raw === null) return SAMPLE_DOC;
    const data = JSON.parse(raw) as OnboardingData;
    return data.sampleDocShown ? '' : SAMPLE_DOC;
  } catch {
    return '';
  }
}
