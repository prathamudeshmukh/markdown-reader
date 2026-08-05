import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface DiagramLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export default function DiagramLightbox({ src, alt, onClose }: DiagramLightboxProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 cursor-zoom-out animate-fade-in"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-full cursor-default"
        style={{ objectFit: 'contain' }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  );
}
