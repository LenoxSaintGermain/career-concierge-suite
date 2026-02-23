import React, { useEffect, useMemo, useState } from 'react';
import { CLIENT_INTENTS, FOCUS_PREFS, PACE_PREFS } from '../constants';
import { AppConfig, CuratedMediaItem, MediaAudience, MediaJourneySurface, MediaPlatform, MediaSourceKind } from '../types';
import { fetchAdminConfig, saveAdminConfig } from '../services/adminApi';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

const cloneConfig = (config: AppConfig): AppConfig => JSON.parse(JSON.stringify(config));
type VoicePreset = {
  id: 'fast' | 'balanced' | 'cinematic';
  label: string;
  summary: string;
  temperature: number;
  live_vad_silence_ms: number;
  live_vad_prefix_padding_ms: number;
  live_vad_start_sensitivity: 'high' | 'low';
  live_vad_end_sensitivity: 'high' | 'low';
  narration_style: string;
};

const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'fast',
    label: 'Fast & Crisp',
    summary: 'Lowest pause window for tighter turn-taking.',
    temperature: 0.7,
    live_vad_silence_ms: 240,
    live_vad_prefix_padding_ms: 70,
    live_vad_start_sensitivity: 'high',
    live_vad_end_sensitivity: 'high',
    narration_style: 'Confident, concise, direct concierge guidance with minimal ornamentation.',
  },
  {
    id: 'balanced',
    label: 'Balanced Concierge',
    summary: 'Natural rhythm for most live conversations.',
    temperature: 0.82,
    live_vad_silence_ms: 360,
    live_vad_prefix_padding_ms: 120,
    live_vad_start_sensitivity: 'high',
    live_vad_end_sensitivity: 'high',
    narration_style: 'Calm concierge narration with subtle warmth, precision, and steady pacing.',
  },
  {
    id: 'cinematic',
    label: 'Cinematic Warmth',
    summary: 'Softer cadence with elevated storytelling feel.',
    temperature: 0.95,
    live_vad_silence_ms: 520,
    live_vad_prefix_padding_ms: 180,
    live_vad_start_sensitivity: 'low',
    live_vad_end_sensitivity: 'low',
    narration_style: 'Editorial, textured, human cadence with reflective pauses and premium tone.',
  },
];

const JOURNEY_SURFACES: MediaJourneySurface[] = [
  'pre_intake',
  'post_intake',
  'suite_home',
  'intake',
  'episodes',
  'brief',
  'suite_distilled',
  'profile',
  'ai_profile',
  'gaps',
  'readiness',
  'cjs_execution',
  'plan',
  'assets',
];
const EXTERNAL_PLATFORMS: MediaPlatform[] = [
  'auto',
  'youtube',
  'vimeo',
  'tiktok',
  'instagram',
  'linkedin',
  'x',
  'loom',
  'direct',
  'other',
];
const SOURCE_KINDS: MediaSourceKind[] = ['single', 'playlist'];
const AUDIENCES: MediaAudience[] = ['all', 'new_clients', 'active_clients', 'admins', 'non_admins'];

const createMediaItem = (): CuratedMediaItem => ({
  id: `media-${Date.now().toString(36)}`,
  enabled: true,
  title: '',
  subtitle: '',
  source_url: '',
  source_kind: 'single',
  platform: 'auto',
  thumbnail_url: '',
  tags: [],
  priority: 100,
  surfaces: ['episodes'],
  rule: {
    audience: 'all',
    intents: [],
    focuses: [],
    paces: [],
    required_module_unlocks: [],
  },
});

export function AdminConsole({ open, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [showAdvancedVoice, setShowAdvancedVoice] = useState(false);

  const isReady = useMemo(() => !!config && !loading, [config, loading]);

  const load = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setShowAdvancedVoice(false);
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

  const applyVoicePreset = (preset: VoicePreset) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        voice: {
          ...prev.voice,
          temperature: preset.temperature,
          live_vad_silence_ms: preset.live_vad_silence_ms,
          live_vad_prefix_padding_ms: preset.live_vad_prefix_padding_ms,
          live_vad_start_sensitivity: preset.live_vad_start_sensitivity,
          live_vad_end_sensitivity: preset.live_vad_end_sensitivity,
          narration_style: preset.narration_style,
        },
      };
    });
  };

  const updateMediaItem = (index: number, updater: (item: CuratedMediaItem) => CuratedMediaItem) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const next = [...prev.media.curated_library];
      const current = next[index];
      if (!current) return prev;
      next[index] = updater(current);
      return {
        ...prev,
        media: {
          ...prev.media,
          curated_library: next,
        },
      };
    });
  };

  const addMediaItem = () => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        media: {
          ...prev.media,
          curated_library: [...prev.media.curated_library, createMediaItem()],
        },
      };
    });
  };

  const removeMediaItem = (index: number) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        media: {
          ...prev.media,
          curated_library: prev.media.curated_library.filter((_, i) => i !== index),
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
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden bg-[#f6f8f8] ring-1 ring-black/10 shadow-2xl">
        <div className="sticky top-0 bg-[#f6f8f8] border-b border-black/10 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-brand-teal">Admin</div>
            <h2 className="text-2xl font-editorial italic">Configuration Console</h2>
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/40 mt-1">
              Agent behavior, live interaction, and media direction controls
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xs uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity"
          >
            Close
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-8 max-h-[72vh] overflow-y-auto">
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
              <section className="space-y-4 border border-black/10 bg-white p-5 md:p-6">
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

              <section className="space-y-4 border border-black/10 bg-white p-5 md:p-6">
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
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Core ROM Overlay (applies to all agents)</label>
                    <textarea
                      value={config.prompts.rom_appendix}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                prompts: { ...prev.prompts, rom_appendix: e.target.value },
                              }
                            : prev
                        )
                      }
                      className="w-full min-h-24 border border-black/10 focus-border-brand-teal outline-none p-3 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Live Voice/Video Overlay</label>
                    <textarea
                      value={config.prompts.live_appendix}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                prompts: { ...prev.prompts, live_appendix: e.target.value },
                              }
                            : prev
                        )
                      }
                      className="w-full min-h-24 border border-black/10 focus-border-brand-teal outline-none p-3 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Art Director Overlay</label>
                    <textarea
                      value={config.prompts.art_director_appendix}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                prompts: { ...prev.prompts, art_director_appendix: e.target.value },
                              }
                            : prev
                        )
                      }
                      className="w-full min-h-24 border border-black/10 focus-border-brand-teal outline-none p-3 text-sm"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4 border border-black/10 bg-white p-5 md:p-6">
                <div className="text-[10px] uppercase tracking-widest opacity-50">Agentic Media Routing</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Image Model (Nano Banana route)</label>
                    <input
                      value={config.media.image_model}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                media: { ...prev.media, image_model: e.target.value },
                              }
                            : prev
                        )
                      }
                      className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Video Model (Veo route)</label>
                    <input
                      value={config.media.video_model}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                media: { ...prev.media, video_model: e.target.value },
                              }
                            : prev
                        )
                      }
                      className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Image Aspect Ratio</label>
                    <input
                      value={config.media.image_aspect_ratio}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                media: { ...prev.media, image_aspect_ratio: e.target.value },
                              }
                            : prev
                        )
                      }
                      className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Video Aspect Ratio</label>
                    <input
                      value={config.media.video_aspect_ratio}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                media: { ...prev.media, video_aspect_ratio: e.target.value },
                              }
                            : prev
                        )
                      }
                      className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Video Duration (seconds)</label>
                    <input
                      type="number"
                      min={4}
                      max={12}
                      value={config.media.video_duration_seconds}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                media: {
                                  ...prev.media,
                                  video_duration_seconds: Number(e.target.value),
                                },
                              }
                            : prev
                        )
                      }
                      className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Narrative Lens</label>
                    <input
                      value={config.media.narrative_lens}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                media: { ...prev.media, narrative_lens: e.target.value },
                              }
                            : prev
                        )
                      }
                      className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Image Style Direction</label>
                    <textarea
                      value={config.media.image_style}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                media: { ...prev.media, image_style: e.target.value },
                              }
                            : prev
                        )
                      }
                      className="w-full min-h-20 border border-black/10 focus-border-brand-teal outline-none p-3 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Video Style Direction</label>
                    <textarea
                      value={config.media.video_style}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                media: { ...prev.media, video_style: e.target.value },
                              }
                            : prev
                        )
                      }
                      className="w-full min-h-20 border border-black/10 focus-border-brand-teal outline-none p-3 text-sm"
                    />
                  </div>
                </div>

                <div className="border-t border-black/10 pt-5 space-y-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-black/50">External Media Library</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Add YouTube/Vimeo/social links or playlists, then target by user segment and journey step.
                      </div>
                    </div>
                    <label className="flex items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={config.media.external_media_enabled}
                        onChange={(e) =>
                          setConfig((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  media: { ...prev.media, external_media_enabled: e.target.checked },
                                }
                              : prev
                          )
                        }
                      />
                      External library enabled
                    </label>
                  </div>

                  <div className="space-y-3">
                    {config.media.curated_library.map((item, index) => (
                      <div key={item.id || `media-${index}`} className="border border-black/10 bg-[#fafcfc] p-4 space-y-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">Media Item {index + 1}</div>
                          <button
                            type="button"
                            onClick={() => removeMediaItem(index)}
                            className="text-[10px] uppercase tracking-[0.2em] text-red-600/80 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="flex items-center gap-3 text-sm md:col-span-2">
                            <input
                              type="checkbox"
                              checked={item.enabled}
                              onChange={(e) => updateMediaItem(index, (prev) => ({ ...prev, enabled: e.target.checked }))}
                            />
                            Enabled
                          </label>
                          <div className="space-y-2">
                            <label className="text-xs text-gray-700">Title</label>
                            <input
                              value={item.title}
                              onChange={(e) => updateMediaItem(index, (prev) => ({ ...prev, title: e.target.value }))}
                              className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs text-gray-700">Subtitle</label>
                            <input
                              value={item.subtitle}
                              onChange={(e) => updateMediaItem(index, (prev) => ({ ...prev, subtitle: e.target.value }))}
                              className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-xs text-gray-700">Video or Playlist URL</label>
                            <input
                              value={item.source_url}
                              onChange={(e) => updateMediaItem(index, (prev) => ({ ...prev, source_url: e.target.value }))}
                              placeholder="https://www.youtube.com/watch?v=... or playlist URL"
                              className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs text-gray-700">Platform</label>
                            <select
                              value={item.platform}
                              onChange={(e) =>
                                updateMediaItem(index, (prev) => ({
                                  ...prev,
                                  platform: (e.target.value as MediaPlatform) || 'auto',
                                }))
                              }
                              className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm bg-transparent"
                            >
                              {EXTERNAL_PLATFORMS.map((platform) => (
                                <option key={platform} value={platform}>
                                  {platform}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs text-gray-700">Source Type</label>
                            <select
                              value={item.source_kind}
                              onChange={(e) =>
                                updateMediaItem(index, (prev) => ({
                                  ...prev,
                                  source_kind: (e.target.value as MediaSourceKind) || 'single',
                                }))
                              }
                              className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm bg-transparent"
                            >
                              {SOURCE_KINDS.map((kind) => (
                                <option key={kind} value={kind}>
                                  {kind}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs text-gray-700">Priority</label>
                            <input
                              type="number"
                              min={1}
                              max={999}
                              value={item.priority}
                              onChange={(e) =>
                                updateMediaItem(index, (prev) => ({
                                  ...prev,
                                  priority: Number(e.target.value || 100),
                                }))
                              }
                              className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs text-gray-700">Audience</label>
                            <select
                              value={item.rule.audience}
                              onChange={(e) =>
                                updateMediaItem(index, (prev) => ({
                                  ...prev,
                                  rule: {
                                    ...prev.rule,
                                    audience: (e.target.value as MediaAudience) || 'all',
                                  },
                                }))
                              }
                              className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm bg-transparent"
                            >
                              {AUDIENCES.map((audience) => (
                                <option key={audience} value={audience}>
                                  {audience}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-xs text-gray-700">Thumbnail URL (optional)</label>
                            <input
                              value={item.thumbnail_url}
                              onChange={(e) =>
                                updateMediaItem(index, (prev) => ({ ...prev, thumbnail_url: e.target.value }))
                              }
                              className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-xs text-gray-700">Tags (comma separated)</label>
                            <input
                              value={item.tags.join(', ')}
                              onChange={(e) =>
                                updateMediaItem(index, (prev) => ({
                                  ...prev,
                                  tags: e.target.value
                                    .split(',')
                                    .map((entry) => entry.trim())
                                    .filter(Boolean),
                                }))
                              }
                              className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">Journey Surfaces</div>
                          <div className="flex flex-wrap gap-2">
                            {JOURNEY_SURFACES.map((surface) => {
                              const active = item.surfaces.includes(surface);
                              return (
                                <button
                                  key={surface}
                                  type="button"
                                  onClick={() =>
                                    updateMediaItem(index, (prev) => ({
                                      ...prev,
                                      surfaces: active
                                        ? prev.surfaces.filter((entry) => entry !== surface)
                                        : [...prev.surfaces, surface],
                                    }))
                                  }
                                  className={`px-3 py-2 text-[10px] uppercase tracking-[0.16em] border transition-colors ${
                                    active
                                      ? 'border-brand-teal bg-brand-soft text-brand-teal'
                                      : 'border-black/10 hover-border-brand-teal'
                                  }`}
                                >
                                  {surface}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          <div className="space-y-2">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">Intent Filters</div>
                            <div className="flex flex-wrap gap-2">
                              {CLIENT_INTENTS.map((intent) => {
                                const active = item.rule.intents.includes(intent);
                                return (
                                  <button
                                    key={intent}
                                    type="button"
                                    onClick={() =>
                                      updateMediaItem(index, (prev) => ({
                                        ...prev,
                                        rule: {
                                          ...prev.rule,
                                          intents: active
                                            ? prev.rule.intents.filter((entry) => entry !== intent)
                                            : [...prev.rule.intents, intent],
                                        },
                                      }))
                                    }
                                    className={`px-3 py-2 text-[10px] uppercase tracking-[0.16em] border transition-colors ${
                                      active
                                        ? 'border-brand-teal bg-brand-soft text-brand-teal'
                                        : 'border-black/10 hover-border-brand-teal'
                                    }`}
                                  >
                                    {intent}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">Focus Filters</div>
                            <div className="flex flex-wrap gap-2">
                              {FOCUS_PREFS.map((focus) => {
                                const active = item.rule.focuses.includes(focus);
                                return (
                                  <button
                                    key={focus}
                                    type="button"
                                    onClick={() =>
                                      updateMediaItem(index, (prev) => ({
                                        ...prev,
                                        rule: {
                                          ...prev.rule,
                                          focuses: active
                                            ? prev.rule.focuses.filter((entry) => entry !== focus)
                                            : [...prev.rule.focuses, focus],
                                        },
                                      }))
                                    }
                                    className={`px-3 py-2 text-[10px] uppercase tracking-[0.16em] border transition-colors ${
                                      active
                                        ? 'border-brand-teal bg-brand-soft text-brand-teal'
                                        : 'border-black/10 hover-border-brand-teal'
                                    }`}
                                  >
                                    {focus}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">Pace Filters</div>
                            <div className="flex flex-wrap gap-2">
                              {PACE_PREFS.map((pace) => {
                                const active = item.rule.paces.includes(pace);
                                return (
                                  <button
                                    key={pace}
                                    type="button"
                                    onClick={() =>
                                      updateMediaItem(index, (prev) => ({
                                        ...prev,
                                        rule: {
                                          ...prev.rule,
                                          paces: active
                                            ? prev.rule.paces.filter((entry) => entry !== pace)
                                            : [...prev.rule.paces, pace],
                                        },
                                      }))
                                    }
                                    className={`px-3 py-2 text-[10px] uppercase tracking-[0.16em] border transition-colors ${
                                      active
                                        ? 'border-brand-teal bg-brand-soft text-brand-teal'
                                        : 'border-black/10 hover-border-brand-teal'
                                    }`}
                                  >
                                    {pace}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addMediaItem}
                    className="px-4 py-2 border border-black/20 text-[10px] uppercase tracking-[0.2em] hover-border-brand-teal"
                  >
                    Add External Media Item
                  </button>
                </div>
              </section>

              <section className="space-y-4 border border-black/10 bg-white p-5 md:p-6">
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
                      checked={config.operations.cjs_enabled}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                operations: { ...prev.operations, cjs_enabled: e.target.checked },
                              }
                            : prev
                        )
                      }
                    />
                    ConciergeJobSearch execution enabled
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
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={config.media.enabled}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                media: { ...prev.media, enabled: e.target.checked },
                              }
                            : prev
                        )
                      }
                    />
                    Agentic media enabled
                  </label>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={config.media.video_generate_audio}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                media: { ...prev.media, video_generate_audio: e.target.checked },
                              }
                            : prev
                        )
                      }
                    />
                    Generate video audio
                  </label>
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={config.media.auto_generate_on_episode}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                media: { ...prev.media, auto_generate_on_episode: e.target.checked },
                              }
                            : prev
                        )
                      }
                    />
                    Auto-generate media on episode load
                  </label>
                </div>
              </section>

              <section className="space-y-4 border border-black/10 bg-white p-5 md:p-6">
                <div className="text-[10px] uppercase tracking-widest opacity-50">Voice Engine</div>
                <div className="text-xs text-gray-600">
                  Pick a voice posture first, then open studio tuning only when you need deeper control.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {VOICE_PRESETS.map((preset) => {
                    const active =
                      config.voice.temperature === preset.temperature &&
                      config.voice.live_vad_silence_ms === preset.live_vad_silence_ms &&
                      config.voice.live_vad_prefix_padding_ms === preset.live_vad_prefix_padding_ms &&
                      config.voice.live_vad_start_sensitivity === preset.live_vad_start_sensitivity &&
                      config.voice.live_vad_end_sensitivity === preset.live_vad_end_sensitivity;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyVoicePreset(preset)}
                        className={`text-left border p-3 transition-all ${
                          active
                            ? 'border-brand-teal bg-brand-soft shadow-[0_8px_24px_rgba(0,0,0,0.04)]'
                            : 'border-black/10 hover-border-brand-teal bg-white'
                        }`}
                      >
                        <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">Voice Preset</div>
                        <div className="mt-2 text-lg font-editorial italic">{preset.label}</div>
                        <div className="mt-1 text-xs text-gray-600 leading-relaxed">{preset.summary}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={config.voice.enabled}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                voice: { ...prev.voice, enabled: e.target.checked },
                              }
                            : prev
                        )
                      }
                    />
                    Voice synthesis enabled
                  </label>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Provider</label>
                    <select
                      value={config.voice.provider}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                voice: {
                                  ...prev.voice,
                                  provider: e.target.value === 'gemini_live' ? 'gemini_live' : 'sesame',
                                },
                              }
                            : prev
                        )
                      }
                      className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm bg-transparent"
                    >
                      <option value="sesame">sesame</option>
                      <option value="gemini_live">gemini_live</option>
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs text-gray-700">
                      {config.voice.provider === 'sesame'
                        ? 'Sesame API URL (Cerebrium endpoint)'
                        : 'Gemini Live model route (kept for parity, not required)'}
                    </label>
                    <input
                      value={config.voice.api_url}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                voice: { ...prev.voice, api_url: e.target.value },
                              }
                            : prev
                        )
                      }
                      placeholder={
                        config.voice.provider === 'sesame'
                          ? 'https://api.cortex.cerebrium.ai/v4/PROJECT/APP/generate_audio'
                          : 'optional override'
                      }
                      className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Speaker</label>
                    <input
                      value={config.voice.speaker}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                voice: { ...prev.voice, speaker: e.target.value },
                              }
                            : prev
                        )
                      }
                      placeholder="Maya"
                      className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Gemini Live Model</label>
                    <input
                      value={config.voice.gemini_live_model}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                voice: { ...prev.voice, gemini_live_model: e.target.value },
                              }
                            : prev
                        )
                      }
                      className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Gemini Voice Name</label>
                    <input
                      value={config.voice.gemini_voice_name}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                voice: { ...prev.voice, gemini_voice_name: e.target.value },
                              }
                            : prev
                        )
                      }
                      placeholder="Aoede"
                      className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="border-t border-black/10 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedVoice((prev) => !prev)}
                    className="text-[10px] uppercase tracking-[0.22em] text-black/50 hover-text-brand-teal transition-colors"
                  >
                    {showAdvancedVoice ? 'Hide Studio Tuning' : 'Show Studio Tuning'}
                  </button>

                  {showAdvancedVoice && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 animate-[fadeUp_280ms_ease-out]">
                      <div className="space-y-2">
                        <label className="text-xs text-gray-700">Max Audio Length (ms)</label>
                        <input
                          type="number"
                          min={3000}
                          max={30000}
                          value={config.voice.max_audio_length_ms}
                          onChange={(e) =>
                            setConfig((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    voice: { ...prev.voice, max_audio_length_ms: Number(e.target.value) },
                                  }
                                : prev
                            )
                          }
                          className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-gray-700">Voice Temperature</label>
                        <input
                          type="number"
                          min={0.1}
                          max={1.5}
                          step="0.05"
                          value={config.voice.temperature}
                          onChange={(e) =>
                            setConfig((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    voice: { ...prev.voice, temperature: Number(e.target.value) },
                                  }
                                : prev
                            )
                          }
                          className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-gray-700">VAD Silence Window (ms)</label>
                        <input
                          type="number"
                          min={180}
                          max={2000}
                          value={config.voice.live_vad_silence_ms}
                          onChange={(e) =>
                            setConfig((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    voice: { ...prev.voice, live_vad_silence_ms: Number(e.target.value) },
                                  }
                                : prev
                            )
                          }
                          className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-gray-700">VAD Prefix Padding (ms)</label>
                        <input
                          type="number"
                          min={0}
                          max={600}
                          value={config.voice.live_vad_prefix_padding_ms}
                          onChange={(e) =>
                            setConfig((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    voice: { ...prev.voice, live_vad_prefix_padding_ms: Number(e.target.value) },
                                  }
                                : prev
                            )
                          }
                          className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-gray-700">Start-of-Speech Sensitivity</label>
                        <select
                          value={config.voice.live_vad_start_sensitivity}
                          onChange={(e) =>
                            setConfig((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    voice: {
                                      ...prev.voice,
                                      live_vad_start_sensitivity: e.target.value === 'low' ? 'low' : 'high',
                                    },
                                  }
                                : prev
                            )
                          }
                          className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm bg-transparent"
                        >
                          <option value="high">high</option>
                          <option value="low">low</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-gray-700">End-of-Speech Sensitivity</label>
                        <select
                          value={config.voice.live_vad_end_sensitivity}
                          onChange={(e) =>
                            setConfig((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    voice: {
                                      ...prev.voice,
                                      live_vad_end_sensitivity: e.target.value === 'low' ? 'low' : 'high',
                                    },
                                  }
                                : prev
                            )
                          }
                          className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm bg-transparent"
                        >
                          <option value="high">high</option>
                          <option value="low">low</option>
                        </select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs text-gray-700">Narration Style Hint</label>
                        <textarea
                          value={config.voice.narration_style}
                          onChange={(e) =>
                            setConfig((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    voice: { ...prev.voice, narration_style: e.target.value },
                                  }
                                : prev
                            )
                          }
                          className="w-full min-h-20 border border-black/10 focus-border-brand-teal outline-none p-3 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-4 border border-black/10 bg-white p-5 md:p-6">
                <div className="text-[10px] uppercase tracking-widest opacity-50">Access & Entitlements</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={config.operations.onboarding_email_enabled}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                operations: {
                                  ...prev.operations,
                                  onboarding_email_enabled: e.target.checked,
                                },
                              }
                            : prev
                        )
                      }
                    />
                    Onboarding email workflow enabled
                  </label>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Intro Course Offer Label</label>
                    <input
                      value={config.operations.intro_course_offer}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                operations: { ...prev.operations, intro_course_offer: e.target.value },
                              }
                            : prev
                        )
                      }
                      className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-700">Curriculum Code</label>
                    <input
                      value={config.operations.curriculum_code}
                      onChange={(e) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                operations: { ...prev.operations, curriculum_code: e.target.value },
                              }
                            : prev
                        )
                      }
                      className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
                    />
                  </div>
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
