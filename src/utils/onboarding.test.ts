import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ONBOARDING_KEY,
  readOnboardingData,
  writeOnboardingData,
  markSampleDocShown,
  dismissTooltip,
  getInitialMarkdownText,
  SAMPLE_DOC,
  type OnboardingData,
} from './onboarding';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('readOnboardingData', () => {
  it('returns null when key is absent', () => {
    expect(readOnboardingData()).toBeNull();
  });

  it('returns parsed data when key is present', () => {
    const data: OnboardingData = {
      sampleDocShown: true,
      tooltips: { copyLink: false, qrCode: false, sidebar: false },
    };
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));
    expect(readOnboardingData()).toEqual(data);
  });

  it('returns null on malformed JSON without throwing', () => {
    localStorage.setItem(ONBOARDING_KEY, 'not-json{{{');
    expect(readOnboardingData()).toBeNull();
  });
});

describe('writeOnboardingData', () => {
  it('persists data to localStorage', () => {
    const data: OnboardingData = {
      sampleDocShown: false,
      tooltips: { copyLink: false, qrCode: false, sidebar: false },
    };
    writeOnboardingData(data);
    const raw = localStorage.getItem(ONBOARDING_KEY);
    expect(JSON.parse(raw!)).toEqual(data);
  });
});

describe('markSampleDocShown', () => {
  it('sets sampleDocShown to true when key is absent (creates fresh entry)', () => {
    markSampleDocShown();
    const data = readOnboardingData();
    expect(data?.sampleDocShown).toBe(true);
  });

  it('sets sampleDocShown to true while preserving existing tooltip flags', () => {
    const existing: OnboardingData = {
      sampleDocShown: false,
      tooltips: { copyLink: true, qrCode: false, sidebar: true },
    };
    writeOnboardingData(existing);
    markSampleDocShown();
    const data = readOnboardingData();
    expect(data?.sampleDocShown).toBe(true);
    expect(data?.tooltips).toEqual({ copyLink: true, qrCode: false, sidebar: true });
  });

  it('does not mutate the written object', () => {
    const existing: OnboardingData = {
      sampleDocShown: false,
      tooltips: { copyLink: false, qrCode: false, sidebar: false },
    };
    writeOnboardingData(existing);
    markSampleDocShown();
    expect(existing.sampleDocShown).toBe(false);
  });
});

describe('dismissTooltip', () => {
  it('sets the specified tooltip flag to true', () => {
    const existing: OnboardingData = {
      sampleDocShown: true,
      tooltips: { copyLink: false, qrCode: false, sidebar: false },
    };
    writeOnboardingData(existing);
    dismissTooltip('copyLink');
    const data = readOnboardingData();
    expect(data?.tooltips.copyLink).toBe(true);
  });

  it('leaves other tooltip flags unchanged', () => {
    const existing: OnboardingData = {
      sampleDocShown: true,
      tooltips: { copyLink: false, qrCode: false, sidebar: false },
    };
    writeOnboardingData(existing);
    dismissTooltip('qrCode');
    const data = readOnboardingData();
    expect(data?.tooltips.copyLink).toBe(false);
    expect(data?.tooltips.qrCode).toBe(true);
    expect(data?.tooltips.sidebar).toBe(false);
  });

  it('creates a default entry if key is absent before dismissing', () => {
    dismissTooltip('sidebar');
    const data = readOnboardingData();
    expect(data?.tooltips.sidebar).toBe(true);
    expect(data?.tooltips.copyLink).toBe(false);
    expect(data?.tooltips.qrCode).toBe(false);
  });

  it('does not mutate the read object', () => {
    const existing: OnboardingData = {
      sampleDocShown: true,
      tooltips: { copyLink: false, qrCode: false, sidebar: false },
    };
    writeOnboardingData(existing);
    dismissTooltip('copyLink');
    expect(existing.tooltips.copyLink).toBe(false);
  });
});

describe('getInitialMarkdownText', () => {
  it('returns empty string when isNewDoc is false, regardless of localStorage', () => {
    // even on "first visit" scenario
    expect(getInitialMarkdownText(false)).toBe('');
  });

  it('returns SAMPLE_DOC when key is absent (true first visit)', () => {
    expect(getInitialMarkdownText(true)).toBe(SAMPLE_DOC);
  });

  it('returns SAMPLE_DOC when sampleDocShown is false', () => {
    const data: OnboardingData = {
      sampleDocShown: false,
      tooltips: { copyLink: false, qrCode: false, sidebar: false },
    };
    writeOnboardingData(data);
    expect(getInitialMarkdownText(true)).toBe(SAMPLE_DOC);
  });

  it('returns empty string when sampleDocShown is true', () => {
    const data: OnboardingData = {
      sampleDocShown: true,
      tooltips: { copyLink: false, qrCode: false, sidebar: false },
    };
    writeOnboardingData(data);
    expect(getInitialMarkdownText(true)).toBe('');
  });

  it('returns empty string on malformed localStorage without throwing', () => {
    localStorage.setItem(ONBOARDING_KEY, 'not-json{{{');
    expect(getInitialMarkdownText(true)).toBe('');
  });

  it('does not write to localStorage (side-effect-free)', () => {
    const setSpy = vi.spyOn(Storage.prototype, 'setItem');
    getInitialMarkdownText(true);
    expect(setSpy).not.toHaveBeenCalled();
  });
});

describe('SAMPLE_DOC', () => {
  it('is a non-empty string', () => {
    expect(typeof SAMPLE_DOC).toBe('string');
    expect(SAMPLE_DOC.length).toBeGreaterThan(0);
  });

  it('starts with a markdown heading', () => {
    expect(SAMPLE_DOC.trim().startsWith('#')).toBe(true);
  });
});
