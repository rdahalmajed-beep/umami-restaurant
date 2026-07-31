# Phase 5 smoke: modifiers API + add-to-cart with Cheddar + Extra Sauce + order snapshot.
# Usage (from restaurant-platform/):
#   powershell -File .\scripts\phase5-modifiers-smoke.ps1

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

Write-Host "=== Branches ==="
$branches = (Invoke-WebRequest -Uri "$base/store/restaurant/branches" -Headers $h -UseBasicParsing).Content | ConvertFrom-Json
$branch = $branches.branches | Select-Object -First 1
if (-not $branch) { throw "No active restaurant branch - run pnpm seed" }
Write-Host "branch=$($branch.name) id=$($branch.id)"

Write-Host "=== Region + burger ==="
$regions = (Invoke-WebRequest -Uri "$base/store/regions" -Headers $h -UseBasicParsing).Content | ConvertFrom-Json
$region = $regions.regions | Where-Object { $_.currency_code -eq "bhd" } | Select-Object -First 1
$prodUrl = "$base/store/products?limit=10&region_id=$($region.id)&fields=*variants,*variants.calculated_price"
$prods = (Invoke-WebRequest -Uri $prodUrl -Headers $h -UseBasicParsing).Content | ConvertFrom-Json
$burger = $prods.products | Where-Object { $_.title -match "Classic Beef Burger" } | Select-Object -First 1
if (-not $burger) { throw "Classic Beef Burger not found" }
$variant = $burger.variants | Where-Object { $_.title -eq "Double" } | Select-Object -First 1
if (-not $variant) { $variant = $burger.variants[0] }
$basePrice = [decimal]$variant.calculated_price.calculated_amount
Write-Host "product=$($burger.id) variant=$($variant.title) base=$basePrice"

Write-Host "=== Product modifiers ==="
$mods = (Invoke-WebRequest -Uri "$base/store/restaurant/products/$($burger.id)/modifiers" -Headers $h -UseBasicParsing).Content | ConvertFrom-Json
$groups = @($mods.modifier_groups)
if ($groups.Count -lt 2) { throw "Expected Choose Cheese + Extras on burger, got $($groups.Count)" }
$cheese = $groups | Where-Object { $_.name -match "Cheese" } | Select-Object -First 1
$extras = $groups | Where-Object { $_.name -match "Extras" } | Select-Object -First 1
$cheddar = $cheese.options | Where-Object { $_.name -eq "Cheddar" } | Select-Object -First 1
$sauce = $extras.options | Where-Object { $_.name -eq "Extra Sauce" } | Select-Object -First 1
if (-not $cheddar -or -not $sauce) { throw "Cheddar or Extra Sauce option missing" }
Write-Host "cheddar=$($cheddar.id) sauce=$($sauce.id)"

Write-Host "=== Cart + restaurant meta ==="
$cart = ((Invoke-WebRequest -Uri "$base/store/carts" -Method POST -Headers $h -Body (@{ region_id = $region.id } | ConvertTo-Json) -UseBasicParsing).Content | ConvertFrom-Json).cart
$metaBody = @{
  order_type = "pickup"
  branch_id = $branch.id
  customer_note = "Phase 5 smoke"
} | ConvertTo-Json
Invoke-WebRequest -Uri "$base/store/carts/$($cart.id)/restaurant-meta" -Method POST -Headers $h -Body $metaBody -UseBasicParsing | Out-Null

Write-Host "=== Add with modifiers ==="
$addBody = @{
  variant_id = $variant.id
  quantity = 2
  option_ids = @($cheddar.id, $sauce.id)
  note = "No onions"
} | ConvertTo-Json
$cart2 = ((Invoke-WebRequest -Uri "$base/store/carts/$($cart.id)/line-items-with-modifiers" -Method POST -Headers $h -Body $addBody -UseBasicParsing).Content | ConvertFrom-Json).cart
$item = $cart2.items | Select-Object -First 1
$meta = $item.metadata
$modsSnap = @($meta.restaurant_modifiers)
if ($modsSnap.Count -lt 2) { throw "Expected modifier snapshot on line item" }
$expectedUnit = [math]::Round(($basePrice + 0.3 + 0.15), 3)
$actualUnit = [decimal]$item.unit_price
Write-Host "unit_price=$actualUnit expected=$expectedUnit note=$($meta.restaurant_note)"
if ([math]::Abs($actualUnit - $expectedUnit) -gt 0.001) {
  throw "Unit price mismatch: got $actualUnit expected $expectedUnit"
}
if ($meta.restaurant_note -ne "No onions") { throw "Note snapshot missing" }

Write-Host "=== Checkout pickup + complete ==="
$addr = @{
  email = "phase5-smoke@restaurant.local"
  shipping_address = @{
    first_name = "Ali"; last_name = "Hassan"; address_1 = "Road 1"
    city = "Manama"; country_code = "bh"; phone = "+97336001122"
  }
  billing_address = @{
    first_name = "Ali"; last_name = "Hassan"; address_1 = "Road 1"
    city = "Manama"; country_code = "bh"; phone = "+97336001122"
  }
} | ConvertTo-Json -Depth 5
Invoke-WebRequest -Uri "$base/store/carts/$($cart.id)" -Method POST -Headers $h -Body $addr -UseBasicParsing | Out-Null

$so = (Invoke-WebRequest -Uri "$base/store/shipping-options?cart_id=$($cart.id)" -Headers $h -UseBasicParsing).Content | ConvertFrom-Json
$pickup = $so.shipping_options | Where-Object { $_.name -match "Pickup" } | Select-Object -First 1
Invoke-WebRequest -Uri "$base/store/carts/$($cart.id)/shipping-methods" -Method POST -Headers $h -Body (@{ option_id = $pickup.id } | ConvertTo-Json) -UseBasicParsing | Out-Null

$pc = ((Invoke-WebRequest -Uri "$base/store/payment-collections" -Method POST -Headers $h -Body (@{ cart_id = $cart.id } | ConvertTo-Json) -UseBasicParsing).Content | ConvertFrom-Json).payment_collection
Invoke-WebRequest -Uri "$base/store/payment-collections/$($pc.id)/payment-sessions" -Method POST -Headers $h -Body (@{ provider_id = "pp_system_default" } | ConvertTo-Json) -UseBasicParsing | Out-Null

$done = (Invoke-WebRequest -Uri "$base/store/carts/$($cart.id)/complete" -Method POST -Headers $h -Body "{}" -UseBasicParsing).Content | ConvertFrom-Json
if ($done.type -ne "order") { throw "Complete did not return order" }
$orderId = $done.order.id
Write-Host "ORDER ok id=$orderId display_id=$($done.order.display_id)"

Write-Host "=== Admin order snapshot ==="
$token = ((Invoke-WebRequest -Uri "$base/auth/user/emailpass" -Method POST -ContentType "application/json" -Body (@{ email = $adminEmail; password = $adminPass } | ConvertTo-Json) -UseBasicParsing).Content | ConvertFrom-Json).token
$ah = @{ Authorization = "Bearer $token" }
$adminUrl = "$base/admin/orders/$orderId" + '?fields=' + [uri]::EscapeDataString('*items,*items.metadata,+metadata')
$adminOrder = (Invoke-WebRequest -Uri $adminUrl -Headers $ah -UseBasicParsing).Content | ConvertFrom-Json
$aItem = $adminOrder.order.items | Select-Object -First 1
$aMods = @($aItem.metadata.restaurant_modifiers)
if ($aMods.Count -lt 2) { throw "Admin order missing modifier snapshot" }
$rest = $adminOrder.order.metadata.restaurant
if (-not $rest -or $rest.order_type -ne "pickup") {
  throw "Admin order missing restaurant metadata (order_type/branch)"
}
Write-Host "Admin snapshot OK mods=$($aMods.Count) type=$($rest.order_type) branch=$($rest.branch_name)"
Write-Host "=== Phase 5 smoke PASSED ==="
