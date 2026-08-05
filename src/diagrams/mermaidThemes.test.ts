import { describe, it, expect } from 'vitest';
import { getMermaidConfig } from './mermaidThemes';

describe('getMermaidConfig', () => {
  it('uses the base theme so themeVariables take effect', () => {
    expect(getMermaidConfig('default').theme).toBe('base');
  });

  it('maps the default theme to the app dark-mode palette', () => {
    const { themeVariables } = getMermaidConfig('default');
    expect(themeVariables.background).toBe('#161616');
    expect(themeVariables.textColor).toBe('#fafafa');
    expect(themeVariables.lineColor).toBe('#a1a1aa');
  });

  it('maps the github theme to its palette from previewThemes.css', () => {
    const { themeVariables } = getMermaidConfig('github');
    expect(themeVariables.background).toBe('#161b22');
    expect(themeVariables.primaryColor).toBe('#21262d');
    expect(themeVariables.primaryBorderColor).toBe('#30363d');
    expect(themeVariables.textColor).toBe('#c9d1d9');
  });

  it('maps the dracula theme to its palette from previewThemes.css', () => {
    const { themeVariables } = getMermaidConfig('dracula');
    expect(themeVariables.background).toBe('#21222c');
    expect(themeVariables.primaryColor).toBe('#343746');
    expect(themeVariables.textColor).toBe('#f8f8f2');
  });

  it('maps the notion theme to its palette from previewThemes.css', () => {
    const { themeVariables } = getMermaidConfig('notion');
    expect(themeVariables.background).toBe('#2f2f2f');
    expect(themeVariables.textColor).toBe('#cfcfcc');
  });

  it('maps the solarized theme to its palette from previewThemes.css', () => {
    const { themeVariables } = getMermaidConfig('solarized');
    expect(themeVariables.background).toBe('#073642');
    expect(themeVariables.textColor).toBe('#93a1a1');
  });

  it('maps the forest theme to its palette from previewThemes.css', () => {
    const { themeVariables } = getMermaidConfig('forest');
    expect(themeVariables.background).toBe('#141b0f');
    expect(themeVariables.textColor).toBe('#d4e0c8');
  });

  it('uses distinct accent colors per theme for note/highlight fills', () => {
    const github = getMermaidConfig('github').themeVariables;
    const dracula = getMermaidConfig('dracula').themeVariables;
    expect(github.noteBkgColor).toBe('#58a6ff');
    expect(dracula.noteBkgColor).toBe('#bd93f9');
  });

  it('sets a mermaid font family matching the prose font-mono stack', () => {
    const { themeVariables } = getMermaidConfig('default');
    expect(themeVariables.fontFamily).toContain('IBM Plex Mono');
  });
});
