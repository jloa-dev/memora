# E2E Test Infra: Memora Notes Concurrency & Hydration

## Test Philosophy
- Opaque-box, requirement-driven, simulating user interactions and network conditions.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.
- Target: Verify 100% elimination of F5 reload race condition, guaranteeing data integrity of notes in Supabase PostgreSQL (`public.memora_notes`).

## Feature Inventory
| # | Feature | Source | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Workload) |
|---|---------|--------|:-----------------:|:-----------------:|:-----------------:|:-----------------:|
| 1 | Deterministic Auth Resolution | R1 | 5 tests | 5 tests | ✓ | ✓ |
| 2 | Frame-0 Session Hydration | R1 | 5 tests | 5 tests | ✓ | ✓ |
| 3 | AbortController In-Flight Cancellation | R2 | 5 tests | 5 tests | ✓ | ✓ |
| 4 | Stale Response Discard | R2 | 5 tests | 5 tests | ✓ | ✓ |
| 5 | Strict Workspace Isolation | R3 | 5 tests | 5 tests | ✓ | ✓ |
| 6 | Template Upload Guardrails | R3 | 5 tests | 5 tests | ✓ | ✓ |
| 7 | Data Persistence & Atomicity | AC | 5 tests | 5 tests | ✓ | ✓ |

## Test Architecture
- Test Runner: Node.js test script (`tests/verify-concurrency.mjs`).
- Pass/Fail Semantics: Exit code 0, 100% assertions passed.
- Scenarios:
  - 10+ rapid concurrent reload simulations with out-of-order responses.
  - Live Supabase query verification confirming 'PÁGINAS' title, content, and workspace ID.
  - Cross-workspace isolation tests (guest vs authenticated).
  - Stale response injection test verifying that responses from superseded requests are dropped.

## Coverage Thresholds
- Tier 1: ≥35 tests covering all 7 features in isolation.
- Tier 2: ≥35 boundary/corner cases (rapid F5 burst, zero latency, extreme latency, network abort, null auth).
- Tier 3: Pairwise combinations of auth state transitions and in-flight responses.
- Tier 4: Real-world workload: 10 consecutive rapid F5 reloads retaining notes without template flicker.
