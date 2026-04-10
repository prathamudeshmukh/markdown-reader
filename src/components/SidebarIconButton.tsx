// Reusable icon button variants for the sidebar.
// SidebarButton  — always visible, full hover (color + bg).
// SidebarActionButton — hidden until parent has `group` class hovered.

interface SidebarButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  label: string;
  children: React.ReactNode;
}

export function SidebarButton({ onClick, label, children }: SidebarButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center w-6 h-6 rounded transition-colors"
      style={{ color: 'var(--text-muted)' }}
      onMouseEnter={(e) => {
        const btn = e.currentTarget as HTMLButtonElement;
        btn.style.color = 'var(--text-primary)';
        btn.style.backgroundColor = 'var(--border)';
      }}
      onMouseLeave={(e) => {
        const btn = e.currentTarget as HTMLButtonElement;
        btn.style.color = 'var(--text-muted)';
        btn.style.backgroundColor = 'transparent';
      }}
      aria-label={label}
    >
      {children}
    </button>
  );
}

export function SidebarActionButton({ onClick, label, children }: SidebarButtonProps) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 flex items-center justify-center w-5 h-5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      style={{ color: 'var(--text-muted)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
      aria-label={label}
    >
      {children}
    </button>
  );
}
