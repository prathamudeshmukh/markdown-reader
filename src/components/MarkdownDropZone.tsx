import { useRef, useState } from 'react';
import { isImageFile } from '../utils/imageFile';
import type { DropCoords } from '../hooks/useImageUpload';

const MD_EXTENSIONS = ['.md', '.markdown'];

function isMdFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return MD_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

interface MarkdownDropZoneProps {
  onFile: (file: File) => void;
  onImageFiles: (files: File[], coords: DropCoords) => void;
  onRejected: () => void;
  children: React.ReactNode;
}

export default function MarkdownDropZone({ onFile, onImageFiles, onRejected, children }: MarkdownDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  // dragenter/dragleave fire in pairs as the pointer crosses from the zone
  // onto a child element and back — a plain boolean toggle flickers the
  // overlay off at that boundary. A counter only clears it once the net
  // enter/leave count returns to zero.
  const dragDepthRef = useRef(0);

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const first = files[0];
    if (!first) return;

    if (isMdFile(first)) {
      onFile(first);
      return;
    }

    const images = files.filter(isImageFile);
    if (images.length > 0) {
      onImageFiles(images, { clientX: e.clientX, clientY: e.clientY });
    } else {
      onRejected();
    }
  }

  return (
    <div
      data-testid="md-drop-zone"
      className="relative flex-1 flex flex-col"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      {isDragging && (
        <div
          data-testid="md-drop-overlay"
          className="absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed pointer-events-none"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
            borderColor: 'var(--accent)',
          }}
        >
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" style={{ color: 'var(--accent)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <polyline points="13 2 13 9 20 9" />
              <polyline points="8 15 12 11 16 15" />
              <line x1="12" y1="11" x2="12" y2="19" />
            </svg>
            <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
              Drop Markdown or image file
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
