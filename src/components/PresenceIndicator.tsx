interface PresenceIndicatorProps {
  count: number;
}

export default function PresenceIndicator({ count }: PresenceIndicatorProps) {
  return (
    <span
      role="status"
      aria-label={`${count} users currently editing`}
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-green-500 dark:bg-green-400" aria-hidden="true" />
      {count} editing
    </span>
  );
}
