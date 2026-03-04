# Career Concierge OS Fork Brief

## What This Repo Is

This repository is no longer just a modified copy of Signal Atlas.
It is the production fork for Career Concierge OS.

Signal Atlas remains the design ancestor.
Career Concierge OS is the operational product.

## Why The Fork Exists

Signal Atlas proved the editorial grid, modular OS framing, and agentic interaction model.
Career Concierge OS takes that foundation into a dedicated product for:

- concierge-led career acceleration
- operator-managed agent behavior
- multimodal learning and media routing
- production deployment in its own Firebase and GCP environment

## What Is Now Separate From Signal Atlas

- Firebase project: `ssai-f6191`
- Firestore database: `career-concierge`
- Cloud Run services:
  - `career-concierge-api`
  - `career-concierge-suite`
- admin controls
- prompt routing
- media library targeting
- migration and deployment runbooks

## Product Identity

The target experience is an editorial, cinematic operating system for career momentum.
It should not drift toward a generic SaaS dashboard.

The product should feel:

- guided
- alive
- intentional
- cinematic
- operator-grade behind the scenes

## Current Migration Position

The clean migration base is established in `ssai-f6191`.

- Firestore data moved from `third-signal`
- Auth users imported
- API deployed and publicly reachable
- Firebase web app created
- production documentation system added

Remaining work is now about:

- UI cutover and validation
- production hardening
- continued evolution of the OS experience

## Operating Rule

When product structure, deployment shape, Firebase/GCP wiring, or admin behavior changes, documentation changes in the same work.
This fork should be operable by someone who was not present for the original chat history.
