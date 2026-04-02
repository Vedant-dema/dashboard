# Manual Smoke Checklist

Use this checklist for every milestone before merge.

## Preconditions

- Backend is running.
- Frontend is running.
- App opens without runtime crash.

## Customer Workflow Checks

1. Open customers page.
   - Expected: page renders and customer list is visible.
2. Create customer.
   - Expected: new record saves and appears in list/detail context.
3. Edit customer.
   - Expected: updates persist and display correctly.
4. VAT flow.
   - Expected: VAT action runs and returns expected status/result handling.
5. Save behavior.
   - Expected: save does not fail silently; user gets clear outcome.
6. History visibility.
   - Expected: customer history/audit area is visible and populated where expected.
7. Reload behavior.
   - Expected: data remains consistent after page reload.
8. Modal shell behavior.
   - Expected: no duplicate modal shell/header/tab rendering.

## Result Log Template

- Date:
- Branch:
- Tester:
- Passed:
- Failed:
- Notes:

