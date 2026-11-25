"use client";

import React, { useEffect, useState } from 'react';
import {
  getAiProviderSettings,
  setAiProvider,
  type AiProviderId,
  type AiProviderSettings,
} from '../../services/adminService';

const LABELS: Record<AiProviderId, { name: string; note: string }> = {
  ollama: { name: 'Ollama', note: 'Default. Used first for receipt scans.' },
  gemini: { name: 'Gemini', note: 'Backup. Used when Ollama fails, times out or hits its weekly cap.' },
};

/**
 * PP-186: admin toggle for the receipt-scan AI provider. Ollama is the default and the
 * initial selection until a choice is saved. Admin-only: provider names are never shown
 * to customers (PP-185). Keys live on the server and never reach this component.
 */
export const AiProviderPanel: React.FC = () => {
  const [settings, setSettings] = useState<AiProviderSettings | null>(null);
  const [selected, setSelected] = useState<AiProviderId>('ollama');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAiProviderSettings()
      .then((data) => {
        if (cancelled) return;
        setSettings(data);
        setSelected(data.provider);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the AI provider setting. Showing the default (Ollama).');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const choose = async (next: AiProviderId) => {
    if (next === selected || saving) return;
    const previous = selected;
    setSelected(next);
    setSaving(true);
    setError(null);
    try {
      const saved = await setAiProvider(next);
      setSettings(saved);
      setSelected(saved.provider);
    } catch {
      setSelected(previous);
      setError('Could not save the AI provider. Nothing changed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm" data-testid="ai-provider-panel">
      <h2 className="text-lg font-bold text-slate-800 mb-1">Receipt scan AI provider</h2>
      <p className="text-sm text-slate-500 mb-4">
        Saved on the server. If the chosen provider fails, the other one is tried, then the built-in text reader.
        {settings && !settings.enabled && (
          <span className="block mt-1 text-amber-700" data-testid="ai-provider-flag-off">
            AI receipt scanning is switched off on the server, so this choice has no effect yet.
          </span>
        )}
      </p>
      <div role="radiogroup" aria-label="Receipt scan AI provider" className="inline-flex rounded-xl bg-slate-100 p-1">
        {(['ollama', 'gemini'] as AiProviderId[]).map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected === id}
            disabled={saving}
            onClick={() => void choose(id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              selected === id ? 'bg-emerald-500 text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {LABELS[id].name}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-slate-600" data-testid="ai-provider-note">
        {LABELS[selected].note}
      </p>
      {settings && (
        <p className="mt-1 text-xs text-slate-400">
          Keys on server: Ollama {settings.ollamaConfigured ? 'set' : 'missing'}, Gemini{' '}
          {settings.geminiConfigured ? 'set' : 'missing'}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
};

export default AiProviderPanel;
