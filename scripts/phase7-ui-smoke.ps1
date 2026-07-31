# Phase 7 smoke: restaurant UI surfaces + store kitchen status API.
# Usage (from restaurant-platform/):
#   powershell -File .\scripts\phase7-ui-smoke.ps1
# Uses curl.exe for page fetches (more reliable than Invoke-WebRequest on large Next responses).

$ErrorActionPreference = "Stop"
$base = if ($env:MEDUSA_URL) { $env:MEDUSA_URL.TrimEnd("/") } else { "http://localhost:9000" }
$store = if ($env:STOREFRONT_URL) { $env:STOREFRONT_URL.TrimEnd("/") } else { "http://localhost:8000" }
$pk = if ($env:PUBLISHABLE_KEY) { $env:PUBLISHABLE_KEY } else {
  "pk_cc98d175a48e868ba1be210b117003d3551f1479f23f9ddc9d123a3a65dba4b7"
}
$adminEmail = if ($env:ADMIN_EMAIL) { $env:ADMIN_EMAIL } else { "admin@restaurant.local" }
$adminPass = if ($env:ADMIN_PASSWORD) { $env:ADMIN_PASSWORD } else { "SuperSecret123!" }

Write-Host "=== Backend health ==="
$healthCode = curl.exe -s -o NUL -w "%{http_code}" "$base/health" --max-time 15
if ($healthCode -ne "200") { throw "Backend health failed: $healthCode" }
Write-Host "health=$healthCode"

Write-Host "=== Storefront pages ==="
# Checkout may 404 without a cart cookie — that is expected for anonymous smoke.
$pages = @(
  @{ Path = "/bh"; Expect = @(200) },
  @{ Path = "/bh/store"; Expect = @(200) },
  @{ Path = "/bh/cart"; Expect = @(200) },
  @{ Path = "/bh/checkout"; Expect = @(200, 404) }
)
foreach ($p in $pages) {
  $code = curl.exe -s -o NUL -w "%{http_code}" "$store$($p.Path)" --max-time 90
  if ($p.Expect -notcontains [int]$code) {
    throw "Expected $($p.Expect -join '/') for $($p.Path) got $code"
  }
  Write-Host "OK $code $($p.Path)"
}

Write-Host "=== Home / Menu markers ==="
$homeHtml = curl.exe -s "$store/bh" --max-time 90
if ($homeHtml -notmatch "Umami") { throw "Home missing Umami brand" }
if ($homeHtml -notmatch "View Menu") { throw "Home missing View Menu CTA" }
Write-Host "home ok"

$menuHtml = curl.exe -s "$store/bh/store" --max-time 90
foreach ($marker in @("menu-page", "sticky-category-nav", "menu-view", "Umami")) {
  if ($menuHtml -notmatch [regex]::Escape($marker)) {
    throw "Menu missing marker: $marker"
  }
}
Write-Host "menu markers ok"

Write-Host "=== Categories + products API ==="
$h = @{ "x-publishable-api-key" = $pk; "Content-Type" = "application/json" }
$cats = (Invoke-WebRequest -Uri "$base/store/product-categories?limit=10" -Headers $h -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "categories=$($cats.product_categories.Count)"
$prods = (Invoke-WebRequest -Uri "$base/store/products?limit=10" -Headers $h -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "products=$($prods.products.Count)"
if ($prods.products.Count -lt 1) { throw "No products for menu" }

Write-Host "=== Branches ==="
$branches = (Invoke-WebRequest -Uri "$base/store/restaurant/branches" -Headers $h -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "branches=$($branches.branches.Count)"

Write-Host "=== Store kitchen status endpoint ==="
$token = ((Invoke-WebRequest -Uri "$base/auth/user/emailpass" -Method POST -ContentType "application/json" -Body (@{ email = $adminEmail; password = $adminPass } | ConvertTo-Json) -UseBasicParsing).Content | ConvertFrom-Json).token
$ah = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
$orders = (Invoke-WebRequest -Uri "$base/admin/orders?limit=1&order=-created_at" -Headers $ah -UseBasicParsing).Content | ConvertFrom-Json
if (-not $orders.orders -or $orders.orders.Count -lt 1) {
  Write-Host "No orders yet - skipping store status check (run smoke:phase4|5 first)"
} else {
  $orderId = $orders.orders[0].id
  $statusJson = curl.exe -s -H "x-publishable-api-key: $pk" "$base/store/restaurant/orders/$orderId/status"
  $status = $statusJson | ConvertFrom-Json
  if (-not $status.restaurant_order -or -not $status.restaurant_order.status) {
    throw "Store status endpoint missing restaurant_order.status"
  }
  Write-Host "order=$orderId status=$($status.restaurant_order.status) branch=$($status.branch.name)"
}

Write-Host ""
Write-Host "Phase 7 smoke PASSED"
Write-Host "Manual 375px check: open $store/bh in DevTools device mode (iPhone SE)."
