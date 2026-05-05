param(
  [Parameter(Mandatory = $true)]
  [string]$InputCsv,

  [string]$OutputSql = "D:\Azraq Market\supabase\perla_products_import.sql"
)

$ErrorActionPreference = "Stop"

function SqlString([object]$Value) {
  if ($null -eq $Value) { return "null" }
  $text = [string]$Value
  if ([string]::IsNullOrWhiteSpace($text)) { return "null" }
  $escaped = $text.Replace("'", "''")
  return "'$escaped'"
}

function SqlNumber([object]$Value, [decimal]$Default = 0) {
  if ($null -eq $Value) { return $Default.ToString([Globalization.CultureInfo]::InvariantCulture) }
  $text = ([string]$Value).Trim()
  if ([string]::IsNullOrWhiteSpace($text)) { return $Default.ToString([Globalization.CultureInfo]::InvariantCulture) }
  $text = $text -replace "[^\d\.\-]", ""
  $number = 0.0
  if ([double]::TryParse($text, [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$number)) {
    return $number.ToString("0.##", [Globalization.CultureInfo]::InvariantCulture)
  }
  return $Default.ToString([Globalization.CultureInfo]::InvariantCulture)
}

function ToNumber([object]$Value, [decimal]$Default = 0) {
  [decimal](SqlNumber $Value $Default)
}

function ToStock([object]$Value, [string]$Status) {
  $text = if ($null -eq $Value) { "" } else { ([string]$Value).Trim() }
  $stock = 0
  if ([int]::TryParse($text, [ref]$stock)) { return [Math]::Max(0, $stock) }
  if ($Status -eq "ACTIVE" -and ($text -eq "Available" -or [string]::IsNullOrWhiteSpace($text))) { return 10 }
  return 0
}

function StripHtml([object]$Value) {
  if ($null -eq $Value) { return "" }
  $text = [System.Net.WebUtility]::HtmlDecode([string]$Value)
  $text = $text -replace "<[^>]+>", " "
  $text = $text -replace "\s+", " "
  return $text.Trim()
}

function GetCollections([object]$Value) {
  if ($null -eq $Value) { return @() }
  $allProductsArabic = [string]::Concat([char]1603, [char]1604, [char]32, [char]1575, [char]1604, [char]1605, [char]1606, [char]1578, [char]1580, [char]1575, [char]1578)
  $generic = @($allProductsArabic, "all products", "all")
  return ([string]$Value).Split(",") |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ -and ($generic -notcontains $_.ToLowerInvariant()) }
}

function GetImages([object]$Value) {
  if ($null -eq $Value) { return @() }
  return ([string]$Value).Split([char[]]@(" ", "`t", "`r", "`n"), [StringSplitOptions]::RemoveEmptyEntries) |
    Where-Object { $_ -match "^https?://" } |
    Select-Object -First 2
}

$rows = Import-Csv -Path $InputCsv -Encoding UTF8
$products = New-Object System.Collections.Generic.List[object]
$categoryNames = New-Object System.Collections.Generic.HashSet[string]

foreach ($row in $rows) {
  if ([string]::IsNullOrWhiteSpace($row.Title) -or $row.Status -ne "ACTIVE") { continue }

  $collections = @(GetCollections $row.Collections)
  $category = if ($collections.Count -gt 0) { $collections[0] } else { "Perla Space" }
  [void]$categoryNames.Add($category)

  $salePrice = ToNumber $row.'Sale Price' 0
  $regularPrice = ToNumber $row.'Regular Price' 0
  $price = if ($salePrice -gt 0) { $salePrice } else { $regularPrice }
  $stock = ToStock $row.Quantity $row.Status
  $images = @(GetImages $row.Images)
  $description = StripHtml $(if (-not [string]::IsNullOrWhiteSpace($row.Description)) { $row.Description } else { $row.'SEO Description' })

  $products.Add([pscustomobject]@{
    Name = $row.Title.Trim()
    Description = $description
    Price = $price
    Cost = ToNumber $row.Cost 0
    Stock = $stock
    IsAvailable = ($stock -gt 0)
    Image1 = if ($images.Count -gt 0) { $images[0] } else { $null }
    Image2 = if ($images.Count -gt 1) { $images[1] } else { $null }
    Category = $category
  }) | Out-Null
}

$orderedCategories = $categoryNames | Sort-Object
$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("-- Generated from $InputCsv")
$lines.Add("-- Assumption: non-numeric 'Available' quantity is imported as 10 stock units.")
$lines.Add("-- Run after supabase/business_features_migration.sql so inventory columns exist.")
$lines.Add("")
$lines.Add("create extension if not exists ""pgcrypto"";")
$lines.Add("")
$lines.Add("alter table public.categories add column if not exists is_active boolean not null default true;")
$lines.Add("alter table public.products add column if not exists stock_quantity integer not null default 0 check (stock_quantity >= 0);")
$lines.Add("alter table public.products add column if not exists cost_price numeric(12,2) not null default 0 check (cost_price >= 0);")
$lines.Add("alter table public.products add column if not exists subcategory_id uuid null;")
$lines.Add("")

$lines.Add("with source_categories(name, sort_order) as (")
$categoryValues = @()
$i = 1
foreach ($category in $orderedCategories) {
  $categoryValues += "  (" + (SqlString $category) + ", $i)"
  $i++
}
$lines.Add("values")
$lines.Add(($categoryValues -join ",`n"))
$lines.Add(")")
$lines.Add("insert into public.categories (name, sort_order, is_active)")
$lines.Add("select source_categories.name, source_categories.sort_order, true")
$lines.Add("from source_categories")
$lines.Add("where not exists (select 1 from public.categories where categories.name = source_categories.name);")
$lines.Add("")

$lines.Add("with source_products(name, description, price, cost_price, unit_type, stock_quantity, is_available, image_1_url, image_2_url, category_name) as (")
$productValues = @()
foreach ($product in $products) {
  $productValues += "  (" +
    (SqlString $product.Name) + ", " +
    (SqlString $product.Description) + ", " +
    (SqlNumber $product.Price) + ", " +
    (SqlNumber $product.Cost) + ", " +
    "'piece'::public.unit_type, " +
    $product.Stock + ", " +
    ($(if ($product.IsAvailable) { "true" } else { "false" })) + ", " +
    (SqlString $product.Image1) + ", " +
    (SqlString $product.Image2) + ", " +
    (SqlString $product.Category) + ")"
}
$lines.Add("values")
$lines.Add(($productValues -join ",`n"))
$lines.Add("), resolved_products as (")
$lines.Add("  select source_products.*, categories.id as category_id")
$lines.Add("  from source_products")
$lines.Add("  left join public.categories on categories.name = source_products.category_name")
$lines.Add(")")
$lines.Add("insert into public.products (category_id, name, description, price, cost_price, unit_type, stock_quantity, is_available, image_1_url, image_2_url)")
$lines.Add("select category_id, name, description, price, cost_price, unit_type, stock_quantity, is_available, image_1_url, image_2_url")
$lines.Add("from resolved_products")
$lines.Add("where not exists (select 1 from public.products where products.name = resolved_products.name);")
$lines.Add("")
$lines.Add("notify pgrst, 'reload schema';")

$outputDir = Split-Path -Parent $OutputSql
if (-not (Test-Path -LiteralPath $outputDir)) { New-Item -ItemType Directory -Path $outputDir | Out-Null }
$lines | Set-Content -Path $OutputSql -Encoding UTF8

Write-Host "Generated $($products.Count) products in $OutputSql"
