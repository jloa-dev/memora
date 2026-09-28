# Project: Memora Notes - Race Condition & Hydration Fix

## Architecture
- Static SPA / Vanilla ES Modules (`js/app.js`, `js/firebase.js`).
- Auth Provider: Firebase Authentication (Google Auth popup + IndexedDB persistence).
- Database & Sync: Supabase PostgreSQL (`public.memora_notes` table) via REST API and Realtime channel.
- Local Storage: Indexed cache partitioned by `workspace_id` (`memora_user_${uid}_notes` vs `memora_guest_notes`).
- Hosting: Firebase Hosting (`memora-space.web.app`, site: `memora-space`).
- Git Repository: `jloa-dev/memora` (`main` branch).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Deterministic Auth State Resolution | Wait for Firebase Auth `authStateReady()` / `waitForAuthReady()` before emitting auth state or firing queries | M1 | R1, Survey |
| 2 | Frame-0 Session Hydration | Session hint in localStorage prevents premature guest template render and flash on authenticated reload | M1 | R1, Survey |
| 3 | AbortController on In-Flight Sync | Abort in-flight Supabase REST requests when user or workspace changes | M1 | R2, Survey |
| 4 | Monotonic Sequence Token / Stale Response Discard | Discard out-of-order network responses without touching DOM or local state | M1 | R2, Survey |
| 5 | Explicit Workspace Id Parametrization | Pass explicit target workspace ID to all queries, mutations, and row mappers rather than reading mutable singleton | M1 | R3, Survey |
| 6 | Template Upload & Cache Guardrails | Never upload starter notes on network failure or if workspace has existing notes; strict key isolation | M1 | R3, Survey |
| 7 | Automated Concurrency & Persistence Test Suite | Node.js verification script executing 10+ rapid concurrent reload scenarios against Supabase verifying 'PÁGINAS' | M2 | R4, Survey |
| 8 | Production Build, Deploy & Git Release | Deploy to Firebase Hosting and push verified commits to GitHub (`jloa-dev/memora`) | M3 | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Core Engine Synchronization (R1, R2, R3) | `js/firebase.js`, `js/app.js` - Deterministic Auth, Concurrency AbortController, Sequence Tokens, Workspace Isolation | none | IN_PROGRESS |
| 2 | M2: Automated Verification Suite (R4) | `package.json`, `tests/verify-concurrency.mjs` - Opaque-box concurrent reload & Supabase persistence verification | M1 | PLANNED |
| 3 | M3: Final E2E Pass, Adversarial Hardening & Release | 100% E2E test pass, Tier 5 hardening, Firebase Hosting deploy, Git commit/push | M1, M2 | PLANNED |

## Interface Contracts
### `firebaseSync` ↔ `MemoraApp`
- `firebaseSync.waitForAuthReady(): Promise<User|null>`: Resolves deterministically once Firebase Auth has read IndexedDB.
- `firebaseSync.onAuthStateChange(cb)`: Registers callback; only invoked AFTER auth readiness is resolved.
- `firebaseSync.loadNotes(workspaceId, signal)`: Accepts explicit target workspace ID and optional `AbortSignal`.
- `firebaseSync.saveNote(note, workspaceId, signal)`: Accepts explicit workspace ID.
- `firebaseSync.deleteNote(noteId, workspaceId, signal)`: Accepts explicit workspace ID.
- `firebaseSync.uploadNotesBatch(notes, workspaceId, signal)`: Accepts explicit workspace ID.
- `MemoraApp.syncUserData(user)`: Manages `syncAbortController` and `syncRequestId`.

## Code Layout
- `js/firebase.js`: Firebase Auth setup, Supabase REST client, session state.
- `js/app.js`: Main application controller, DOM binding, notes state, UI render.
- `index.html`: Shell and DOM containers.
- `tests/`: Automated test suite in Node.js (`tests/verify-concurrency.mjs`).
- `package.json`: NPM scripts for running verification tests.
- `firebase.json`: Firebase Hosting configuration.
