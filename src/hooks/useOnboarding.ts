import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  readOnboardingData,
  markSampleDocShown,
  dismissTooltip as persistDismissTooltip,
  type TooltipId,
} from '../utils/onboarding';

export type { TooltipId };

export interface TooltipVisibility {
  copyLink: boolean;
  qrCode: boolean;
  sidebar: boolean;
}

export interface UseOnboardingReturn {
  tooltipsVisible: TooltipVisibility;
  dismissTooltip: (id: TooltipId) => void;
  onCopyLinkInteraction: () => void;
  onQrInteraction: () => void;
  onSidebarInteraction: () => void;
}

const TOOLTIP_SEQUENCE: TooltipId[] = ['copyLink', 'qrCode', 'sidebar'];

function findNextUndismissed(): TooltipId | null {
  const data = readOnboardingData();
  const dismissed = data?.tooltips ?? { copyLink: false, qrCode: false, sidebar: false };
  return TOOLTIP_SEQUENCE.find((id) => !dismissed[id]) ?? null;
}

export function useOnboarding(isNewDoc: boolean): UseOnboardingReturn {
  const [activeTooltipId, setActiveTooltipId] = useState<TooltipId | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tooltipsVisible = useMemo<TooltipVisibility>(
    () => ({
      copyLink: activeTooltipId === 'copyLink',
      qrCode: activeTooltipId === 'qrCode',
      sidebar: activeTooltipId === 'sidebar',
    }),
    [activeTooltipId],
  );

  useEffect(() => {
    if (!isNewDoc) return;

    const data = readOnboardingData();
    const sampleWasUnshown = data === null || !data.sampleDocShown;
    if (sampleWasUnshown) {
      markSampleDocShown();
    }

    const first = findNextUndismissed();
    if (!first) return;

    const timer = setTimeout(() => {
      setActiveTooltipId(first);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isNewDoc]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) {
        clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  const dismissTooltip = useCallback((id: TooltipId) => {
    persistDismissTooltip(id);
    setActiveTooltipId(null);

    advanceTimerRef.current = setTimeout(() => {
      const next = findNextUndismissed();
      if (next) setActiveTooltipId(next);
    }, 400);
  }, []);

  const onCopyLinkInteraction = useCallback(() => dismissTooltip('copyLink'), [dismissTooltip]);
  const onQrInteraction = useCallback(() => dismissTooltip('qrCode'), [dismissTooltip]);
  const onSidebarInteraction = useCallback(() => dismissTooltip('sidebar'), [dismissTooltip]);

  return {
    tooltipsVisible,
    dismissTooltip,
    onCopyLinkInteraction,
    onQrInteraction,
    onSidebarInteraction,
  };
}
