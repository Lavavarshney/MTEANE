param(
  [string]$BaseUrl = 'http://127.0.0.1:3000',
  [int]$MaxPollSeconds = 20,
  [bool]$AutoStartWorker = $true
)

$ErrorActionPreference = 'Stop'

$checks = New-Object System.Collections.Generic.List[object]

function Add-Check {
  param(
    [string]$Name,
    [bool]$Passed,
    [string]$Details
  )

  $checks.Add([pscustomobject]@{
      Name    = $Name
      Passed  = $Passed
      Details = $Details
    })
}

function Invoke-JsonPost {
  param(
    [string]$Url,
    [hashtable]$Body,
    [hashtable]$Headers = @{}
  )

  $jsonBody = $Body | ConvertTo-Json -Depth 20
  return Invoke-RestMethod -Method Post -Uri $Url -Headers $Headers -ContentType 'application/json' -Body $jsonBody
}

function Get-DbScalar {
  param([string]$Sql)

  if (-not $env:DATABASE_URL) {
    throw 'DATABASE_URL is not set in environment or .env file.'
  }

  $psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
  if ($psqlCmd) {
    $raw = & psql $env:DATABASE_URL -t -A -v ON_ERROR_STOP=1 -c $Sql
    if ($LASTEXITCODE -ne 0) {
      throw "psql failed while running SQL: $Sql"
    }

    return ($raw | Out-String).Trim()
  }

  $nodeScript = @"
const { Client } = require('pg');

(async () => {
  const sql = process.argv[1];
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query(sql);
    const row = result.rows[0] || {};
    const firstValue = Object.values(row)[0];
    process.stdout.write(String(firstValue ?? ''));
  } finally {
    await client.end();
  }
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
"@

  $raw = & node -e $nodeScript -- $Sql
  if ($LASTEXITCODE -ne 0) {
    throw "Node pg fallback failed while running SQL: $Sql"
  }

  return ($raw | Out-String).Trim()
}

function Ensure-DatabaseUrl {
  if ($env:DATABASE_URL) {
    return
  }

  $envPath = Join-Path $PSScriptRoot '..\.env'
  if (-not (Test-Path $envPath)) {
    return
  }

  $lines = Get-Content -Path $envPath
  foreach ($line in $lines) {
    $trimmed = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith('#')) {
      continue
    }

    if ($trimmed -match '^DATABASE_URL\s*=\s*(.+)$') {
      $value = $matches[1].Trim()
      if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
      }
      $env:DATABASE_URL = $value
      break
    }
  }
}

Write-Host 'Running Phase 3 end-to-end checks...'
Write-Host "Target API: $BaseUrl"
Ensure-DatabaseUrl

$eventIdMatched = $null
$eventIdUnmatched = $null
$ruleId = $null
$orgId = $null
$workerProcess = $null

if ($AutoStartWorker) {
  try {
    Write-Host 'Starting temporary worker for this check...'
    $workerProcess = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run worker' -WorkingDirectory (Resolve-Path (Join-Path $PSScriptRoot '..')).Path -PassThru
    Start-Sleep -Seconds 3
    Add-Check -Name 'Temporary worker started' -Passed $true -Details ("pid={0}" -f $workerProcess.Id)
  } catch {
    Add-Check -Name 'Temporary worker started' -Passed $false -Details $_.Exception.Message
  }
}

# 1) Health check
try {
  $health = Invoke-RestMethod -Method Get -Uri "$BaseUrl/health"
  $healthOk = $health.status -eq 'ok' -or $health.status -eq 'degraded'
  Add-Check -Name 'Health endpoint reachable' -Passed $healthOk -Details ("status={0}" -f $health.status)
} catch {
  Add-Check -Name 'Health endpoint reachable' -Passed $false -Details $_.Exception.Message
}

# 2) Register org
$apiKey = $null
try {
  $slug = 'phase3-org-' + (Get-Date -Format 'yyyyMMddHHmmss') + '-' + (Get-Random -Minimum 1000 -Maximum 9999)
  $registerBody = @{
    name = 'Phase 3 E2E Org'
    slug = $slug
  }

  $register = Invoke-JsonPost -Url "$BaseUrl/auth/register" -Body $registerBody
  $apiKey = [string]$register.api_key
  $orgId = [string]$register.org_id

  $ok = -not [string]::IsNullOrWhiteSpace($apiKey) -and -not [string]::IsNullOrWhiteSpace($orgId)
  Add-Check -Name 'Auth register returns org_id and api_key' -Passed $ok -Details ("org_id={0}" -f $orgId)
} catch {
  Add-Check -Name 'Auth register returns org_id and api_key' -Passed $false -Details $_.Exception.Message
}

# 3) Create rule (Phase 3 format)
if ($apiKey) {
  try {
    $ruleBody = @{
      name = 'High Value Orders'
      event_type = 'order.created'
      condition = @{
        field = 'order.amount'
        operator = 'gte'
        value = 100
      }
      action_type = 'webhook'
      action_config = @{
        url = 'https://example.com/webhook'
      }
    }

    $rule = Invoke-JsonPost -Url "$BaseUrl/rules" -Body $ruleBody -Headers @{ 'x-api-key' = $apiKey }
    $ruleId = [string]$rule.id

    $ok = -not [string]::IsNullOrWhiteSpace($ruleId)
    Add-Check -Name 'Create rule succeeds' -Passed $ok -Details ("rule_id={0}" -f $ruleId)
  } catch {
    Add-Check -Name 'Create rule succeeds' -Passed $false -Details $_.Exception.Message
  }
} else {
  Add-Check -Name 'Create rule succeeds' -Passed $false -Details 'Skipped because API key was not obtained'
}

# 4) Send matching event
if ($apiKey) {
  try {
    $eventBodyMatched = @{
      event_type = 'order.created'
      payload = @{
        order = @{
          id = 'A-1001'
          amount = 250
        }
      }
      idempotency_key = 'phase3-match-' + [guid]::NewGuid().ToString()
    }

    $eventMatched = Invoke-JsonPost -Url "$BaseUrl/events" -Body $eventBodyMatched -Headers @{ 'x-api-key' = $apiKey }
    $eventIdMatched = [string]$eventMatched.event_id

    $ok = -not [string]::IsNullOrWhiteSpace($eventIdMatched)
    Add-Check -Name 'Matching event accepted' -Passed $ok -Details ("event_id={0}" -f $eventIdMatched)
  } catch {
    Add-Check -Name 'Matching event accepted' -Passed $false -Details $_.Exception.Message
  }
} else {
  Add-Check -Name 'Matching event accepted' -Passed $false -Details 'Skipped because API key was not obtained'
}

# 5) Verify pending action_log exists for matching event
if ($eventIdMatched) {
  try {
    $pendingCount = 0
    for ($i = 0; $i -lt $MaxPollSeconds; $i++) {
      $sql = "SELECT COUNT(*) FROM action_logs WHERE event_id = '$eventIdMatched' AND status = 'pending';"
      $countRaw = Get-DbScalar -Sql $sql
      $pendingCount = [int]$countRaw
      if ($pendingCount -gt 0) {
        break
      }
      Start-Sleep -Seconds 1
    }

    $ok = $pendingCount -gt 0
    if ($ok) {
      Add-Check -Name 'Matched rule creates pending action_log' -Passed $true -Details ("pending_count={0}" -f $pendingCount)
    } else {
      Add-Check -Name 'Matched rule creates pending action_log' -Passed $false -Details 'pending_count=0 (likely worker is not running or did not process the job yet)'
    }
  } catch {
    Add-Check -Name 'Matched rule creates pending action_log' -Passed $false -Details $_.Exception.Message
  }
} else {
  Add-Check -Name 'Matched rule creates pending action_log' -Passed $false -Details 'Skipped because matching event was not created'
}

# 6) Send non-matching event
if ($apiKey) {
  try {
    $eventBodyUnmatched = @{
      event_type = 'order.created'
      payload = @{
        order = @{
          id = 'A-1002'
          amount = 50
        }
      }
      idempotency_key = 'phase3-no-match-' + [guid]::NewGuid().ToString()
    }

    $eventUnmatched = Invoke-JsonPost -Url "$BaseUrl/events" -Body $eventBodyUnmatched -Headers @{ 'x-api-key' = $apiKey }
    $eventIdUnmatched = [string]$eventUnmatched.event_id

    $ok = -not [string]::IsNullOrWhiteSpace($eventIdUnmatched)
    Add-Check -Name 'Non-matching event accepted' -Passed $ok -Details ("event_id={0}" -f $eventIdUnmatched)
  } catch {
    Add-Check -Name 'Non-matching event accepted' -Passed $false -Details $_.Exception.Message
  }
} else {
  Add-Check -Name 'Non-matching event accepted' -Passed $false -Details 'Skipped because API key was not obtained'
}

# 7) Verify no action_log for non-matching event
if ($eventIdUnmatched) {
  try {
    Start-Sleep -Seconds 2
    $sql = "SELECT COUNT(*) FROM action_logs WHERE event_id = '$eventIdUnmatched';"
    $countRaw = Get-DbScalar -Sql $sql
    $allCount = [int]$countRaw
    $ok = $allCount -eq 0
    Add-Check -Name 'Non-matching event creates no action_log' -Passed $ok -Details ("action_log_count={0}" -f $allCount)
  } catch {
    Add-Check -Name 'Non-matching event creates no action_log' -Passed $false -Details $_.Exception.Message
  }
} else {
  Add-Check -Name 'Non-matching event creates no action_log' -Passed $false -Details 'Skipped because non-matching event was not created'
}

# Summary
Write-Host ''
Write-Host 'Phase 3 Check Results'
Write-Host '---------------------'

foreach ($c in $checks) {
  $statusText = if ($c.Passed) { 'PASS' } else { 'FAIL' }
  Write-Host ("[{0}] {1} - {2}" -f $statusText, $c.Name, $c.Details)
}

$failed = @($checks | Where-Object { -not $_.Passed }).Count
Write-Host ''

if ($workerProcess) {
  try {
    if (-not $workerProcess.HasExited) {
      Stop-Process -Id $workerProcess.Id -Force
    }
  } catch {
    Write-Host ("Warning: failed to stop temporary worker pid {0}: {1}" -f $workerProcess.Id, $_.Exception.Message)
  }
}

if ($failed -eq 0) {
  Write-Host 'FINAL RESULT: PASS'
  exit 0
}

Write-Host ("FINAL RESULT: FAIL ({0} checks failed)" -f $failed)
exit 1
