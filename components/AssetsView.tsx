import React, { useEffect, useMemo, useState } from 'react';
import { AgentDefinition, InteractionLog } from '../types';
import {
  decideAdminApproval,
  decideInteractionLog,
  fetchAgentRegistry,
  generateChiefOfStaffSummary,
  listAdminApprovalQueue,
  listInteractionLogs,
} from '../services/cjsApi';

export function AssetsView(props: { isAdminUser: boolean }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<InteractionLog[]>([]);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [adminQueue, setAdminQueue] = useState<InteractionLog[]>([]);

  const pendingItems = useMemo(
    () => items.filter((item) => item.status === 'pending_approval'),
    [items]
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const requests: Promise<any>[] = [listInteractionLogs(), fetchAgentRegistry()];
      if (props.isAdminUser) requests.push(listAdminApprovalQueue());
      const [interactionItems, agentRows, queueRows] = await Promise.all(requests);
      setItems(interactionItems);
      setAgents(agentRows);
      setAdminQueue(queueRows || []);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to load execution ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [props.isAdminUser]);

  const createSummary = async () => {
    setBusy(true);
    setError(null);
    try {
      const mode = props.isAdminUser ? 'pending_approval' : 'logged';
      const next = await generateChiefOfStaffSummary(mode);
      setItems((prev) => [next, ...prev]);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to generate summary.');
    } finally {
      setBusy(false);
    }
  };

  const decide = async (item: InteractionLog, decision: 'approved' | 'rejected') => {
    setBusy(true);
    setError(null);
    try {
      const updated = item.client_uid && props.isAdminUser
        ? await decideAdminApproval(
            item.client_uid,
            item.id,
            decision,
            decision === 'approved' ? 'Approved in global admin queue.' : 'Rejected for revision.'
          )
        : await decideInteractionLog(
            item.id,
            decision,
            decision === 'approved' ? 'Approved in Assets execution ledger.' : 'Rejected for revision.'
          );
      setItems((prev) => prev.map((row) => (row.id === item.id ? updated : row)));
      setAdminQueue((prev) =>
        prev
          .map((row) => (row.id === item.id && row.client_uid === item.client_uid ? updated : row))
          .filter((row) => row.status === 'pending_approval')
      );
    } catch (e: any) {
      setError(e?.message ?? 'Unable to update decision.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-widest text-gray-400">Assets + Execution Ledger</div>
        <h2 className="text-4xl md:text-5xl font-editorial leading-none">Chief of Staff log.</h2>
        <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
          Operating memory for the investor sequence: intake, artifacts, episodes, and concierge decisions.
        </p>
      </header>

      {error && <div className="border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700">{error}</div>}

      <section className="border border-black/10 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal">Execution Pulse</div>
            <div className="text-2xl font-editorial mt-2">
              {props.isAdminUser ? adminQueue.length : pendingItems.length} pending approval · {items.length} personal entries
            </div>
          </div>
          <button
            type="button"
            onClick={createSummary}
            disabled={busy}
            className="px-4 py-2 btn-brand text-[10px] uppercase tracking-[0.22em] disabled:opacity-50"
          >
            {busy ? 'Updating…' : 'Log Chief of Staff Summary'}
          </button>
        </div>
      </section>

      {props.isAdminUser && (
        <section className="space-y-3">
          <div className="text-[10px] uppercase tracking-[0.24em] text-gray-500">Global Approval Queue</div>
          {loading ? (
            <div className="text-[10px] uppercase tracking-[0.3em] opacity-40 animate-pulse">Loading queue…</div>
          ) : adminQueue.length === 0 ? (
            <div className="border border-black/10 bg-white p-5 text-sm text-gray-600">No pending approvals across clients.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {adminQueue.map((item) => (
                <article key={`${item.client_uid}-${item.id}`} className="border border-black/10 bg-white p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-gray-500">
                        {item.client_name || item.client_email || item.client_uid || 'Unknown client'}
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">
                        {item.source || item.type} · {item.id}
                      </div>
                    </div>
                    <span className="border border-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em]">
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="text-xl md:text-2xl font-editorial leading-tight">{item.title}</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{item.summary}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {item.next_actions.map((action) => (
                      <div key={action} className="border border-black/10 bg-gray-50 p-3 text-sm text-gray-700">
                        {action}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => decide(item, 'approved')}
                      disabled={busy}
                      className="px-3 py-2 btn-brand text-[10px] uppercase tracking-[0.2em] disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(item, 'rejected')}
                      disabled={busy}
                      className="px-3 py-2 border border-red-500/35 text-red-700 bg-red-50 text-[10px] uppercase tracking-[0.2em] disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="border border-black/10 bg-gray-50 p-5 space-y-3">
        <div className="text-[10px] uppercase tracking-[0.24em] text-brand-teal">Agent Registry</div>
        {agents.length === 0 && !loading && (
          <div className="text-sm text-gray-600">No registry entries found.</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {agents.map((agent) => (
            <article key={agent.role_id} className="border border-black/10 bg-white p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500">{agent.role_id}</div>
                <h3 className="text-xl font-editorial mt-2">{agent.title}</h3>
                <p className="text-sm text-gray-700 leading-relaxed mt-2">{agent.objective}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {agent.reads.map((scope) => (
                  <span key={scope} className="border border-black/15 px-2 py-1 text-[10px] uppercase tracking-[0.18em]">
                    {scope}
                  </span>
                ))}
                {agent.writes.map((scope) => (
                  <span key={scope} className="border border-brand-teal/20 bg-brand-soft px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-brand-teal">
                    write {scope}
                  </span>
                ))}
              </div>
              <div className="mt-3 text-[10px] uppercase tracking-[0.18em] text-gray-500">
                {agent.access_model} · approval {agent.approval_required ? 'required' : 'not required'} · {agent.policy_version}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="text-[10px] uppercase tracking-[0.24em] text-gray-500">Execution Ledger Entries</div>
        {loading ? (
          <div className="text-[10px] uppercase tracking-[0.3em] opacity-40 animate-pulse">Loading ledger…</div>
        ) : items.length === 0 ? (
          <div className="border border-black/10 bg-white p-5 text-sm text-gray-600">No execution entries yet.</div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <article key={item.id} className="border border-black/10 bg-white p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-gray-500">
                    {item.type} · {item.id}
                  </div>
                  <span className="border border-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em]">
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
                <h4 className="text-2xl font-editorial leading-tight">{item.title}</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{item.summary}</p>
                {item.next_actions.length > 0 && (
                  <ul className="space-y-2 text-sm text-gray-700">
                    {item.next_actions.map((action) => (
                      <li key={action} className="flex gap-2">
                        <span className="text-brand-teal">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {props.isAdminUser && item.status === 'pending_approval' && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => decide(item, 'approved')}
                      disabled={busy}
                      className="px-3 py-2 btn-brand text-[10px] uppercase tracking-[0.2em] disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(item, 'rejected')}
                      disabled={busy}
                      className="px-3 py-2 border border-red-500/35 text-red-700 bg-red-50 text-[10px] uppercase tracking-[0.2em] disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
