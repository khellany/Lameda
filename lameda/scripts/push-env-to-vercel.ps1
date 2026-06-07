# Push environment variables from .env.local to Vercel.
# Run from the lameda/ directory: .\scripts\push-env-to-vercel.ps1
# Skips comments, blank lines, and the example placeholder values.

$envFile = Join-Path $PSScriptRoot "..\\.env.local"
$lines = Get-Content $envFile

foreach ($line in $lines) {
    # Skip comments and blank lines
    if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
    if ($line -notmatch '=') { continue }

    $idx = $line.IndexOf('=')
    $key = $line.Substring(0, $idx).Trim()
    $value = $line.Substring($idx + 1).Trim()

    # Skip placeholder values (not yet filled in)
    if ($value -match '^your-' -or $value -match '^sk-ant-your' -or $value -match '^pk_test_your' -or $value -match '^sk_test_your') {
        Write-Host "  SKIP  $key (placeholder value)"
        continue
    }

    Write-Host "  ADD   $key"
    $value | vercel env add $key production --force 2>&1 | Out-Null
    $value | vercel env add $key preview --force 2>&1 | Out-Null
}

Write-Host "`nDone. Run 'vercel env ls' to verify."
