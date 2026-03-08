import React, { useMemo, useState } from 'react';
import { AppConfig, BrandConfig, BrandModuleCopy, SuiteModuleId } from '../../types';
import {
  BRAND_BODY_DENSITIES,
  BRAND_HEADER_SCALES,
  BRAND_MODULE_IDS,
  BRAND_OVERLAY_STYLES,
  BRAND_SUBHEADER_SCALES,
  BRAND_TILE_EMPHASES,
  DEFAULT_BRAND_CONFIG,
  getBrandModuleCopy,
  hexToRgba,
} from '../../config/brandSystem.js';

type Props = {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig | null>>;
};

const LABELS: Record<SuiteModuleId, string> = {
  intake: '01 Smart Start Intake',
  episodes: '02 Episodes',
  tv: '03 SkillSync AI TV',
  flash_cards: '04 Flash Cards',
  brief: '05 Brief',
  suite_distilled: '06 Distilled',
  profile: '07 Profile',
  ai_profile: '08 AI Profile',
  gaps: '09 Gaps',
  readiness: '10 AI Readiness',
  my_concierge: '11 MyConcierge',
  events: '12 Events & Networking',
  telescope: '13 Telescope',
  team: '14 SkillSync AI Team',
  cjs_execution: '15 ConciergeJobSearch',
  plan: '16 Plan',
  assets: '17 Assets',
  roadmap: '18 Roadmap',
};

const BRAND_DEFAULTS = DEFAULT_BRAND_CONFIG as BrandConfig;
const MODULE_IDS = BRAND_MODULE_IDS as SuiteModuleId[];

const headerScaleClass = {
  compact: 'text-2xl md:text-[30px]',
  standard: 'text-3xl md:text-[38px]',
  hero: 'text-4xl md:text-[46px]',
};

const subheaderScaleClass = {
  tight: 'text-[9px] tracking-[0.18em]',
  standard: 'text-[10px] tracking-[0.24em]',
  airy: 'text-[10px] tracking-[0.32em]',
};

const bodyDensityClass = {
  tight: 'text-xs leading-5',
  standard: 'text-sm leading-6',
  relaxed: 'text-sm leading-7',
};

const titleEmphasisClass = {
  index: 'text-lg md:text-xl',
  balanced: 'text-xl md:text-2xl',
  title: 'text-2xl md:text-[30px]',
};

const indexEmphasisClass = {
  index: 'text-sm opacity-55',
  balanced: 'text-xs opacity-35',
  title: 'text-[10px] opacity-25',
};

const optionLabel = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const Field = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => (
  <label className="space-y-2">
    <div className="text-xs text-gray-700">{label}</div>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm bg-transparent"
    />
  </label>
);

const TextAreaField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <label className="space-y-2">
    <div className="text-xs text-gray-700">{label}</div>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full min-h-20 border border-black/10 focus-border-brand-teal outline-none p-3 text-sm bg-white"
    />
  </label>
);

const ColorField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <label className="space-y-2">
    <div className="text-xs text-gray-700">{label}</div>
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="h-10 w-14 border border-black/10 bg-transparent p-1"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="flex-1 border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm bg-transparent"
      />
    </div>
  </label>
);

const SelectField = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) => (
  <label className="space-y-2">
    <div className="text-xs text-gray-700">{label}</div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm bg-transparent"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {optionLabel(option)}
        </option>
      ))}
    </select>
  </label>
);

const overlayRailStyle = (brand: BrandConfig): React.CSSProperties => {
  if (brand.hierarchy.overlay_style === 'minimal') {
    return {
      backgroundColor: brand.colors.surface_background,
      color: brand.colors.ink,
      borderRight: `1px solid ${brand.colors.grid_line}`,
    };
  }
  if (brand.hierarchy.overlay_style === 'cinematic') {
    return {
      background: `linear-gradient(165deg, ${brand.colors.overlay_background} 0%, ${brand.colors.ink} 100%)`,
      color: brand.colors.overlay_text,
    };
  }
  return {
    backgroundColor: brand.colors.overlay_background,
    color: brand.colors.overlay_text,
  };
};

function Preview({ brand, selectedModuleId }: { brand: BrandConfig; selectedModuleId: SuiteModuleId }) {
  const activeModule = getBrandModuleCopy(brand, selectedModuleId);
  const secondaryModule = getBrandModuleCopy(brand, 'plan');
  const accentSoft = hexToRgba(brand.colors.accent, 0.16);

  return (
    <div
      className="border overflow-hidden shadow-[0_24px_48px_-30px_rgba(0,0,0,0.24)]"
      style={{
        backgroundColor: brand.colors.page_background,
        borderColor: brand.colors.grid_line,
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: brand.colors.grid_line, backgroundColor: brand.colors.surface_background }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {brand.toggles.show_logo_mark && brand.identity.logo_url ? (
            <img src={brand.identity.logo_url} alt={brand.identity.logo_alt} className="h-8 w-8 object-contain" />
          ) : (
            <div
              className="h-8 w-8 border flex items-center justify-center text-[9px] uppercase tracking-[0.18em]"
              style={{ borderColor: brand.colors.grid_line, color: brand.colors.accent_dark }}
            >
              Ai
            </div>
          )}
          <div className="min-w-0">
            <div className={`uppercase ${subheaderScaleClass[brand.hierarchy.subheader_scale]}`} style={{ color: brand.colors.accent_dark }}>
              {brand.identity.product_name}
            </div>
            <div className="truncate text-xs text-black/50">{brand.identity.header_context}</div>
          </div>
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-black/35">Preview</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.35fr]">
        <div className="p-5 md:p-6 flex flex-col justify-between min-h-[280px]" style={overlayRailStyle(brand)}>
          <div>
            <div className={`uppercase ${subheaderScaleClass[brand.hierarchy.subheader_scale]}`} style={{ color: brand.colors.accent }}>
              {activeModule.eyebrow}
            </div>
            <div className={`mt-3 font-editorial italic leading-none ${headerScaleClass[brand.hierarchy.header_scale]}`}>
              {activeModule.detail_title}
            </div>
            {brand.toggles.show_detail_quotes && (
              <p
                className={`mt-5 border-l pl-4 font-editorial italic ${bodyDensityClass[brand.hierarchy.body_density]}`}
                style={{ borderColor: brand.colors.accent, color: hexToRgba(brand.colors.overlay_text, 0.82) }}
              >
                "{activeModule.detail_quote}"
              </p>
            )}
          </div>
          <div className="mt-8">
            <div className="text-[10px] uppercase tracking-[0.2em] opacity-45">{brand.copy.modal_account_label}</div>
            <div className="mt-2 text-xs opacity-70">client@example.com</div>
          </div>
        </div>

        <div className="p-5 md:p-6" style={{ backgroundColor: brand.colors.surface_background, color: brand.colors.ink }}>
          {brand.toggles.show_suite_kicker && (
            <div className={`uppercase ${subheaderScaleClass[brand.hierarchy.subheader_scale]}`} style={{ color: brand.colors.accent_dark }}>
              {brand.copy.home_kicker}
            </div>
          )}
          <div className={`mt-3 font-editorial italic leading-tight ${headerScaleClass[brand.hierarchy.header_scale]}`}>
            {brand.copy.home_title}
          </div>
          <p className={`mt-4 max-w-xl text-black/60 ${bodyDensityClass[brand.hierarchy.body_density]}`}>
            {brand.copy.home_description}
          </p>

          {brand.toggles.show_home_callout && (
            <div
              className="mt-5 inline-flex items-center gap-3 border px-4 py-2 text-[10px] uppercase tracking-[0.2em]"
              style={{ borderColor: brand.colors.grid_line, backgroundColor: accentSoft }}
            >
              <span style={{ color: brand.colors.accent_dark }}>{brand.copy.home_callout_label}</span>
              <span className="text-black/55">{brand.copy.home_callout_value}</span>
            </div>
          )}

          <div
            className="mt-6 grid gap-px border"
            style={{
              borderColor: brand.colors.grid_line,
              backgroundColor: brand.colors.grid_line,
              boxShadow: brand.toggles.show_grid_glow
                ? `0 20px 40px -28px ${hexToRgba(brand.colors.accent_dark, 0.45)}`
                : 'none',
            }}
          >
            {[activeModule, secondaryModule].map((moduleCopy, index) => (
              <article
                key={`${moduleCopy.title}-${index}`}
                className="p-4"
                style={{ backgroundColor: brand.colors.surface_background }}
              >
                <div className="flex items-start justify-between gap-3">
                  {brand.toggles.show_module_indices ? (
                    <div className={`font-mono ${indexEmphasisClass[brand.hierarchy.tile_emphasis]}`}>
                      {String(index + 1).padStart(2, '0')}
                    </div>
                  ) : (
                    <span />
                  )}
                  {brand.toggles.show_module_status && (
                    <div
                      className={`uppercase ${subheaderScaleClass[brand.hierarchy.subheader_scale]}`}
                      style={{ color: brand.colors.accent_dark }}
                    >
                      {brand.copy.module_ready_label}
                    </div>
                  )}
                </div>
                <div className="mt-6">
                  <div
                    className={`uppercase ${subheaderScaleClass[brand.hierarchy.subheader_scale]}`}
                    style={{ color: brand.colors.accent_dark }}
                  >
                    {moduleCopy.eyebrow}
                  </div>
                  <div className={`mt-2 font-editorial leading-tight ${titleEmphasisClass[brand.hierarchy.tile_emphasis]}`}>
                    {moduleCopy.title}
                  </div>
                  {brand.toggles.show_tile_descriptions && (
                    <p className={`mt-3 text-black/60 ${bodyDensityClass[brand.hierarchy.body_density]}`}>
                      {moduleCopy.description}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BrandStudioSection({ config, setConfig }: Props) {
  const [selectedModuleId, setSelectedModuleId] = useState<SuiteModuleId>('intake');
  const selectedModule = useMemo(
    () => getBrandModuleCopy(config.brand as BrandConfig, selectedModuleId),
    [config.brand, selectedModuleId]
  );

  const patchBrand = (updater: (brand: BrandConfig) => BrandConfig) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        brand: updater(prev.brand),
      };
    });
  };

  const patchModule = (field: keyof BrandModuleCopy, value: string) => {
    patchBrand((brand) => ({
      ...brand,
      modules: {
        ...brand.modules,
        [selectedModuleId]: {
          ...getBrandModuleCopy(brand, selectedModuleId),
          [field]: value,
        },
      },
    }));
  };

  const brand = (config.brand || BRAND_DEFAULTS) as BrandConfig;

  return (
    <section className="space-y-5 border border-black/10 bg-white p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal">Brand Studio</div>
          <h3 className="mt-2 text-3xl font-editorial italic leading-none">Editorial grid hierarchy and branding.</h3>
        </div>
        <div className="max-w-xl text-xs leading-relaxed text-gray-600">
          Ordered from identity to module detail so Jim can tune the shell top-down. The preview mirrors the home grid
          and module overlay using the same saved config.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <div className="space-y-4 border border-black/10 bg-[#fbfaf7] p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">1. Identity</div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label="Company Name"
                value={brand.identity.company_name}
                onChange={(value) =>
                  patchBrand((prev) => ({
                    ...prev,
                    identity: { ...prev.identity, company_name: value },
                  }))
                }
              />
              <Field
                label="Suite Name"
                value={brand.identity.suite_name}
                onChange={(value) =>
                  patchBrand((prev) => ({
                    ...prev,
                    identity: { ...prev.identity, suite_name: value },
                  }))
                }
              />
              <Field
                label="Product Name"
                value={brand.identity.product_name}
                onChange={(value) =>
                  patchBrand((prev) => ({
                    ...prev,
                    identity: { ...prev.identity, product_name: value },
                  }))
                }
              />
              <Field
                label="Header Context"
                value={brand.identity.header_context}
                onChange={(value) =>
                  patchBrand((prev) => ({
                    ...prev,
                    identity: { ...prev.identity, header_context: value },
                  }))
                }
              />
              <Field
                label="Logo URL"
                value={brand.identity.logo_url}
                placeholder="https://..."
                onChange={(value) =>
                  patchBrand((prev) => ({
                    ...prev,
                    identity: { ...prev.identity, logo_url: value },
                  }))
                }
              />
              <Field
                label="Logo Alt Text"
                value={brand.identity.logo_alt}
                onChange={(value) =>
                  patchBrand((prev) => ({
                    ...prev,
                    identity: { ...prev.identity, logo_alt: value },
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-4 border border-black/10 bg-[#fbfaf7] p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">2. Color System</div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ColorField
                label="Accent"
                value={brand.colors.accent}
                onChange={(value) => patchBrand((prev) => ({ ...prev, colors: { ...prev.colors, accent: value } }))}
              />
              <ColorField
                label="Accent Dark"
                value={brand.colors.accent_dark}
                onChange={(value) =>
                  patchBrand((prev) => ({ ...prev, colors: { ...prev.colors, accent_dark: value } }))
                }
              />
              <ColorField
                label="Ink"
                value={brand.colors.ink}
                onChange={(value) => patchBrand((prev) => ({ ...prev, colors: { ...prev.colors, ink: value } }))}
              />
              <ColorField
                label="Page Background"
                value={brand.colors.page_background}
                onChange={(value) =>
                  patchBrand((prev) => ({ ...prev, colors: { ...prev.colors, page_background: value } }))
                }
              />
              <ColorField
                label="Surface Background"
                value={brand.colors.surface_background}
                onChange={(value) =>
                  patchBrand((prev) => ({ ...prev, colors: { ...prev.colors, surface_background: value } }))
                }
              />
              <ColorField
                label="Grid Line"
                value={brand.colors.grid_line}
                onChange={(value) =>
                  patchBrand((prev) => ({ ...prev, colors: { ...prev.colors, grid_line: value } }))
                }
              />
              <ColorField
                label="Overlay Background"
                value={brand.colors.overlay_background}
                onChange={(value) =>
                  patchBrand((prev) => ({ ...prev, colors: { ...prev.colors, overlay_background: value } }))
                }
              />
              <ColorField
                label="Overlay Text"
                value={brand.colors.overlay_text}
                onChange={(value) =>
                  patchBrand((prev) => ({ ...prev, colors: { ...prev.colors, overlay_text: value } }))
                }
              />
            </div>
          </div>

          <div className="space-y-4 border border-black/10 bg-[#fbfaf7] p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">3. Visual Hierarchy</div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SelectField
                label="Header Scale"
                value={brand.hierarchy.header_scale}
                options={BRAND_HEADER_SCALES}
                onChange={(value) =>
                  patchBrand((prev) => ({
                    ...prev,
                    hierarchy: { ...prev.hierarchy, header_scale: value as BrandConfig['hierarchy']['header_scale'] },
                  }))
                }
              />
              <SelectField
                label="Subheader Scale"
                value={brand.hierarchy.subheader_scale}
                options={BRAND_SUBHEADER_SCALES}
                onChange={(value) =>
                  patchBrand((prev) => ({
                    ...prev,
                    hierarchy: { ...prev.hierarchy, subheader_scale: value as BrandConfig['hierarchy']['subheader_scale'] },
                  }))
                }
              />
              <SelectField
                label="Body Density"
                value={brand.hierarchy.body_density}
                options={BRAND_BODY_DENSITIES}
                onChange={(value) =>
                  patchBrand((prev) => ({
                    ...prev,
                    hierarchy: { ...prev.hierarchy, body_density: value as BrandConfig['hierarchy']['body_density'] },
                  }))
                }
              />
              <SelectField
                label="Tile Emphasis"
                value={brand.hierarchy.tile_emphasis}
                options={BRAND_TILE_EMPHASES}
                onChange={(value) =>
                  patchBrand((prev) => ({
                    ...prev,
                    hierarchy: { ...prev.hierarchy, tile_emphasis: value as BrandConfig['hierarchy']['tile_emphasis'] },
                  }))
                }
              />
              <SelectField
                label="Overlay Style"
                value={brand.hierarchy.overlay_style}
                options={BRAND_OVERLAY_STYLES}
                onChange={(value) =>
                  patchBrand((prev) => ({
                    ...prev,
                    hierarchy: { ...prev.hierarchy, overlay_style: value as BrandConfig['hierarchy']['overlay_style'] },
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-4 border border-black/10 bg-[#fbfaf7] p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">4. Shell Copy</div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label="Home Kicker"
                value={brand.copy.home_kicker}
                onChange={(value) => patchBrand((prev) => ({ ...prev, copy: { ...prev.copy, home_kicker: value } }))}
              />
              <Field
                label="Home Callout Label"
                value={brand.copy.home_callout_label}
                onChange={(value) =>
                  patchBrand((prev) => ({ ...prev, copy: { ...prev.copy, home_callout_label: value } }))
                }
              />
              <TextAreaField
                label="Home Title"
                value={brand.copy.home_title}
                onChange={(value) => patchBrand((prev) => ({ ...prev, copy: { ...prev.copy, home_title: value } }))}
              />
              <TextAreaField
                label="Home Description"
                value={brand.copy.home_description}
                onChange={(value) =>
                  patchBrand((prev) => ({ ...prev, copy: { ...prev.copy, home_description: value } }))
                }
              />
              <TextAreaField
                label="Home Callout Value"
                value={brand.copy.home_callout_value}
                onChange={(value) =>
                  patchBrand((prev) => ({ ...prev, copy: { ...prev.copy, home_callout_value: value } }))
                }
              />
              <TextAreaField
                label="Free Tier Notice"
                value={brand.copy.free_tier_notice}
                onChange={(value) =>
                  patchBrand((prev) => ({ ...prev, copy: { ...prev.copy, free_tier_notice: value } }))
                }
              />
              <TextAreaField
                label="Prologue Quote"
                value={brand.copy.prologue_quote}
                onChange={(value) =>
                  patchBrand((prev) => ({ ...prev, copy: { ...prev.copy, prologue_quote: value } }))
                }
              />
              <TextAreaField
                label="Prologue Description"
                value={brand.copy.prologue_description}
                onChange={(value) =>
                  patchBrand((prev) => ({ ...prev, copy: { ...prev.copy, prologue_description: value } }))
                }
              />
            </div>
          </div>

          <div className="space-y-4 border border-black/10 bg-[#fbfaf7] p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">5. Display Toggles</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                ['show_logo_mark', 'Show logo in header'],
                ['show_suite_kicker', 'Show suite kicker'],
                ['show_module_indices', 'Show module indices'],
                ['show_module_status', 'Show module status'],
                ['show_tile_descriptions', 'Show tile descriptions'],
                ['show_detail_quotes', 'Show detail quote in overlay'],
                ['show_grid_glow', 'Show grid glow'],
                ['show_home_callout', 'Show home callout rail'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={brand.toggles[key as keyof BrandConfig['toggles']]}
                    onChange={(e) =>
                      patchBrand((prev) => ({
                        ...prev,
                        toggles: {
                          ...prev.toggles,
                          [key]: e.target.checked,
                        },
                      }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4 border border-black/10 bg-[#fbfaf7] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">6. Module Copy</div>
              <select
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value as SuiteModuleId)}
                className="border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm bg-transparent"
              >
                {MODULE_IDS.map((moduleId) => (
                  <option key={moduleId} value={moduleId}>
                    {LABELS[moduleId]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Eyebrow" value={selectedModule.eyebrow} onChange={(value) => patchModule('eyebrow', value)} />
              <Field label="Tile Title" value={selectedModule.title} onChange={(value) => patchModule('title', value)} />
              <TextAreaField
                label="Tile Description"
                value={selectedModule.description}
                onChange={(value) => patchModule('description', value)}
              />
              <Field
                label="Overlay Title"
                value={selectedModule.detail_title}
                onChange={(value) => patchModule('detail_title', value)}
              />
              <TextAreaField
                label="Overlay Quote"
                value={selectedModule.detail_quote}
                onChange={(value) => patchModule('detail_quote', value)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-black/45">Live Preview</div>
          <Preview brand={brand} selectedModuleId={selectedModuleId} />
        </div>
      </div>
    </section>
  );
}
