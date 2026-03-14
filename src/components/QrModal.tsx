import { useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface QrModalProps {
  url: string;
  onClose: () => void;
}

export default function QrModal({ url, onClose }: QrModalProps) {
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function handleDownload() {
    const canvas = canvasWrapperRef.current?.querySelector<HTMLCanvasElement>('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'qr-code.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return (
    <>
      <div
        data-testid="qr-backdrop"
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="relative pointer-events-auto bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-lg shadow-black/5 p-6 flex flex-col items-center gap-4 max-w-xs w-full mx-4">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 flex items-center justify-center w-7 h-7 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors dark:text-gray-500 dark:hover:text-gray-200 dark:hover:bg-gray-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Scan to open</p>

          <div ref={canvasWrapperRef} className="rounded-xl overflow-hidden p-2 bg-white">
            <QRCodeCanvas value={url} size={180} bgColor="#ffffff" fgColor="#000000" level="M" />
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500 text-center break-all line-clamp-2 max-w-full">
            {url}
          </p>

          <button
            onClick={handleDownload}
            aria-label="Download PNG"
            className="px-4 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 rounded-full transition-colors dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 dark:border-gray-700"
          >
            Download PNG
          </button>
        </div>
      </div>
    </>
  );
}
