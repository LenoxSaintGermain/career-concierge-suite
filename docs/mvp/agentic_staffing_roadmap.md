# Agentic Staffing Roadmap

## Status

Queued roadmap extension. This document turns the canonical staff operating model into implementation work for Career Concierge OS.

## Recommended Delivery Order

1. Formalize the canonical staff registry and role contracts.
2. Wire orchestration snapshots and handoff policies into the current Chief of Staff flow.
3. Add Firestore-backed orchestration run records and evaluation records.
4. Extend Admin with a staff operating section before expanding staff count further.
5. Layer media-specific staff operations into the existing queued E09 media pipeline work.

## Why This Order

- It strengthens the current architecture instead of introducing a second one.
- It gives operators visibility before adding more autonomous behavior.
- It preserves the client-facing calm of the OS while making backend orchestration auditable.
- It prevents fragmented agent growth where roles exist in prompts but not in governance.

## Implementation Notes

- Reuse `system/agent-registry`; do not create a parallel registry.
- Prefer policy documents and run records in Firestore over speculative vector-memory infrastructure.
- Keep orchestration in the existing Express API until asynchronous media execution justifies a dedicated worker boundary.
- Treat channel abstraction as a future-proofing concept, not a new MVP stream.

## Linked Spec

- `docs/mvp/agentic_staff_operating_model_spec.md`
