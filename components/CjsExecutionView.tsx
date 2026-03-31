import React, { useEffect, useMemo, useState } from 'react';
import { CjsAsset, CjsExecutionContent, ClientDoc, ResumeReviewContent, SearchStrategyContent } from '../types';
import { generateResumeReview, generateSearchStrategy, listCjsAssets, uploadResumeAsset } from '../services/cjsApi';

const statusTone: Record<string, string> = {
  ready: 'text-brand-teal',
  planned: 'text-black/60',
  blocked: 'text-red-700',
};

const resumeAssetPriority = (item: CjsAsset) => {
  if (item.asset_kind === 'uploaded_file') return 2;
  if (item.asset_kind === 'intake_reference') return 1;
  return item.storage_provider === 'gcs' ? 2 : 1;
};

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const m = result.match(/^data:.*;base64,(.+)$/);
      if (!m) return reject(new Error('Unable to encode file.'));
      resolve(m[1]);
    };
    reader.onerror = () => reject(new Error('Unable to read file.'));
    reader.readAsDataURL(file);
  });

const assetDate = (item: CjsAsset) => item.updated_at || item.created_at || '';

export function CjsExecutionView(props: { doc: CjsExecutionContent; client: ClientDoc | null }) {
  const [assets, setAssets] = useState<CjsAsset[]>([]);
  const [review, setReview] = useState<ResumeReviewContent | null>(null);
  const [strategy, setStrategy] = useState<SearchStrategyContent | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [notes, setNotes] = useState('');
  const journeyIntent = String(props.client?.intent || 'target_role');
  const isCurrentRoleJourney = journeyIntent === 'current_role';
  const isDirectionJourney = journeyIntent === 'not_sure';
  const introCopy = isCurrentRoleJourney
    ? 'Internal mobility and readiness operations: proposal prep, sponsor mapping, and AI leverage proof.'
    : isDirectionJourney
      ? 'Exploration operations: role-fit framing, resume translation, and low-risk discovery steps.'
      : 'Promotion and job-search operations: resume versions, role alignment, and strategy execution.';
  const strategyLabel = isCurrentRoleJourney
    ? 'Generate Internal Mobility Strategy'
    : isDirectionJourney
      ? 'Generate Exploration Strategy'
      : 'Generate Search Strategy';

  const resumeAssets = useMemo(
    () =>
      assets
        .filter((item) => item.type === 'resume')
        .sort((a, b) => {
          const byPriority = resumeAssetPriority(b) - resumeAssetPriority(a);
          if (byPriority !== 0) return byPriority;
          return String(assetDate(b)).localeCompare(String(assetDate(a)));
        }),
    [assets]
  );

  const hasUploadedResume = resumeAssets.some((item) => item.asset_kind === 'uploaded_file' || item.storage_provider === 'gcs');

  const loadAssets = async () => {
    setLoadingAssets(true);
    setError(null);
    try {
      const rows = await listCjsAssets();
      setAssets(rows);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to load CJS assets.');
    } finally {
      setLoadingAssets(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Select a resume file first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const contentBase64 = await toBase64(selectedFile);
      const next = await uploadResumeAsset({
        filename: selectedFile.name,
        mime_type: selectedFile.type || 'application/octet-stream',
        content_base64: contentBase64,
        label: selectedFile.name,
        target_role: targetRole,
        notes,
      });
      setAssets((prev) => [next, ...prev.filter((item) => item.id !== next.id)]);
      setSelectedFile(null);
      setNotes('');
    } catch (e: any) {
      setError(e?.message ?? 'Resume upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const runReview = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = await generateResumeReview();
      setReview(payload.review);
    } catch (e: any) {
      setError(e?.message ?? 'Resume review failed.');
    } finally {
      setBusy(false);
    }
  };

  const runStrategy = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = await generateSearchStrategy();
      setStrategy(payload.strategy);
    } catch (e: any) {
      setError(e?.message ?? 'Search strategy generation failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8 md:space-y-10">
      <div>
        <div className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">ConciergeJobSearch</div>
        <h2 className="text-4xl md:text-5xl font-editorial leading-none">Execution rail.</h2>
        <p className="text-sm text-gray-600 leading-relaxed mt-5 max-w-2xl">
          {introCopy}
        </p>
      </div>

      {error && <div className="border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700">{error}</div>}

      <section className="border border-black/5 p-4 md:p-6 bg-gray-50">
        <div className="text-[10px] uppercase tracking-widest opacity-50 mb-3">Intent Summary</div>
        <div className="text-lg font-editorial italic">{props.doc.intent_summary}</div>
      </section>

      <section className="border border-black/5 p-4 md:p-6">
        <div className="text-[10px] uppercase tracking-widest opacity-50 mb-4">Process Steps</div>
        <div className="space-y-3">
          {props.doc.stages.map((stage) => (
            <div
              key={stage.step}
              className="grid grid-cols-1 md:grid-cols-[84px_220px_1fr] gap-3 border border-black/5 bg-gray-50 p-4"
            >
              <div className="font-mono text-xs opacity-50">Step {String(stage.step).padStart(2, '0')}</div>
              <div className="text-sm font-medium">{stage.title}</div>
              <div className="space-y-1">
                <div className={`text-[10px] uppercase tracking-[0.18em] ${statusTone[stage.status] || 'text-black/60'}`}>
                  {stage.status}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{stage.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-black/10 bg-white p-4 md:p-6 space-y-4">
        <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal">Resume Intake</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-700">Resume file (PDF/DOCX)</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-700">Target role</label>
            <input
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="Director of Marketing"
              className="mt-2 w-full border-b border-black/10 focus-border-brand-teal outline-none py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Version context, metrics, or role-specific framing."
              className="mt-2 w-full min-h-24 border border-black/10 focus-border-brand-teal outline-none p-3 text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleUpload}
          disabled={busy || !selectedFile}
          className="w-full sm:w-auto px-4 py-3 btn-brand text-[10px] uppercase tracking-[0.22em] disabled:opacity-50"
        >
          {busy ? 'Uploading…' : 'Upload Resume Version'}
        </button>

        <div className="pt-2">
          <div className="text-[10px] uppercase tracking-[0.24em] text-gray-500 mb-2">
            Resume Versions ({resumeAssets.length})
          </div>
          {!hasUploadedResume && resumeAssets.length > 0 ? (
            <div className="mb-3 border border-amber-500/20 bg-amber-50 p-3 text-xs text-amber-900">
              Smart Start captured a resume reference, but line-level resume review still needs an actual file upload here.
            </div>
          ) : null}
          {loadingAssets ? (
            <div className="text-[10px] uppercase tracking-[0.3em] opacity-40 animate-pulse">Loading assets…</div>
          ) : resumeAssets.length === 0 ? (
            <div className="text-sm text-gray-600 border border-black/10 bg-gray-50 p-4">
              Upload at least one resume to unlock review and strategy generation.
            </div>
          ) : (
            <div className="space-y-2">
              {resumeAssets.map((item) => (
                <div key={item.id} className="border border-black/10 bg-gray-50 p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{item.label || item.filename || item.id}</div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500 mt-1">
                        {item.asset_kind === 'uploaded_file' ? 'Uploaded file' : item.asset_kind === 'intake_reference' ? 'Intake reference' : 'Resume asset'} · {item.target_role || 'No target role'} · {item.storage_provider || 'none'}
                      </div>
                      <div className="mt-1 text-[10px] text-gray-500">
                        {item.asset_kind === 'uploaded_file'
                          ? item.extraction_status === 'parsed'
                            ? `Parsed for review · ${item.text_char_count || 0} chars`
                            : item.extraction_status === 'failed'
                              ? 'File upload succeeded, but parsing failed'
                              : item.extraction_status === 'unsupported'
                                ? 'File saved, but parsing is not supported for this format'
                                : 'File saved'
                          : 'Reference captured from Smart Start'}
                      </div>
                      {item.source_url ? (
                        <a href={item.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-[10px] uppercase tracking-[0.18em] text-brand-teal">
                          Open source link
                        </a>
                      ) : null}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
                      {item.updated_at ? new Date(item.updated_at).toLocaleString() : 'pending timestamp'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <article className="border border-black/10 bg-white p-4 md:p-5 space-y-3">
          <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal">Resume Review Agent</div>
          <button
            type="button"
            onClick={runReview}
            disabled={busy || resumeAssets.length === 0}
            className="w-full sm:w-auto px-4 py-3 btn-brand text-[10px] uppercase tracking-[0.22em] disabled:opacity-50"
          >
            Run Resume Review
          </button>
          {review && (
            <div className="space-y-3 text-sm text-gray-700">
              <div className="font-editorial italic text-lg">{review.summary}</div>
              {review.analysis_scope === 'intake_reference' && Array.isArray(review.limitations) && review.limitations.length > 0 ? (
                <div className="border border-amber-500/20 bg-amber-50 p-3 text-xs text-amber-900">
                  {review.limitations.join(' ')}
                </div>
              ) : null}
              <div>Role alignment score: {review.role_alignment_score}%</div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-1">Strengths</div>
                <ul className="space-y-1">
                  {review.strengths.map((entry) => (
                    <li key={entry}>• {entry}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-1">Gaps</div>
                <ul className="space-y-1">
                  {review.gaps.map((entry) => (
                    <li key={entry}>• {entry}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </article>

        <article className="border border-black/10 bg-white p-4 md:p-5 space-y-3">
          <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal">Search Strategist Agent</div>
          <button
            type="button"
            onClick={runStrategy}
            disabled={busy || resumeAssets.length === 0}
            className="w-full sm:w-auto px-4 py-3 btn-brand text-[10px] uppercase tracking-[0.22em] disabled:opacity-50"
          >
            {strategyLabel}
          </button>
          {strategy && (
            <div className="space-y-3 text-sm text-gray-700">
              <div className="font-editorial italic text-lg">{strategy.headline}</div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-1">Channels</div>
                <div>{strategy.channels.join(' · ')}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-1">Weekly actions</div>
                <ul className="space-y-1">
                  {strategy.weekly_actions.map((entry) => (
                    <li key={entry}>• {entry}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
