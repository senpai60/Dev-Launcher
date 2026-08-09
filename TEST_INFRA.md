# E2E Test Infra: Dev Launcher Phase 24 — Instant Project Generator

## Test Philosophy
- Opaque-box, requirement-driven testing. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Scaffold Definitions & Options (5 Scaffolds) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 2 | Main Generator Service & IPC Streaming | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 3 | Preload Bridge & Global Window API | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 4 | React UI Component & Live Terminal Log | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 5 | Integration & Command Palette | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ |

## Test Architecture
- Test runner: vitest / jest / node test suite runner
- Test location: `tests/e2e/generator.spec.ts` / `electron/__tests__/generator.test.ts`
- Pass/fail semantics: exit code 0, 100% test pass rate.

## Coverage Thresholds & Target Counts
- Tier 1 (Feature Coverage): ≥25 test cases (5 per feature across 5 templates & options)
- Tier 2 (Boundary & Corner Cases): ≥25 test cases (empty names, invalid target folders, offline CLI fallback, non-interactive flags)
- Tier 3 (Cross-Feature Combinations): ≥10 test cases (git init + install deps + open editor combinations)
- Tier 4 (Real-World Application Scenarios): ≥5 realistic end-to-end scenarios (scaffold -> auto-detect -> store registration -> launcher view)
- Total Target: ≥65 test cases
