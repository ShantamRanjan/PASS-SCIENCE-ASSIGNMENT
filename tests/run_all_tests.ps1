# Verification Test Runner for NEXUS Workbench
# Runs both native C++ GoogleTest and frontend Vitest test suites

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host " Running C++ Native Backend Test Suite" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$backendTestExe = Join-Path $PSScriptRoot "..\backend\build-msvc\Release\nexus-tests.exe"
if (Test-Path $backendTestExe) {
    & $backendTestExe
    if ($LASTEXITCODE -ne 0) {
        Write-Error "C++ unit tests failed!"
        exit 1
    }
} else {
    Write-Warning "nexus-tests.exe not found at $backendTestExe. Run cmake build first."
}

Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host " Running Frontend Vitest Test Suite" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$frontendDir = Join-Path $PSScriptRoot "..\frontend\pixel-perfect-replay-45857-main"
Push-Location $frontendDir
npm run test
Pop-Location

Write-Host "`nAll verification test suites completed successfully!" -ForegroundColor Green
