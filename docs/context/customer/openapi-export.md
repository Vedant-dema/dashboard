# Exporting OpenAPI JSON (optional)

Use a running backend (same port as local uvicorn).

## Bash

```bash
curl -s "http://127.0.0.1:8010/openapi.json" -o openapi.snapshot.json
```

## PowerShell

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8010/openapi.json" -OutFile "openapi.snapshot.json"
```

Add `openapi.snapshot.json` to `.gitignore` if you keep snapshots locally; or attach to a release artifact instead of committing.

Regenerate after **breaking** API changes so tools and reviewers share one contract.
