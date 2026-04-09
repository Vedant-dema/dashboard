# Customer module map (pointers only)

Use this table to find **owners** of behavior. Open files in the IDE; do not rely on stale pasted excerpts in chat.

## Frontend

| Concern | Path(s) | Role |
|---------|---------|------|
| Customer feature barrel / exports | [frontend/src/features/customers/index.ts](../../../frontend/src/features/customers/index.ts) | Public API of feature module |
| API + demo persistence | [frontend/src/features/customers/repository/customerRepository.ts](../../../frontend/src/features/customers/repository/customerRepository.ts) | Fetch/save customers, conflict handling, history delegation |
| Form ↔ customer payload | [frontend/src/features/customers/mappers/customerFormMapper.ts](../../../frontend/src/features/customers/mappers/customerFormMapper.ts) | Load/save mapping, deprecated field clearing |
| VAT snapshot ↔ form | [frontend/src/features/customers/mappers/vatCheckSnapshotMapper.ts](../../../frontend/src/features/customers/mappers/vatCheckSnapshotMapper.ts) | VIES result normalization |
| Constants (countries, address types) | [frontend/src/features/customers/mappers/customerFormConstants.ts](../../../frontend/src/features/customers/mappers/customerFormConstants.ts) | Static option lists |
| Validation | [frontend/src/features/customers/validators/customerValidation.ts](../../../frontend/src/features/customers/validators/customerValidation.ts) | Required fields, etc. |
| Modal shell / history UI pieces | [frontend/src/features/customers/components/](../../../frontend/src/features/customers/components/) | `CustomerModalFrame`, `CustomerHistoryTimeline`, … |
| Global customer state + domain helpers | [frontend/src/store/kundenStore.ts](../../../frontend/src/store/kundenStore.ts) | Local DB shape, history tracking keys, risk helpers |
| Main list + drawer + routing | [frontend/src/pages/CustomersPage.tsx](../../../frontend/src/pages/CustomersPage.tsx) | Page orchestration |
| Create/edit modal (large) | [frontend/src/components/NewCustomerModal.tsx](../../../frontend/src/components/NewCustomerModal.tsx) | Tabs, VAT check `fetch`, form state |
| Safe website link | [frontend/src/common/utils/websiteHref.ts](../../../frontend/src/common/utils/websiteHref.ts) | `http/https` only for `internet_adr` |
| Types (legacy rich shape) | [frontend/src/types/kunden.ts](../../../frontend/src/types/kunden.ts) | `KundenStamm`, `KundenRisikoanalyse`, … |
| Tests (Milestone 7+) | [frontend/src/features/customers/**/*.test.ts](../../../frontend/src/features/customers/) | Vitest |

## Backend

| Concern | Path(s) | Role |
|---------|---------|------|
| v1 REST routes | [backend/app/api/v1/endpoints/customers.py](../../../backend/app/api/v1/endpoints/customers.py) | HTTP-only: list, get, create, patch, history, wash-profile |
| Customer use cases | [backend/app/services/customer_service.py](../../../backend/app/services/customer_service.py) | Orchestration |
| Customer history use cases | [backend/app/services/history_service.py](../../../backend/app/services/history_service.py) | History reads |
| History persistence | [backend/app/repositories/history_repository.py](../../../backend/app/repositories/history_repository.py) | SQL history rows |
| Repository (blob vs DB) | [backend/app/repositories/customer_repository.py](../../../backend/app/repositories/customer_repository.py) | Persistence selection |
| Pydantic schemas | [backend/app/schemas/customer.py](../../../backend/app/schemas/customer.py) | Request/response models |
| Demo shared state (legacy) | [backend/main.py](../../../backend/main.py) | `GET/PUT /api/v1/demo/customers-db`, conflict payload |
| VAT proxy (customer flow) | [backend/main.py](../../../backend/main.py) | `POST /api/v1/vat/check`, budgets, `_check_vat_impl` |
| Modular VAT info | [backend/app/api/v1/endpoints/vat.py](../../../backend/app/api/v1/endpoints/vat.py), [backend/app/services/vat_service.py](../../../backend/app/services/vat_service.py) | `/api/v1/vat/info` |
| Health / ready | [backend/app/api/v1/endpoints/health.py](../../../backend/app/api/v1/endpoints/health.py) | Readiness for ops |
| Tests | [backend/app/tests/test_customers_api_smoke.py](../../../backend/app/tests/test_customers_api_smoke.py), [backend/app/tests/conftest.py](../../../backend/app/tests/conftest.py) | Pytest + fixtures |

## Documentation (human narrative)

| Doc | Path |
|-----|------|
| Service spec (deep) | [docs/Detailed report/CustomersPage-Service-Spec.md](../../Detailed%20report/CustomersPage-Service-Spec.md) |
| API examples | [docs/api/customer-api.md](../../api/customer-api.md) |
| Product notes | [docs/product/customer-flow.md](../../product/customer-flow.md) |
