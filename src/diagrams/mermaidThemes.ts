import type { PreviewThemeId } from '../themes/previewThemes';

interface DiagramPalette {
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
}

// Mirrors src/styles/previewThemes.css and the .dark block in src/index.css.
// The app is always dark-mode (index.html sets class="dark"), so 'default'
// maps to the .dark root tokens rather than the light :root tokens.
const PALETTES: Record<PreviewThemeId, DiagramPalette> = {
  default: {
    background: '#161616',
    surface: '#1a1a1a',
    border: '#262626',
    text: '#fafafa',
    textMuted: '#a1a1aa',
    accent: '#818cf8',
  },
  github: {
    background: '#161b22',
    surface: '#21262d',
    border: '#30363d',
    text: '#c9d1d9',
    textMuted: '#6e7681',
    accent: '#58a6ff',
  },
  dracula: {
    background: '#21222c',
    surface: '#343746',
    border: '#44475a',
    text: '#f8f8f2',
    textMuted: '#6272a4',
    accent: '#bd93f9',
  },
  notion: {
    background: '#2f2f2f',
    surface: '#373737',
    border: '#373737',
    text: '#cfcfcc',
    textMuted: '#9b9a97',
    accent: '#529cca',
  },
  solarized: {
    background: '#073642',
    surface: '#0d3a47',
    border: '#073642',
    text: '#93a1a1',
    textMuted: '#586e75',
    accent: '#2aa198',
  },
  forest: {
    background: '#141b0f',
    surface: '#1f2a18',
    border: '#2d3d24',
    text: '#d4e0c8',
    textMuted: '#8fa882',
    accent: '#d4a853',
  },
};

const DIAGRAM_FONT_FAMILY = '"IBM Plex Mono", "Courier New", monospace';

function toThemeVariables(palette: DiagramPalette) {
  return {
    background: palette.background,
    primaryColor: palette.surface,
    primaryTextColor: palette.text,
    primaryBorderColor: palette.border,
    secondaryColor: palette.background,
    secondaryTextColor: palette.text,
    secondaryBorderColor: palette.border,
    tertiaryColor: palette.surface,
    tertiaryTextColor: palette.text,
    tertiaryBorderColor: palette.border,
    lineColor: palette.textMuted,
    textColor: palette.text,
    mainBkg: palette.surface,
    nodeBorder: palette.border,
    clusterBkg: palette.background,
    clusterBorder: palette.border,
    defaultLinkColor: palette.textMuted,
    titleColor: palette.text,
    edgeLabelBackground: palette.background,
    actorBkg: palette.surface,
    actorBorder: palette.border,
    actorTextColor: palette.text,
    actorLineColor: palette.textMuted,
    signalColor: palette.textMuted,
    signalTextColor: palette.text,
    labelBoxBkgColor: palette.surface,
    labelBoxBorderColor: palette.border,
    labelTextColor: palette.text,
    loopTextColor: palette.text,
    noteBkgColor: palette.accent,
    noteBorderColor: palette.border,
    noteTextColor: palette.text,
    activationBorderColor: palette.border,
    activationBkgColor: palette.surface,
    sequenceNumberColor: palette.background,
    fontFamily: DIAGRAM_FONT_FAMILY,
  };
}

export interface MermaidConfig {
  theme: 'base';
  themeVariables: ReturnType<typeof toThemeVariables>;
}

export function getMermaidConfig(themeId: PreviewThemeId): MermaidConfig {
  return {
    theme: 'base',
    themeVariables: toThemeVariables(PALETTES[themeId]),
  };
}
