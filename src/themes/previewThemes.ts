export const THEME_IDS = ['default', 'github', 'dracula', 'notion', 'solarized', 'forest'] as const;

export type PreviewThemeId = (typeof THEME_IDS)[number];

export interface PreviewTheme {
  id: PreviewThemeId;
  label: string;
  swatch: string;
}

export const PREVIEW_THEMES: PreviewTheme[] = [
  { id: 'default',   label: 'Default',   swatch: '#6366f1' },
  { id: 'github',    label: 'GitHub',    swatch: '#58a6ff' },
  { id: 'dracula',   label: 'Dracula',   swatch: '#bd93f9' },
  { id: 'notion',    label: 'Notion',    swatch: '#529cca' },
  { id: 'solarized', label: 'Solarized', swatch: '#2aa198' },
  { id: 'forest',    label: 'Forest',    swatch: '#d4a853' },
];

export function isValidThemeId(value: unknown): value is PreviewThemeId {
  return THEME_IDS.includes(value as PreviewThemeId);
}
