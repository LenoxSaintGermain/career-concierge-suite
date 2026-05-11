# E17 — Reference Flow Parity Backlog

> **Epic:** Close every gap between the `concierge-client-intake` reference project and the live Donna/DonnaChatLane experience.
>
> **Reference analyzed:** `/Volumes/Mini_2T/lenoxparis data/Downloads/concierge-client-intake`  
> **Analysis date:** 2026-05-10  
> **Branch base:** `LenoxSaintGermain/cc-intake-voice-hardening`

---

## Epic Summary

The reference project defines Jim's expected experience: a 5-step intake with path selection, target job/industry/comp collection, a cinematic 9-second DNA mapping animation, 6 scored Professional DNA Indicators, and a path-differentiated bespoke offerings menu with per-item intelligence briefs and a live price counter. Our implementation covers the concierge gate and calibration steps but stops short of the full offerings surface. This epic closes every measurable gap.

---

## Priority Legend

- **P0** — demo-blocking, must ship before Jim session
- **P1** — flow completeness, visible gap in the story arc
- **P2** — polish/upsell, notable but survivable for a first demo

---

## Stories

---

### E17-S01 · Pre-Purchase Intake Data Expansion
**Priority:** P0  
**Status:** Queued  
**Depends on:** E16-S01 (shipped)

#### What it is
The reference `TargetJobStep` collects four fields beyond what we currently capture in `intake_inline` for unauthenticated users: target industry (130+ dropdown), compensation range (12 bands), desired outcome (6-option select), and experience level. These feed the DNA indicators and the path-specific offerings resolver. Without them, the DNA reveal and offerings menu have no signal to personalise against.

#### Acceptance criteria
- [ ] `intake_inline` pre-purchase form gains three new fields after `ACT 01: TARGET`:
  - `ACT 02: INDUSTRY` — select, 130+ options (see list below)
  - `ACT 03: COMPENSATION` — select, 12 bands ($100k–$120k through $500k+)
  - `ACT 04: OUTCOME` — select: "New position / clients", "Professional Stability", "Professional Advancement", "Increased Compensation", "Increased Visibility", "Other" (text input when Other selected)
- [ ] ACT 02 replaces the current `ACT 02: PRESSURE` field — PRESSURE moves to ACT 05 (relabel, not remove)
- [ ] `prePurchaseAnswers` state extended: `{ name, targetRole, targetIndustry, salaryRange, desiredOutcome, otherOutcome, pressure, proof, supportPace }`
- [ ] `buildPrePurchaseSeed` maps new fields into `IntakeAnswers`: `target_sector`, `comp_range`, `desired_outcome`
- [ ] "Map my Professional DNA →" button disabled until `targetRole`, `targetIndustry`, `salaryRange`, and `desiredOutcome` are all filled
- [ ] `sessionContext` in `DonnaShell` updated to surface `target_sector` and `comp_range` when wiki is absent (unauthenticated)

#### Implementation notes
**Files:**
- Modify: `components/DonnaChatLane.tsx` — `prePurchaseAnswers` state, intake form JSX, `buildPrePurchaseSeed`, submit gate
- Modify: `components/DonnaShell.tsx` — `sessionContext` useMemo

**Industry list** (use verbatim from reference, 130+ values):
`"All Industries", "Accounting & Auditing", "Advertising", "Aerospace & Defense", "Agribusiness", "Agriculture", "Air Transportation", "Airlines", "Apparel & Fashion", "Architecture", "Arts & Culture", "Asset Management", "Assisted Living", "Automotive", "Banking", "Beauty & Personal Care", "Biotechnology", "Blockchain & Web3", "Bookkeeping", "Business Consulting", "Business Process Outsourcing (BPO)", "Cannabis Industry", "Charitable Organizations", "Chemical Manufacturing", "Child & Family Services", "Cloud Computing", "Coaching & Training", "Commercial Construction", "Commercial Real Estate", "Communications & Public Relations", "Community & Social Services", "Computer Hardware", "Consumer Electronics", "Consumer Goods", "Courier & Delivery Services", "Cruise Lines", "Cybersecurity", "Data Centers & Hosting Services", "Defense & Military", "Digital Marketing", "Drone Services", "E-Commerce", "Education (Higher)", "Education (K–12)", "EdTech", "Electrical & Specialty Trades", "Emergency Services", "Engineering", "Environmental Science", "Environmental Services", "Esports", "Event Planning", "Fashion", "Federal Government", "Film & Television", "FinTech", "Fishing", "Fitness & Wellness", "Food & Beverage Manufacturing", "Forestry", "Foundations & Philanthropy", "Freight & Logistics", "Game Development", "Gig Economy", "Graphic Design", "Grocery & Supermarkets", "Health Insurance", "Healthcare (Clinical)", "HealthTech", "Heavy & Civil Engineering", "Higher Education", "Home Furnishings", "Hospitals & Clinics", "Hotel & Resort Management", "Human Resources & Staffing", "Humanitarian Aid", "Industrial Machinery", "Influencer Marketing", "Information Technology (IT)", "Infrastructure", "Insurance", "Interior Design", "International Development", "Investment Management", "IT Services & Consulting", "Journalism & News Media", "Laboratories", "Landscaping & Groundskeeping", "Legal Services", "Life Sciences", "Local Government", "Machine Learning & AI", "Management Consulting", "Manufacturing (General)", "Market Research", "Maritime/Shipping", "Marketing", "Mechanical Trades", "Medical Devices", "Mental Health Services", "Metaverse & XR (AR/VR)", "Mining", "Mortgage & Lending", "Motion Pictures & Video", "Museums & Cultural Institutions", "Music Industry", "Natural Gas", "NGO / Nonprofit", "Nuclear Energy", "Nursing", "Oil & Gas Extraction", "Online Learning", "Outdoor Recreation", "Packaging & Printing", "Performing Arts", "Personal Services", "Pharmaceutical Production", "Philanthropy", "Photography", "Physical Therapy", "Plastics & Rubber", "Political Organizations", "Primary Education", "Private Equity", "Private Practice (Healthcare)", "Professional Sports", "Property Management", "Public Health", "Public Sector", "Publishing", "Rail Transportation", "Real Estate (Residential)", "Real Estate Development", "Recreation Management", "Renewable Energy", "Residential Building Construction", "Restaurant & Food Services", "Retail", "Ride-Share & Gig Platforms", "Scientific Research", "Secondary Education", "Security Services", "Social Media & Influencer Marketing", "Social Services", "Software Development", "Solar Energy", "Space Exploration & Technology", "Specialty Contractors", "Sports Coaching", "Sports Medicine", "Staffing & Recruiting", "State Government", "Streaming Services", "Supply Chain Management", "Talent Management", "Technology", "Technical Training", "Telecommunications", "Textile & Apparel Manufacturing", "Tourism", "Tour Operators", "Town & City Planning", "Trade & Vocational Training", "Transportation", "Travel Agencies", "Trucking", "Urban Planning", "Utilities (General)", "Venture Capital", "Video Game Development", "Visual Arts", "Vocational Education", "Warehousing & Storage", "Waste Management & Recycling", "Water & Wastewater Services", "Web Development", "Wellness Coaching", "Wind Energy"`

**Salary ranges:**
`"$100k–$120k", "$120k–$140k", "$140k–$160k", "$160k–$180k", "$180k–$200k", "$200k–$250k", "$250k–$300k", "$300k–$350k", "$350k–$400k", "$400k–$450k", "$450k–$500k", "$500K+"`

---

### E17-S02 · DNA Mapping Animation Upgrade
**Priority:** P0  
**Status:** Queued  
**Depends on:** E17-S01 (fields needed for "Target: {role}" label)

#### What it is
The reference `BespokeOfferingsStep` opens with a 9-second cinematic DNA mapping animation before revealing the scores and offering menu. Our `dna_processing` canvas state currently shows only a left-to-right scanner bar. The mapping animation is the "wow" moment Jim is expecting — it signals that the system is doing real intelligence work.

#### Acceptance criteria
- [ ] `dna_processing` canvas state renders a full-screen cinematic animation card:
  - **Rotating dashed orbit ring** (large, `w-48 h-48`, `border border-dashed`, slow 15s infinite rotate)
  - **DNA orb** centered inside the ring: `w-20 h-20 bg-[#07161A] border border-[#8DD9BF]/20 rounded-[20%]`, pulsing scale `[1, 1.15, 1]` with teal glow pulse `[0, 40px 10px rgba(141,217,191,0.2), 0]` on 2s loop
  - **"Mapping Professional DNA"** headline at 28px editorial italic
  - **Target subhead** `font-data text-[10px] uppercase tracking-[0.28em] text-[#8EA3A7]/50`: `"Target: {targetRole}"`
  - **3-phase cycling text** (animated swap, `AnimatePresence mode="wait"`): `Analyzing` → `Defining` → `Creating` — phase advances every 3s
  - **Category ticker** cycling 6 intelligence labels every 1s (see list below)
  - **Phase + category combined label**: `"{phase} {category}..."` in teal `font-data text-[11px] tracking-[0.3em]` with a `◆` prefix icon
- [ ] Animation duration: 9 seconds total (3 phases × 3s each), then auto-transitions to `dna_reveal`
- [ ] Scanning bar removed from `dna_processing`
- [ ] `targetRole` passed from `prePurchaseAnswers.targetRole` (or `getTargetRole()` for authenticated users)

#### Implementation notes
**Files:**
- Modify: `components/DonnaChatLane.tsx` — `dna_processing` render block in `renderA2UISlot`

**Intelligence categories to cycle:**
`"Recruiter Visibility", "AI Readiness", "Leadership Positioning", "Market Competitiveness", "Career Momentum", "Compensation Opportunity"`

**Phase → category text pattern:**
- Analyzing phase: `"Analyzing {category}..."`
- Defining phase: `"Defining {category}..."`
- Creating phase: `"Creating {item_title}..."` (cycle through first few offering item titles when available, fall back to categories)

**Timing:**
```
0–3s:   phase = "Analyzing", category ticks every 1s
3–6s:   phase = "Defining", category ticks every 1s
6–9s:   phase = "Creating", category ticks every 1s
9s:     setCanvasState('dna_reveal')
```

Use `useEffect` with `setInterval` / `setTimeout` inside the `dna_processing` branch, cleaned up on unmount or state change.

---

### E17-S03 · Professional DNA Indicators Grid
**Priority:** P0  
**Status:** Queued  
**Depends on:** E17-S02

#### What it is
After the DNA mapping animation resolves, the reference reveals 6 scored Professional DNA Indicator tiles before showing the narrative brief. These scores — Recruiter Visibility, AI Readiness, Leadership Strength, Market Competitiveness, Career Momentum, Comp Opportunity — are the visual proof that the system "read" the user. They are hardcoded in the reference but should be seeded from intake answers where derivable; otherwise fall back to demo values.

#### Acceptance criteria
- [ ] `dna_reveal` canvas state renders the 6 indicator tiles above the positioning/brief narrative:
  - **Eyebrow label**: `"PROFESSIONAL DNA INDICATORS"` in `font-data text-[10px] uppercase tracking-[0.28em] text-[#8EA3A7]/50`
  - **Grid**: `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4`
  - Each tile: `A2UICard` with `delay` stagger (0, 60, 120, 180, 240, 300ms)
  - Tile content: score label (`font-data text-[9px] uppercase tracking-widest opacity-40`), score value (`font-editorial text-2xl italic text-[#8DD9BF]`), animated progress bar (motion.div from 0 → value% on 1.5s delay)
  - Numeric values show `%` suffix; string values ("High") show as-is
- [ ] Score values derive from intake answers where possible using `deriveIndicatorScores(prePurchaseAnswers)`:
  - `Recruiter Visibility`: 55 + (resumeUploaded ? 7 : 0) + (linkedinUrl ? 5 : 0) — fallback 62
  - `AI Readiness`: derive from `ai_usage_frequency` field if present — fallback 81
  - `Leadership Strength`: derive from comp range (≥$200k → "High", else "Developing") — fallback "High"
  - `Market Competitiveness`: derive from `target_sector` presence — fallback 74
  - `Career Momentum`: derive from `desiredOutcome` urgency — fallback 89
  - `Comp Opportunity`: derive from comp range delta — fallback "+12%"
- [ ] Tiles animate in with `initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}` staggered by index
- [ ] Progress bar underneath each numeric score animates from 0 to value on mount
- [ ] The existing brief narrative (positioning excerpt, strengths, CTAs) renders below the indicator grid — unchanged

#### Implementation notes
**Files:**
- Modify: `components/DonnaChatLane.tsx` — `dna_reveal` render block, add `deriveIndicatorScores` helper above the component

**Indicator definitions:**
```ts
const INDICATOR_LABELS = [
  { key: 'recruiter_visibility', label: 'Recruiter Visibility' },
  { key: 'ai_readiness',        label: 'AI Readiness' },
  { key: 'leadership_strength', label: 'Leadership Strength' },
  { key: 'market_competitive',  label: 'Market Competitiveness' },
  { key: 'career_momentum',     label: 'Career Momentum' },
  { key: 'comp_opportunity',    label: 'Comp Opportunity' },
];
```

---

### E17-S04 · Path-Differentiated Bespoke Offerings Menu
**Priority:** P1  
**Status:** Queued  
**Depends on:** E17-S03, E16-S03 (dynamic resolver — can stub frontend if backend not ready)

#### What it is
The reference shows a full itemized menu of purchasable components after DNA mapping — 9 items for CJS, 8 for SSAi, 4 subscription tiers for MC. Our current `PackageSelectCards` shows 3 top-level bundles only. This story replaces `package_selection` → `intake_inline` flow with a path-specific offerings step that matches the reference exactly.

The new flow:
```
donna_reads_you → gap_reveal → [path selection] → dna_processing → dna_reveal → offerings_menu → [auth / checkout]
```

#### Acceptance criteria
- [ ] New canvas state: `'offerings_menu'` added to `DonnaCanvasState`
- [ ] New state variables: `selectedOfferings: string[]`, `addConciergeUpgrade: boolean`
- [ ] `package_selection` now serves as the path selector only (Smart Start / CJS / SSAi / MC choice), not the final step — on selection it transitions to `dna_processing` then `dna_reveal` then `offerings_menu`
- [ ] `offerings_menu` renders path-specific items from the `BESPOKE_OFFERINGS` constant (see spec below):
  - CJS path: 9 items (Resume & LinkedIn, Brand Positioning, Search Strategy, Apply Support, ATS Audit, Employer Research, Interview Prep, Salary Negotiation, LinkedIn Target Intelligence)
  - SSAi path: 8 items (Assessment, Gap Analysis, Acceleration Blueprint, Insights Report, Resource Guide, Training Guide, Productivity Stack, Bespoke AI Course)
  - MC path: 4 subscription tiers (Essential $99, Pro $249, Executive $499, Elite $999)
- [ ] Each item renders as a toggleable card:
  - Unselected: `border border-[#22424A]/60 bg-[#07161A]/40`
  - Selected: `border border-[#8DD9BF]/40 bg-[#8DD9BF]/[0.04] shadow-[0_0_24px_rgba(141,217,191,0.06)]`
  - Shows: title, price, "One-time Fee" or "Monthly Fee" badge, description (collapsed), "Review Strategic Brief →" hint when unselected
- [ ] First item in each path has a `◆ Strategic Match` badge (teal, top-right)
- [ ] Selecting an item toggles it in `selectedOfferings`
- [ ] MC path uses radio selection (one tier at a time), not multi-select
- [ ] The existing brief narrative section from `dna_reveal` remains; `offerings_menu` is a new step after it

#### Implementation notes
**Files:**
- Modify: `components/DonnaChatLane.tsx` — add `DonnaCanvasState` value, state vars, `renderA2UISlot` block
- Modify: `components/DonnaShell.tsx` — add `offerings_menu` to `DonnaCanvasCommand` awareness

**`BESPOKE_OFFERINGS` constant** (define above component):
```ts
const BESPOKE_OFFERINGS = {
  smart_start: [], // no sub-items; Smart Start is the entry product itself
  cjs: [
    { id: 'resume', title: 'Resume & LinkedIn Optimization', price: 149, isSubscription: false, description: 'AI-optimized resume and LinkedIn profile engineered for ATS dominance and executive hiring manager visibility.', preview: 'Finalized: 42 Keyword Optimizations, 12 Structural Enhancements applied...' },
    { id: 'brand-positioning', title: 'Executive Brand Positioning Suite', price: 249, isSubscription: false, description: 'Your professional narrative engineered for executive visibility — bio, brand narrative, and leadership positioning statement.', preview: 'Narrative Sync: Leadership Tone Calibrated, Executive Bio Drafted...' },
    { id: 'strategy', title: 'Search Strategy', price: 99, isSubscription: false, description: 'Multi-channel search strategy across Online Job Platforms, Recruiter Platforms, and Fortune 500 Career Portals.', preview: 'Strategy Map: 3 Core Channels, 15 Target Platforms Identified...' },
    { id: 'apply', title: 'Search and Apply Support', price: 199, isSubscription: false, description: '30-day intensive search and apply campaign across your personalized platform mix.', preview: 'Campaign Ready: 30-Day Intensive Schedule, 45+ Application Targets...' },
    { id: 'ats-audit', title: 'ATS Dominance Audit', price: 99, isSubscription: false, description: 'ATS compatibility score, keyword density analysis, and competitor benchmark comparison.', preview: 'Audit Results: 14 Critical Gaps found, Industry Benchmark: Top 5%...' },
    { id: 'research', title: 'Employer Research', price: 79, isSubscription: false, description: 'Deep-dive employer intelligence beyond the job description — culture, financials, fit scoring.', preview: 'Insights: Culture Deep-Dive, Salary Benchmarking, Financial Health...' },
    { id: 'interview', title: 'Interview Preparation', price: 129, isSubscription: false, description: 'Personalized question sets, talking points, and follow-up strategy for your target role.', preview: 'Prep Suite: 12 High-Probability Questions, Custom Follow-up templates...' },
    { id: 'negotiation', title: 'Salary Negotiation', price: 149, isSubscription: false, description: 'Market-data compensation analysis and negotiation playbook calibrated to your value prop.', preview: 'Playbook: Target range $XXXk, 3 Strategic Leverage Points...' },
    { id: 'linkedin-search', title: 'LinkedIn Target Intelligence', price: 99, isSubscription: false, description: 'Stakeholder search queries and decision-maker targeting across your industry.', preview: 'Search Ready: 12 Stakeholder Queries, 5 Connection Templates generated...' },
  ],
  premier: [
    { id: 'assessment', title: 'AI Assessment', price: 149, isSubscription: false, description: 'AI Readiness Assessment decoding how AI aligns with your professional journey and immediate technical advantages.', preview: 'Score: 88/100 Readiness. Priority: Agentic Workflows & Multi-modal logic...' },
    { id: 'gap', title: 'AI Gap Analysis', price: 129, isSubscription: false, description: 'Distance mapping between your current capabilities and the AI-driven future of your specific industry role.', preview: 'Gap Metrics: 4 Critical Skill Deficits identified, 3 Transition paths...' },
    { id: 'acceleration-blueprint', title: 'AI Career Acceleration Blueprint', price: 199, isSubscription: false, description: 'Practical roadmap for becoming AI-competitive with industry-specific opportunities and productivity implementation.', preview: 'Blueprint: 90-Day Implementation Cycle, 5 High-Value AI Use-cases...' },
    { id: 'insights', title: 'AI Insights Report', price: 149, isSubscription: false, description: 'Strategic AI Insights translated into practical, role-specific priorities for professional visibility.', preview: 'Strategic Brief: Top 3 Productivity Hacks, 1 Disruptive Risk Mitigated...' },
    { id: 'resource', title: 'AI Resource Guide', price: 79, isSubscription: false, description: 'Curated free and premium learning assets selected to expand AI knowledge based on your DNA.', preview: 'Curated Stack: 5 Core Courses, 12 Specialized Toolkits, 3 Communities...' },
    { id: 'training', title: 'AI Training Guide', price: 179, isSubscription: false, description: 'Holistic AI Training Plan aligning professional goals with the AI capabilities that matter most for your advancement.', preview: 'Roadmap: 90-Day Implementation Cycle, Weekly Milestone structure...' },
    { id: 'productivity-stack', title: 'AI Productivity Stack Setup', price: 249, isSubscription: false, description: 'Personalized AI operating system — tool recommendations, automation suggestions, and prompt systems.', preview: 'Stack Configured: 4 Primary Agents, 12 Workflow Automations...' },
    { id: 'course', title: 'Bespoke AI Course', price: 299, isSubscription: false, description: 'Fully customized learning journey designed around your specific areas of interest and career path.', preview: 'Syllabus: 6 Modules, 14 Lab Sessions, 1 Capstone Project Framework...' },
  ],
  concierge: [
    { id: 'essential', title: 'MyConcierge Essential', price: 99, isSubscription: true, description: 'Dedicated human career partner with onboarding, answers, navigation, and accountability support.', preview: 'Support Level: Essential. Priority response < 4hrs...' },
    { id: 'pro', title: 'MyConcierge Pro', price: 249, isSubscription: true, description: 'Strategic career orchestration — monthly strategy sessions, AI optimization, quarterly reviews.', preview: 'Support Level: Pro (Strategic). Priority Response < 2hrs...' },
    { id: 'executive', title: 'MyConcierge Executive', price: 499, isSubscription: true, description: 'Dedicated strategic partner — leadership positioning, salary negotiation, white-glove service.', preview: 'Support Level: Executive. Priority Queue + Direct Concierge Access...' },
    { id: 'elite', title: 'MyConcierge Elite', price: 999, isSubscription: true, description: 'Full-spectrum professional orchestration — weekly strategy sessions, dedicated concierge lead.', preview: 'Support Level: Elite. Weekly Execution Check-ins + Executive Sourcing...' },
  ],
};
```

---

### E17-S05 · Real-Time Price Accumulator
**Priority:** P1  
**Status:** Queued  
**Depends on:** E17-S04

#### What it is
The reference shows a live "One-Time Fee / Monthly Service" counter that updates as offerings are toggled. This is the conversion mechanism — users see their investment build in real time, which anchors value before hitting the CTA. Required for E17-S04 to feel complete.

#### Acceptance criteria
- [ ] `offerings_menu` renders a sticky summary bar at the top of the card:
  - Two columns: `ONE-TIME FEE · $X.00` and `MONTHLY SERVICE · $X.00`
  - Values recompute live as `selectedOfferings` changes
  - `oneTimeTotal` = sum of selected non-subscription item prices
  - `monthlyTotal` = sum of selected subscription item prices + (addConciergeUpgrade ? 99 : 0)
  - Both animate on change (count-up or just snap — either acceptable for v1)
- [ ] CTA row: `"Continue →"` primary button + `"Adjust inputs"` back link (returns to `intake_inline`)
- [ ] `"Continue →"` disabled when no offerings selected (MC path: at least one tier selected; CJS/SSAi: at least one item selected)
- [ ] On `"Continue →"`:
  - Call `onPrePurchaseIntakeSeed?.(buildPrePurchaseSeed())` with `selected_offerings: selectedOfferings` in answers
  - Transition to `dna_reveal` if not yet seen, or directly to auth prompt if already seen
  - For unauthenticated users: trigger `onAuthRequest('register')` and set `inlineAuthVisible(true)`

#### Implementation notes
**Files:**
- Modify: `components/DonnaChatLane.tsx` — `offerings_menu` render block, `buildPrePurchaseSeed`

---

### E17-S06 · Strategic Intelligence Brief Per Offering
**Priority:** P1  
**Status:** Queued  
**Depends on:** E17-S04

#### What it is
The reference's signature conversion moment — selecting any offering card expands a 7-section "Strategic Intelligence Brief" that shows a preview of what the user would receive. Each section teases real data while gating the full deliverable behind purchase. This is the hook that converts "browsing" to "buying."

#### Acceptance criteria
- [ ] Selecting an offering in `offerings_menu` expands a brief panel below the description (AnimatePresence, slide-in):
  - **Section 1 — Executive Summary**: preview text in italic with teal left-border
  - **Section 2 — Intelligence Findings**: `"42 Strategic Optimization Gaps Detected in {title}"` in teal bold
  - **Section 3 — Strategic Insights**: `"Competitive Differentiation Index: Elevated Momentum"` in black bold
  - **Section 4 — Personalized Recommendations**: `"Locked: Optimization Roadmap"` with dot icon
  - **Section 5 — Preview Snippet**: `"Based on your DNA, target salary of {salaryRange} is achievable with..."` (use `prePurchaseAnswers.salaryRange`)
  - **Section 6 — Hidden Premium Recommendations**: `"12 Proprietary Strategic Assets Locked"` badge in teal
  - **Section 7 — Conversion CTA**: `"Select to Unlock DNA Blueprint →"` in teal
- [ ] Brief panel styled: `bg-[#8DD9BF]/[0.04] border border-[#8DD9BF]/20 rounded px-5 py-5 mt-4 space-y-6`
- [ ] Section labels: `font-data text-[8px] uppercase tracking-widest opacity-30 mb-1`
- [ ] The brief renders inside the offering card when selected — it does NOT open a modal

#### Implementation notes
**Files:**
- Modify: `components/DonnaChatLane.tsx` — offering card expand section within `offerings_menu` render

---

### E17-S07 · MyConcierge Strategic Partner Upsell
**Priority:** P1  
**Status:** Queued  
**Depends on:** E17-S04

#### What it is
For CJS and SSAi paths, the reference shows a prominent MyConcierge add-on card ($99/mo) with a value prop list and a toggle. This is a separate upsell, not one of the path items. It allows users who started down CJS or SSAi to also add a human concierge layer without switching paths.

#### Acceptance criteria
- [ ] When `selectedPackageId === 'cjs' || selectedPackageId === 'premier'`, render a `MyConcierge Strategic Partner Upgrade` toggle section above the item list in `offerings_menu`:
  - Black card on selected, paper-tone card on unselected
  - Price: `$99.00 / per month`
  - 6 value props (checkboxes):
    - Priority Support (< 4hr Response)
    - Strategic Launch Session
    - Done-With-You Execution
    - Accountability & Momentum Syncs
    - Advanced AI Tool Optimization
    - Direct Concierge Messaging
  - Toggle button: `"Select Upgrade"` / `"Service Active ✓"`
- [ ] `addConciergeUpgrade` boolean state drives the toggle and feeds `monthlyTotal` in E17-S05
- [ ] When `addConciergeUpgrade = true`, add `'concierge_essential'` to `selectedOfferings` and reflect in seed answers as `add_concierge_upgrade: true`
- [ ] Not shown when `selectedPackageId === 'concierge'` (already on MC path)
- [ ] Not shown when `selectedPackageId === 'smart_start'` (Smart Start is the entry product)

#### Implementation notes
**Files:**
- Modify: `components/DonnaChatLane.tsx` — `offerings_menu` render block, `addConciergeUpgrade` state

---

### E17-S08 · Resume Upload in Pre-Purchase Intake
**Priority:** P2  
**Status:** Queued  
**Depends on:** E17-S01

#### What it is
The reference requires a PDF resume upload before the DNA mapping step — it gates the "Map Prof. DNA" CTA behind a successful upload. In our flow this would live in `intake_inline` as an optional (not required) upload field, since we can't hard-gate the pre-purchase flow the same way without harming conversion. Upload stores to a temp client record; the file is persisted properly on account creation.

#### Acceptance criteria
- [ ] `intake_inline` pre-purchase form gains a `ACT 05: PROFESSIONAL BRIEF (PDF)` section after the pace selector
- [ ] Upload widget: dashed border upload zone, PDF only, shows filename on success with `✓ Brief synchronized`
- [ ] Upload is **optional** — "Map my Professional DNA →" CTA does not require it
- [ ] On file select: `setResumeFile(file)` stored in new `resumeFile` state variable
- [ ] `buildPrePurchaseSeed` includes `resume_file_name: resumeFile?.name` in answers (file itself not sent to Firestore pre-auth)
- [ ] After account creation in `AuthCard.onSuccess`, `resumeFile` is available via `prePurchaseIntakeSeed.answers.resume_file_name` for operator awareness
- [ ] Upload animation: 3-bar loader while "uploading" (1.5s simulated), then success state

#### Implementation notes
**Files:**
- Modify: `components/DonnaChatLane.tsx` — add `resumeFile` state, upload JSX in `intake_inline` block
- No backend changes — file is logged in answers metadata only; actual upload deferred to E06 CJS resume upload flow (already built)

---

### E17-S09 · LinkedIn URL Capture
**Priority:** P2  
**Status:** Queued  
**Depends on:** E17-S01

#### What it is
The reference collects a LinkedIn profile URL in `TargetJobStep` and uses it to seed a `LinkedInSearchWidget` when the LinkedIn Target Intelligence offering is selected. For our flow, capturing LinkedIn in intake enables the wiki substrate and wiki-injected Gemini session to reference the user's profile.

#### Acceptance criteria
- [ ] `intake_inline` pre-purchase form gains optional `ACT 06: LINKEDIN PROFILE` input after the resume upload
- [ ] Input: text field, `placeholder="linkedin.com/in/..."`, not required
- [ ] `prePurchaseAnswers.linkedinUrl` stored and mapped to `linkedin_profile` in `buildPrePurchaseSeed`
- [ ] When `linkedinUrl` is present and `offerings_menu` shows the `linkedin-search` CJS offering selected, render a LinkedIn intelligence sub-card:
  - `"LinkedIn Intelligence Terminal"` header with LinkedIn icon
  - Pre-built query: `"{targetRole} recruiters"` (read-only input)
  - `"Run Search"` button opens `https://www.linkedin.com/search/results/all/?keywords={encodedQuery}` in new tab
  - Shows synced profile URL if present

#### Implementation notes
**Files:**
- Modify: `components/DonnaChatLane.tsx` — `prePurchaseAnswers` state, intake JSX, `buildPrePurchaseSeed`, LinkedIn intelligence sub-card in `offerings_menu`

---

### E17-S10 · Continue to Checkout / Account Creation Bridge
**Priority:** P1  
**Status:** Queued  
**Depends on:** E17-S05

#### What it is
The reference's final CTA says "Continue to checkout" — implying a payment step. Our flow currently routes `dna_reveal` unauthenticated users directly to `register`. This story upgrades the conversion moment: the CTA on `offerings_menu` is "Secure Your Suite →", triggers account creation inline (existing AuthCard), and passes the full pre-purchase seed (including selected offerings and pricing) into the registration payload so the post-auth experience is already loaded.

#### Acceptance criteria
- [ ] `"Secure Your Suite →"` CTA in the `offerings_menu` price summary bar (for unauthenticated users):
  - Calls `onPrePurchaseIntakeSeed?.(buildPrePurchaseSeed())` with full offerings selection
  - Calls `onAuthRequest('register')`
  - Sets `inlineAuthVisible(true)`
  - Transitions to `dna_reveal` to show the AuthCard slot (existing pattern)
- [ ] `buildPrePurchaseSeed` extended:
  - `selected_offerings: selectedOfferings.join(',')`
  - `one_time_total: oneTimeTotal`
  - `monthly_total: monthlyTotal`
  - `add_concierge_upgrade: addConciergeUpgrade`
- [ ] `AuthCard` title at `register` mode within this flow: `"One step. Your suite is ready."` (override via `registrationTitle` prop — optional enhancement)
- [ ] Post-registration (`AuthCard.onSuccess`):
  - `saveIntake` persists the full seed including offerings context
  - `compileClientWiki` runs (already wired in AuthCard)
  - `markIntroSeen` runs (already wired — skips prologue)
  - Landing state: `concierge_sync` with Donna greeting by name confirming the selection

#### Implementation notes
**Files:**
- Modify: `components/DonnaChatLane.tsx` — `offerings_menu` CTA, `buildPrePurchaseSeed`
- Modify: `components/DonnaShell.tsx` — `sessionContext` useMemo to surface offering context post-auth

---

## Backlog Board Additions

Add the following rows to the `End-to-End Backlog Board` table in `backlog-ledger.md`:

| Story | Epic | Priority | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| E17-S01 Pre-Purchase Intake Data Expansion | E17 | P0 | Queued | Add target industry (130+ options), comp range (12 bands), desired outcome (6 options) to pre-purchase intake_inline. Required for DNA indicators and path resolver. |
| E17-S02 DNA Mapping Animation Upgrade | E17 | P0 | Queued | Replace scanner bar with cinematic 9-second orbit ring + pulsing DNA orb + 3-phase text cycling (Analyzing → Defining → Creating) + category ticker. Auto-transitions to dna_reveal at 9s. |
| E17-S03 Professional DNA Indicators Grid | E17 | P0 | Queued | 6 scored indicator tiles (Recruiter Visibility, AI Readiness, Leadership Strength, Market Competitiveness, Career Momentum, Comp Opportunity) rendered at top of dna_reveal with stagger animation and progress bars. |
| E17-S04 Path-Differentiated Bespoke Offerings Menu | E17 | P1 | Queued | New offerings_menu canvas state with path-specific itemized components: CJS (9 items), SSAi/Premier (8 items), MC (4 subscription tiers). Toggleable cards with prices. First item marked Strategic Match. |
| E17-S05 Real-Time Price Accumulator | E17 | P1 | Queued | Live one-time + monthly running totals in offerings_menu updating as items are toggled. Sticky summary bar with "Continue →" CTA and "Adjust inputs" back link. |
| E17-S06 Strategic Intelligence Brief Per Offering | E17 | P1 | Queued | 7-section expand panel per offering (Executive Summary, Intelligence Findings, Strategic Insights, Personalized Recommendations, Preview Snippet, Hidden Assets, Conversion CTA) revealed on item select. |
| E17-S07 MyConcierge Strategic Partner Upsell | E17 | P1 | Queued | $99/mo add-on toggle shown for CJS and SSAi paths. Black card when active, 6 value props, feeds monthlyTotal in price accumulator. |
| E17-S08 Resume Upload in Pre-Purchase Intake | E17 | P2 | Queued | Optional PDF upload in intake_inline (ACT 05). Simulated 1.5s processing, success state, filename stored in seed answers. No hard gate on CTA. |
| E17-S09 LinkedIn URL Capture | E17 | P2 | Queued | Optional LinkedIn URL field in intake_inline (ACT 06). Feeds wiki substrate and LinkedIn intelligence terminal sub-card when linkedin-search CJS offering is selected. |
| E17-S10 Continue to Checkout / Account Creation Bridge | E17 | P1 | Queued | "Secure Your Suite →" CTA on offerings_menu triggers register flow with full pre-purchase seed (offerings, totals). Post-auth lands on concierge_sync with Donna greeting by name. |

---

## Dependency Tree

```
E17-S01 (intake fields)
  └─ E17-S02 (mapping animation — needs targetRole)
       └─ E17-S03 (indicators grid — auto-transitions from mapping)
            └─ E17-S04 (offerings menu — reveals after dna_reveal)
                 ├─ E17-S05 (price accumulator — lives in offerings_menu)
                 ├─ E17-S06 (intelligence brief — lives in offerings_menu)
                 ├─ E17-S07 (concierge upsell — lives in offerings_menu)
                 └─ E17-S10 (checkout bridge — CTA on offerings_menu)

E17-S01 also unblocks:
  ├─ E17-S08 (resume upload — ACT 05 of intake_inline)
  └─ E17-S09 (LinkedIn capture — ACT 06 of intake_inline)
```

---

## Files Touched Summary

| File | Stories |
| :--- | :--- |
| `components/DonnaChatLane.tsx` | S01, S02, S03, S04, S05, S06, S07, S08, S09, S10 |
| `components/DonnaShell.tsx` | S01, S10 |
| `docs/backlog-ledger.md` | All (board additions) |

No new files required. All changes extend `renderA2UISlot()` and supporting state in `DonnaChatLane.tsx`.

---

## Linear Labels

Apply these labels when creating issues:

- `front-door` — all E17 stories (all affect the pre-purchase / intake surface)
- `donna` — all E17 stories (all render inside DonnaChatLane)
- `jim-demo` — S01, S02, S03, S04, S05, S06, S07, S10
- `P0` — S01, S02, S03
- `P1` — S04, S05, S06, S07, S10
- `P2` — S08, S09
- `E17` — all

## Suggested Sprint Batches

**Batch 1 (P0 — ship first):** S01 → S02 → S03  
**Batch 2 (P1 core conversion surface):** S04 → S05 → S07 → S10  
**Batch 3 (P1 intelligence layer):** S06  
**Batch 4 (P2 enrichment):** S08, S09 (parallel)
