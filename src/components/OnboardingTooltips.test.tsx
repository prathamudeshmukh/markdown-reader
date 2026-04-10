import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import OnboardingTooltips from './OnboardingTooltips';
import type { TooltipId } from '../hooks/useOnboarding';

const ALL_HIDDEN = { copyLink: false, qrCode: false, sidebar: false };
const ALL_VISIBLE = { copyLink: true, qrCode: true, sidebar: true };

beforeEach(() => {
  // Add target elements with data-onboarding attributes so tooltips can position themselves
  ['copy-link', 'qr-code', 'sidebar'].forEach((id) => {
    const btn = document.createElement('button');
    btn.setAttribute('data-onboarding', id);
    btn.style.cssText = 'position:fixed;top:50px;left:100px;width:30px;height:30px';
    document.body.appendChild(btn);
  });

  Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
});

afterEach(() => {
  document.querySelectorAll('[data-onboarding]').forEach((el) => el.remove());
  vi.restoreAllMocks();
});

describe('OnboardingTooltips — all hidden', () => {
  it('renders nothing when all visible flags are false', () => {
    const { container } = render(
      <OnboardingTooltips visible={ALL_HIDDEN} onDismiss={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('OnboardingTooltips — individual tooltips', () => {
  it('renders copyLink tooltip message when visible.copyLink is true', () => {
    render(
      <OnboardingTooltips
        visible={{ ...ALL_HIDDEN, copyLink: true }}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText(/permanent link/i)).toBeInTheDocument();
  });

  it('renders qrCode tooltip message when visible.qrCode is true', () => {
    render(
      <OnboardingTooltips
        visible={{ ...ALL_HIDDEN, qrCode: true }}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText(/QR code/i)).toBeInTheDocument();
  });

  it('renders sidebar tooltip message when visible.sidebar is true', () => {
    render(
      <OnboardingTooltips
        visible={{ ...ALL_HIDDEN, sidebar: true }}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText(/recent docs/i)).toBeInTheDocument();
  });

  it('renders all three bubbles when all visible flags are true', () => {
    render(<OnboardingTooltips visible={ALL_VISIBLE} onDismiss={vi.fn()} />);
    expect(screen.getByText(/permanent link/i)).toBeInTheDocument();
    expect(screen.getByText(/QR code/i)).toBeInTheDocument();
    expect(screen.getByText(/recent docs/i)).toBeInTheDocument();
  });
});

describe('OnboardingTooltips — dismiss', () => {
  it('calls onDismiss with copyLink when X button is clicked', () => {
    const onDismiss = vi.fn();
    render(
      <OnboardingTooltips
        visible={{ ...ALL_HIDDEN, copyLink: true }}
        onDismiss={onDismiss}
      />,
    );
    const dismissBtn = screen.getByLabelText('Dismiss tip');
    fireEvent.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalledWith('copyLink' satisfies TooltipId);
  });

  it('calls onDismiss with qrCode when its X button is clicked', () => {
    const onDismiss = vi.fn();
    render(
      <OnboardingTooltips
        visible={{ ...ALL_HIDDEN, qrCode: true }}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.click(screen.getByLabelText('Dismiss tip'));
    expect(onDismiss).toHaveBeenCalledWith('qrCode' satisfies TooltipId);
  });

  it('calls correct onDismiss id for each bubble when all are visible', () => {
    const onDismiss = vi.fn();
    render(<OnboardingTooltips visible={ALL_VISIBLE} onDismiss={onDismiss} />);
    const dismissBtns = screen.getAllByLabelText('Dismiss tip');
    expect(dismissBtns).toHaveLength(3);
    fireEvent.click(dismissBtns[0]);
    expect(onDismiss).toHaveBeenCalledWith('copyLink');
  });
});

describe('OnboardingTooltips — mobile guard', () => {
  it('renders nothing on narrow screens (< 640px)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
    const { container } = render(
      <OnboardingTooltips visible={ALL_VISIBLE} onDismiss={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
