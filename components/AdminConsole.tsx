import React, { useEffect, useMemo, useState } from 'react';
import { AppConfig } from '../types';
import { fetchAdminConfig, saveAdminConfig } from '../services/adminApi';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

const cloneConfig = (config: AppConfig): AppConfig => JSON.parse(JSON.stringify(config));

export function AdminConsole({ open, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);

  const isReady = useMemo(() => !!config && !loading, [config, loading]);

  const load = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const cfg = await fetchAdminConfig();
      setConfig(cfg);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to load admin config.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    load();
  }, [open]);

  if (!open) return null;

  const setNumber = (path: 'suite_temperature' | 'binge_temperature', value: number) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        generation: {
          ...prev.generation,
          [path]: value,
        },
      };
    });
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await saveAdminConfig(config);
      setConfig(cloneConfig(saved));
      setSuccess('Configuration saved.');
      onSaved?.();
    } catch (e: any) {
      setError(e?.message ?? 'Unable to save config.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white ring-1 ring-black/10 shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-black/10 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-brand-teal">Admin</div>
            <h2 className="text-2xl font-editorial italic">Configuration Console</h2>
          </div>
          <button
            onClick={onClose}
            className="text-xs uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity"
          >
            Close
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          {loading && (
            <div className="text-[10px] uppercase tracking-[0.3em] opacity-40 animate-pulse">Loading…</div>
          )}
          {error && (
            <div className="border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-700">
              {success}
            </div>
          )}

          {isReady && config && (
            <>
              <section className="space-y-4">
                <div className="text-[10px] uppercase tracking-widest opacity-50">Generation</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Suite Model</label>
                    <input
                      value={config.generation.suite_model}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                generation: { ...prev.generation, suite_model: e.target.value },
                              }
                            : prev
                        )
                      }
                      className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Binge Model</label>
                    <input
                      value={config.generation.binge_model}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                generation: { ...prev.generation, binge_model: e.target.value },
                              }
                            : prev
                        )
                      }
                      className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Suite Temperature</label>
                    <input
                      type="number"
                      step="0.05"
                      min={0}
                      max={1}
                      value={config.generation.suite_temperature}
                      onChange={(e) => setNumber('suite_temperature', Number(e.target.value))}
                      className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Binge Temperature</label>
                    <input
                      type="number"
                      step="0.05"
                      min={0}
                      max={1}
                      value={config.generation.binge_temperature}
                      onChange={(e) => setNumber('binge_temperature', Number(e.target.value))}
                      className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="text-[10px] uppercase tracking-widest opacity-50">Prompt Overrides</div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Suite Prompt Appendix</label>
                    <textarea
                      value={config.prompts.suite_appendix}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                prompts: { ...prev.prompts, suite_appendix: e.target.value },
                              }
                            : prev
                        )
                      }
                      className="w-full min-h-24 border border-black/10 focus-border-brand-teal outline-none p-3 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Binge Prompt Appendix</label>
                    <textarea
                      value={config.prompts.binge_appendix}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                prompts: { ...prev.prompts, binge_appendix: e.target.value },
                              }
                            : prev
                        )
                      }
                      className="w-full min-h-24 border border-black/10 focus-border-brand-teal outline-none p-3 text-sm"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="text-[10px] uppercase tracking-widest opacity-50">Feature Toggles</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={config.ui.show_prologue}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                ui: { ...prev.ui, show_prologue: e.target.checked },
                              }
                            : prev
                        )
                      }
                    />
                    Show prologue
                  </label>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={config.ui.episodes_enabled}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                ui: { ...prev.ui, episodes_enabled: e.target.checked },
                              }
                            : prev
                        )
                      }
                    />
                    Episodes module enabled
                  </label>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={config.safety.tone_guard_enabled}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                safety: { ...prev.safety, tone_guard_enabled: e.target.checked },
                              }
                            : prev
                        )
                      }
                    />
                    Tone guard enabled
                  </label>
                </div>
              </section>
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-black/10 px-6 py-4 flex items-center justify-between">
          <button
            onClick={load}
            disabled={loading || saving}
            className="text-xs uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30"
          >
            Reload
          </button>
          <button
            onClick={save}
            disabled={!isReady || saving}
            className="px-5 py-3 btn-brand text-xs uppercase tracking-[0.25em] transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Config'}
          </button>
        </div>
      </div>
    </div>
  );
}
