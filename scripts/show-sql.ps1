# PowerShell script to display the SQL setup content
# Run this script to get the SQL content to copy to Supabase

Write-Host "🚀 BLTZ Database Setup Helper" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Instructions:" -ForegroundColor Yellow
Write-Host "1. Go to your Supabase Dashboard: https://supabase.com/dashboard" -ForegroundColor White
Write-Host "2. Select your project" -ForegroundColor White
Write-Host "3. Navigate to SQL Editor (left sidebar)" -ForegroundColor White
Write-Host "4. Create a new query and run the SQL below" -ForegroundColor White
Write-Host ""

Write-Host "📄 SQL Setup Script:" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green

# Read and display the SQL content
$sqlPath = Join-Path $PSScriptRoot "setup-simple-database.sql"
if (Test-Path $sqlPath) {
    $sqlContent = Get-Content $sqlPath -Raw
    Write-Host $sqlContent -ForegroundColor White
} else {
    Write-Host "❌ SQL file not found at: $sqlPath" -ForegroundColor Red
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""

Write-Host "✅ After running this SQL script:" -ForegroundColor Yellow
Write-Host "- The API errors will be resolved" -ForegroundColor White
Write-Host "- Your message center will work properly" -ForegroundColor White
Write-Host "- You can start sending messages" -ForegroundColor White
Write-Host ""

Write-Host "🔗 Copy the SQL content above and paste it into Supabase SQL Editor!" -ForegroundColor Cyan
