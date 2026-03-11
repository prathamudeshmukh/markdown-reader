interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function Editor({ value, onChange }: EditorProps) {
  return (
    <textarea
      className="flex-1 w-full p-6 font-mono text-sm text-gray-800 bg-white resize-none outline-none leading-relaxed dark:bg-gray-900 dark:text-gray-200 dark:placeholder-gray-600"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Start typing markdown..."
      spellCheck={false}
      autoFocus
    />
  );
}
