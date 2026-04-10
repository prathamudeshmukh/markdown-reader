import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import type { TooltipId, TooltipVisibility } from '../hooks/useOnboarding';

interface Props {
  visible: TooltipVisibility;
  onDismiss: (id: TooltipId) => void;
}

interface TooltipConfig {
  id: TooltipId;
  targetAttr: string;
  message: string;
}

const TOOLTIPS: TooltipConfig[] = [
  {
    id: 'copyLink',
    targetAttr: 'copy-link',
    message: 'Copy a permanent link to share this document with anyone — no sign-in needed.',
  },
  {
    id: 'qrCode',
    targetAttr: 'qr-code',
    message: 'Generate a QR code — perfect for sharing on slides or in print.',
  },
  {
    id: 'sidebar',
    targetAttr: 'sidebar',
    message: 'Browse recent docs, or sign in to organize your docs into collections.',
  },
];

interface Position {
  top: number;
  left: number;
}

function computePosition(targetAttr: string): Position | null {
  const el = document.querySelector<HTMLElement>(`[data-onboarding="${targetAttr}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { top: rect.bottom + 8, left: rect.left + rect.width / 2 };
}

function TooltipBubble({
  config,
  onDismiss,
}: {
  config: TooltipConfig;
  onDismiss: (id: TooltipId) => void;
}) {
  const [pos, setPos] = useState<Position | null>(null);

  useEffect(() => {
    setPos(computePosition(config.targetAttr));

    const observer = new ResizeObserver(() => {
      setPos(computePosition(config.targetAttr));
    });
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, [config.targetAttr]);

  if (!pos) return null;

  return (
    <div
      style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translateX(-50%)', zIndex: 60 }}
      className="onboarding-tooltip"
      role="tooltip"
    >
      {/* Upward caret */}
      <div
        style={{
          position: 'absolute',
          top: -6,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom: '6px solid var(--border)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: -5,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom: '6px solid var(--bg-elevated)',
        }}
      />
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          color: 'var(--text-secondary)',
          fontSize: 12,
          maxWidth: 220,
          padding: '10px 12px',
          position: 'relative',
        }}
      >
        <button
          onClick={() => onDismiss(config.id)}
          aria-label="Dismiss tip"
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-tertiary)',
            lineHeight: 1,
            padding: '0 2px',
            fontSize: 14,
          }}
        >
          ×
        </button>
        <span style={{ paddingRight: 14, display: 'block' }}>{config.message}</span>
      </div>
    </div>
  );
}

export default function OnboardingTooltips({ visible, onDismiss }: Props) {
  if (window.innerWidth < 640) return null;

  const activeTooltips = TOOLTIPS.filter((t) => visible[t.id]);
  if (activeTooltips.length === 0) return null;

  return ReactDOM.createPortal(
    <>
      {activeTooltips.map((config) => (
        <TooltipBubble key={config.id} config={config} onDismiss={onDismiss} />
      ))}
    </>,
    document.body,
  );
}
