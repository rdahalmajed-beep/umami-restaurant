# Phase 4 E2E smoke: Product → Cart → Pickup → Test payment → Order (Store API + Admin).
# Usage (from restaurant-platform/):
#   powershell -File .\scripts\phase4-e2e-smoke.ps1
# Optional env: MEDUSA_URL, PUBLISHABLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD

$ErrorActionPreference = "Stop"
$base = if ($env:MEDUSA_URL) { $env:MEDUSA_URL.TrimEnd("/") } else { "http://localhost:9000" }
$pk = if ($env:PUBLISHABLE_KEY) { $env:PUBLISHABLE_KEY } else {
  # Default from local Phase 2/3 seed; override via PUBLISHABLE_KEY if rotated.
  "pk_cc98d175a48e868ba1be210b117003d3551f1479f23f9ddc9d123a3a65dba4b7"
}
$adminEmail = if ($env:ADMIN_EMAIL) { $env:ADMIN_EMAIL } else { "admin@restaurant.local" }
$adminPass = if ($env:ADMIN_PASSWORD) { $env:ADMIN_PASSWORD } else { "SuperSecret123!" }

$h = @{ "x-publishable-api-key" = $pk; "Content-Type" = "application/json" }

Write-Host "=== Health ==="
$health = Invoke-WebRequest -Uri "$base/health" -UseBasicParsing -TimeoutSec 10
Write-Host "health=$($health.StatusCode)"

Write-Host "=== Region Bahrain ==="
$regions = (Invoke-WebRequest -Uri "$base/store/regions" -Headers $h -UseBasicParsing).Content | ConvertFrom-Json
$region = $regions.regions | Where-Object { $_.currency_code -eq "bhd" -or $_.name -match "Bahrain" } | Select-Object -First 1
if (-not $region) { throw "Bahrain region not found" }
Write-Host "region=$($region.id) $($region.name)"

Write-Host "=== Payment providers ==="
$pp = (Invoke-WebRequest -Uri "$base/store/payment-providers?region_id=$($region.id)" -Headers $h -UseBasicParsing).Content | ConvertFrom-Json
$providers = @($pp.payment_providers | ForEach-Object { $_.id })
Write-Host ("providers=" + ($providers -join ","))
if ($providers -notcontains "pp_system_default") {
  throw "Expected pp_system_default on Bahrain region"
}

Write-Host "=== Product variant ==="
$prods = (Invoke-WebRequest -Uri "$base/store/products?limit=10&region_id=$($region.id)&fields=*variants,*variants.calculated_price" -Headers $h -UseBasicParsing).Content | ConvertFrom-Json
$burger = $prods.products | Where-Object { $_.title -match "Classic Beef Burger" } | Select-Object -First 1
if (-not $burger) { $burger = $prods.products[0] }
$variant = $burger.variants | Where-Object { $_.title -eq "Regular" } | Select-Object -First 1
if (-not $variant) { $variant = $burger.variants[0] }
Write-Host "product=$($burger.title) variant=$($variant.id) price=$($variant.calculated_price.calculated_amount)"

Write-Host "=== Create cart + line item ==="
$cart = ((Invoke-WebRequest -Uri "$base/store/carts" -Method POST -Headers $h -Body (@{ region_id = $region.id } | ConvertTo-Json) -UseBasicParsing).Content | ConvertFrom-Json).cart
Invoke-WebRequest -Uri "$base/store/carts/$($cart.id)/line-items" -Method POST -Headers $h -Body (@{ variant_id = $variant.id; quantity = 1 } | ConvertTo-Json) -UseBasicParsing | Out-Null
Write-Host "cart=$($cart.id)"

Write-Host "=== Customer + addresses (BH) ==="
$addr = @{
  email = "phase4-smoke@restaurant.local"
  shipping_address = @{
    first_name = "Sara"
    last_name = "AlKuwaiti"
    address_1 = "Building 12 Road 45"
    city = "Manama"
    country_code = "bh"
    phone = "+97336001122"
  }
  billing_address = @{
    first_name = "Sara"
    last_name = "AlKuwaiti"
    address_1 = "Building 12 Road 45"
    city = "Manama"
    country_code = "bh"
    phone = "+97336001122"
  }
} | ConvertTo-Json -Depth 5
Invoke-WebRequest -Uri "$base/store/carts/$($cart.id)" -Method POST -Headers $h -Body $addr -UseBasicParsing | Out-Null

Write-Host "=== Shipping options (Delivery + Pickup) ==="
$so = (Invoke-WebRequest -Uri "$base/store/shipping-options?cart_id=$($cart.id)" -Headers $h -UseBasicParsing).Content | ConvertFrom-Json
$names = @($so.shipping_options | ForEach-Object { $_.name })
Write-Host ("options=" + ($names -join " | "))
$hasDelivery = $names | Where-Object { $_ -match "Delivery" }
$hasPickup = $names | Where-Object { $_ -match "Pickup" }
if (-not $hasDelivery -or -not $hasPickup) {
  throw "Expected both Delivery and Pickup shipping options"
}
$pickup = $so.shipping_options | Where-Object { $_.name -match "Pickup" } | Select-Object -First 1
Invoke-WebRequest -Uri "$base/store/carts/$($cart.id)/shipping-methods" -Method POST -Headers $h -Body (@{ option_id = $pickup.id } | ConvertTo-Json) -UseBasicParsing | Out-Null
Write-Host "selected=$($pickup.name)"

Write-Host "=== Test payment session ==="
$pc = ((Invoke-WebRequest -Uri "$base/store/payment-collections" -Method POST -Headers $h -Body (@{ cart_id = $cart.id } | ConvertTo-Json) -UseBasicParsing).Content | ConvertFrom-Json).payment_collection
Invoke-WebRequest -Uri "$base/store/payment-collections/$($pc.id)/payment-sessions" -Method POST -Headers $h -Body (@{ provider_id = "pp_system_default" } | ConvertTo-Json) -UseBasicParsing | Out-Null

Write-Host "=== Complete cart ==="
$done = (Invoke-WebRequest -Uri "$base/store/carts/$($cart.id)/complete" -Method POST -Headers $h -Body "{}" -UseBasicParsing).Content | ConvertFrom-Json
if ($done.type -ne "order") {
  throw "Complete cart did not return an order: $($done | ConvertTo-Json -Depth 4)"
}
$orderId = $done.order.id
$displayId = $done.order.display_id
Write-Host "ORDER ok id=$orderId display_id=$displayId total=$($done.order.total)"

Write-Host "=== Admin can see order ==="
$token = ((Invoke-WebRequest -Uri "$base/auth/user/emailpass" -Method POST -ContentType "application/json" -Body (@{ email = $adminEmail; password = $adminPass } | ConvertTo-Json) -UseBasicParsing).Content | ConvertFrom-Json).token
$ah = @{ Authorization = "Bearer $token" }
# Quote URI so PowerShell does not expand * in fields=
$adminUrl = "$base/admin/orders/$orderId" + '?fields=' + [uri]::EscapeDataString('*items,*shipping_methods,*customer,*shipping_address')
$adminOrder = ((Invoke-WebRequest -Uri $adminUrl -Headers $ah -UseBasicParsing).Content | ConvertFrom-Json).order
Write-Host "admin display_id=$($adminOrder.display_id) items=$($adminOrder.items.Count) shipping=$($adminOrder.shipping_methods[0].name) customer=$($adminOrder.customer.email) city=$($adminOrder.shipping_address.city)"

Write-Host ""
Write-Host "PHASE 4 SMOKE PASSED — order #$displayId visible in Admin."
