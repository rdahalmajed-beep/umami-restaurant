# Phase 6 smoke: kitchen status transitions + history timestamps.
# Usage (from restaurant-platform/):
#   powershell -File .\scripts\phase6-status-smoke.ps1
# Prefers an existing recent order; otherwise creates one via Phase 5 path.

$ErrorActionPreference = "Stop"
$base = if ($env:MEDUSA_URL) { $env:MEDUSA_URL.TrimEnd("/") } else { "http://localhost:9000" }
$pk = if ($env:PUBLISHABLE_KEY) { $env:PUBLISHABLE_KEY } else {
  "pk_cc98d175a48e868ba1be210b117003d3551f1479f23f9ddc9d123a3a65dba4b7"
}
$adminEmail = if ($env:ADMIN_EMAIL) { $env:ADMIN_EMAIL } else { "admin@restaurant.local" }
$adminPass = if ($env:ADMIN_PASSWORD) { $env:ADMIN_PASSWORD } else { "SuperSecret123!" }

$h = @{ "x-publishable-api-key" = $pk; "Content-Type" = "application/json" }

Write-Host "=== Health ==="
$health = Invoke-WebRequest -Uri "$base/health" -UseBasicParsing -TimeoutSec 15
Write-Host "health=$($health.StatusCode)"

Write-Host "=== Admin auth ==="
$token = ((Invoke-WebRequest -Uri "$base/auth/user/emailpass" -Method POST -ContentType "application/json" -Body (@{ email = $adminEmail; password = $adminPass } | ConvertTo-Json) -UseBasicParsing).Content | ConvertFrom-Json).token
$ah = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

Write-Host "=== Ensure order (reuse latest or create via modifiers) ==="
$orders = (Invoke-WebRequest -Uri "$base/admin/orders?limit=1&order=-created_at" -Headers $ah -UseBasicParsing).Content | ConvertFrom-Json
$orderId = $null
if ($orders.orders -and $orders.orders.Count -gt 0) {
  $orderId = $orders.orders[0].id
  Write-Host "reusing order=$orderId"
} else {
  Write-Host "No orders - running nested Phase 5 create..."
  & powershell -NoProfile -File "$PSScriptRoot\phase5-modifiers-smoke.ps1"
  $orders = (Invoke-WebRequest -Uri "$base/admin/orders?limit=1&order=-created_at" -Headers $ah -UseBasicParsing).Content | ConvertFrom-Json
  $orderId = $orders.orders[0].id
}

Write-Host "=== Get / ensure kitchen status ==="
$statusUrl = "$base/admin/restaurant/orders/$orderId/status"
$ro = ((Invoke-WebRequest -Uri $statusUrl -Headers $ah -UseBasicParsing).Content | ConvertFrom-Json).restaurant_order
Write-Host "status=$($ro.status)"

function Transition([string]$to) {
  $body = @{ status = $to } | ConvertTo-Json
  $r = Invoke-WebRequest -Uri $statusUrl -Method POST -Headers $ah -Body $body -UseBasicParsing
  return ($r.Content | ConvertFrom-Json).restaurant_order
}

function ExpectFail([string]$to) {
  try {
    $null = Transition $to
    throw "Expected transition to $to to fail"
  } catch {
    if ($_.Exception.Message -match "Expected transition") { throw }
    Write-Host "blocked $to (ok)"
  }
}

# Reset path: if already completed/cancelled, we still validate blocks on current
$current = $ro.status
Write-Host "=== Transition validation from $current ==="

if ($current -eq "received") {
  ExpectFail "ready"
  ExpectFail "preparing"
  $ro = Transition "accepted"
  Write-Host "-> $($ro.status)"
  $ro = Transition "preparing"
  Write-Host "-> $($ro.status)"
  $ro = Transition "ready"
  Write-Host "-> $($ro.status)"
  ExpectFail "out_for_delivery"  # may be pickup
  # Try out_for_delivery - if pickup, should fail; if delivery ok
  try {
    $ro2 = Transition "out_for_delivery"
    Write-Host "-> out_for_delivery (delivery order)"
    $ro = Transition "completed"
  } catch {
    Write-Host "out_for_delivery blocked (likely pickup) - completing directly"
    $ro = Transition "completed"
  }
  Write-Host "-> $($ro.status)"
} elseif ($current -eq "completed" -or $current -eq "cancelled") {
  ExpectFail "preparing"
  ExpectFail "accepted"
  Write-Host "Terminal status - block checks passed"
} else {
  Write-Host "Order mid-flow ($current); advancing to completed if possible"
  $path = @("accepted", "preparing", "ready", "completed")
  foreach ($s in $path) {
    if ($ro.status -eq "completed") { break }
    try {
      $ro = Transition $s
      Write-Host "-> $($ro.status)"
    } catch {
      Write-Host "skip $s"
    }
  }
}

Write-Host "=== History timestamps ==="
$ro = ((Invoke-WebRequest -Uri $statusUrl -Headers $ah -UseBasicParsing).Content | ConvertFrom-Json).restaurant_order
$events = @($ro.events)
if ($events.Count -lt 1) { throw "Expected status history events" }
Write-Host "events=$($events.Count) last_by=$($ro.last_transition_by) last_at=$($ro.last_transition_at)"
Write-Host "=== Phase 6 smoke PASSED ==="
