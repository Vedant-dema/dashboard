# Customer Flow

This document captures the baseline customer workflow that must be preserved while refactoring.

## Core User Flow

1. Open customers page.
2. Open create or edit customer modal.
3. Enter or update customer master data.
4. Optionally run VAT validation.
5. Save customer.
6. Review history and related sections.
7. Reload and confirm data persistence behavior.

## Non-Negotiable Behaviors

- create customer works
- edit customer works
- VAT flow works
- save flow is reliable
- history remains visible
- no duplicate modal shell/header/tab behavior

## UX Direction

- Phase 1A: stabilization only
- Phase 1B: hierarchy and Customer 360 clarity improvements

## Test Source

- Manual smoke checklist: `docs/operations/smoke-checklist.md`

