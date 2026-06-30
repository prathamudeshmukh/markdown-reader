import { useState } from 'react';
import { useApiKeys } from '../hooks/useApiKeys';
import type { ApiKey } from '../api/apiKeysApi';

interface CreateModalProps {
  onCreate: (label: string) => Promise<void>;
  onClose: () => void;
}

function CreateKeyModal({ onCreate, onClose }: CreateModalProps) {
  const [label, setLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmed = label.trim();
    if (!trimmed) return;
    setIsSaving(true);
    setError(null);
    try {
      await onCreate(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create key');
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New API Key"
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: 'var(--bg-elevated, var(--bg-primary))', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          New API Key
        </h2>
        <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
          Label
          <input
            type="text"
            value={label}
            maxLength={100}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            placeholder="e.g. CI bot, Claude Code"
            autoFocus
          />
        </label>
        {error && <p className="text-xs mt-2 text-red-500">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            className="flex-1 py-2 text-sm font-medium rounded-lg"
            style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            aria-label="Create"
            disabled={!label.trim() || isSaving}
            className="flex-1 py-2 text-sm font-medium rounded-lg"
            style={{ backgroundColor: 'var(--accent)', color: '#fff', opacity: !label.trim() || isSaving ? 0.5 : 1 }}
            onClick={handleSubmit}
          >
            {isSaving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface RawKeyCopyPanelProps {
  rawKey: string;
  onDismiss: () => void;
}

function RawKeyCopyPanel({ rawKey, onDismiss }: RawKeyCopyPanelProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(rawKey).catch(() => undefined);
    setCopied(true);
  }

  return (
    <div className="rounded-xl p-4 mb-4" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
      <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
        Your new API key — copy it now, it will not be shown again.
      </p>
      <div className="flex items-center gap-2 mb-3">
        <code
          className="flex-1 rounded px-2 py-1 text-sm break-all"
          style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        >
          {rawKey}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 text-sm px-3 py-1 rounded-lg font-medium"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <button
        type="button"
        aria-label="I've copied it"
        className="w-full py-2 text-sm font-medium rounded-lg"
        style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        onClick={onDismiss}
      >
        I&apos;ve copied it
      </button>
    </div>
  );
}

interface ConfirmRevokeModalProps {
  keyLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmRevokeModal({ keyLabel, onConfirm, onCancel }: ConfirmRevokeModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Revoke API key"
        className="w-full max-w-xs rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: 'var(--bg-elevated, var(--bg-primary))', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Revoke key?
        </h2>
        <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
          Are you sure you want to revoke <strong>{keyLabel}</strong>?
        </p>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          Any agents using this key will stop working immediately.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Cancel"
            className="flex-1 py-2 text-sm font-medium rounded-lg"
            style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            aria-label="Confirm revoke"
            className="flex-1 py-2 text-sm font-medium rounded-lg"
            style={{ backgroundColor: '#ef4444', color: '#fff' }}
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

interface KeyRowProps {
  apiKey: ApiKey;
  onRevoke: (id: string) => void;
}

function KeyRow({ apiKey, onRevoke }: KeyRowProps) {
  return (
    <div
      className="flex items-center justify-between py-3 border-b"
      style={{ borderColor: 'var(--border)' }}
    >
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{apiKey.label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Created {formatDate(apiKey.createdAt)} &middot; Last used: {apiKey.lastUsedAt ? formatDate(apiKey.lastUsedAt) : 'Never'}
        </p>
      </div>
      <button
        type="button"
        aria-label={`Revoke ${apiKey.label}`}
        className="text-xs px-3 py-1.5 rounded-lg font-medium shrink-0 ml-4"
        style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: '#ef4444' }}
        onClick={() => onRevoke(apiKey.id)}
      >
        Revoke
      </button>
    </div>
  );
}

export default function ApiKeysSettings() {
  const { keys, isLoading, error, createKey, revokeKey } = useApiKeys();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);

  async function handleCreate(label: string): Promise<void> {
    const { key } = await createKey(label);
    setShowCreateModal(false);
    setNewRawKey(key);
  }

  async function handleConfirmRevoke(): Promise<void> {
    if (!revokeTarget) return;
    await revokeKey(revokeTarget.id);
    setRevokeTarget(null);
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>API Keys</h2>
        <button
          type="button"
          aria-label="New API Key"
          className="text-sm px-3 py-1.5 rounded-lg font-medium"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          onClick={() => setShowCreateModal(true)}
        >
          New API Key
        </button>
      </div>

      {newRawKey && (
        <RawKeyCopyPanel rawKey={newRawKey} onDismiss={() => setNewRawKey(null)} />
      )}

      {error && (
        <p className="text-sm text-red-500 mb-3">{error}</p>
      )}

      {isLoading && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
      )}

      {!isLoading && keys.length === 0 && !newRawKey && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No API keys yet.</p>
      )}

      {keys.map((k) => (
        <KeyRow key={k.id} apiKey={k} onRevoke={(id) => setRevokeTarget(keys.find((x) => x.id === id) ?? null)} />
      ))}

      {showCreateModal && (
        <CreateKeyModal onCreate={handleCreate} onClose={() => setShowCreateModal(false)} />
      )}

      {revokeTarget && (
        <ConfirmRevokeModal
          keyLabel={revokeTarget.label}
          onConfirm={handleConfirmRevoke}
          onCancel={() => setRevokeTarget(null)}
        />
      )}
    </div>
  );
}
