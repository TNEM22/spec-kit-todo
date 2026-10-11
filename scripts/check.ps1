#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Local quality gate — run all checks before every merge until CI is running.

.DESCRIPTION
    Mirrors .github/workflows/ci.yml exactly. Exits non-zero on the first failure.
    Run from the repository root:

        .\scripts\check.ps1

    Prerequisites: Python 3.12 virtualenv at backend\.venv, Node 24 and Angular CLI 21.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path $PSScriptRoot -Parent

function Step($label, [scriptblock]$block) {
    Write-Host "`n===== $label =====" -ForegroundColor Cyan
    & $block
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED: $label" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    Write-Host "PASSED: $label" -ForegroundColor Green
}

Set-Location $root

# ── Backend checks ──────────────────────────────────────────────────────────
$python = Join-Path $root 'backend\.venv\Scripts\python.exe'
if (-not (Test-Path $python)) {
    $python = Join-Path $root 'backend\.venv\bin\python'
}

Step 'ruff (lint + docstring rules)' {
    & $python -m ruff check backend/app backend/tests
}

Step 'pytest (unit + contract + integration)' {
    Set-Location (Join-Path $root 'backend')
    & $python -m pytest --tb=short -q
    Set-Location $root
}

Step 'pip-audit (dependency vulnerability scan)' {
    & $python -m pip_audit -r (Join-Path $root 'backend\requirements.txt') --progress-spinner=off
}

Step 'OpenAPI drift (committed JSON matches live schema)' {
    Set-Location (Join-Path $root 'backend')
    & $python -m pytest tests/contract/test_openapi_drift.py --tb=short -q
    Set-Location $root
}

# ── Frontend checks ──────────────────────────────────────────────────────────
Set-Location (Join-Path $root 'frontend')

Step 'ng test (Vitest unit tests)' {
    npm test
}

Step 'ng lint (ESLint + TSDoc + no-innerHTML rule)' {
    npm run lint
}

Step 'npm run build (production bundle)' {
    npm run build
}

Step 'npm audit --audit-level=high (frontend vulnerabilities)' {
    npm audit --audit-level=high
}

Set-Location $root

Write-Host "`n===== ALL CHECKS PASSED =====" -ForegroundColor Green
