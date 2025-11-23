# PowerShell script to move with-supabase-app files to root
# This will make Vercel build from root directory

Write-Host "Moving with-supabase-app files to root directory..." -ForegroundColor Yellow

# Get the current directory
$rootDir = Get-Location
$sourceDir = Join-Path $rootDir "with-supabase-app"

if (-not (Test-Path $sourceDir)) {
    Write-Host "Error: with-supabase-app directory not found!" -ForegroundColor Red
    exit 1
}

# Files/directories to exclude
$excludeItems = @("node_modules", ".next", ".git", "pnpm-lock.yaml")

Write-Host "Copying files from with-supabase-app to root..." -ForegroundColor Cyan

# Copy all files and directories except excluded ones
Get-ChildItem -Path $sourceDir -Force | Where-Object {
    $excludeItems -notcontains $_.Name
} | ForEach-Object {
    $destPath = Join-Path $rootDir $_.Name
    
    if ($_.PSIsContainer) {
        if (Test-Path $destPath) {
            Write-Host "  Removing existing: $($_.Name)" -ForegroundColor Gray
            Remove-Item -Path $destPath -Recurse -Force
        }
        Write-Host "  Copying directory: $($_.Name)" -ForegroundColor Green
        Copy-Item -Path $_.FullName -Destination $destPath -Recurse -Force
    } else {
        if (Test-Path $destPath) {
            Write-Host "  Replacing file: $($_.Name)" -ForegroundColor Gray
        }
        Copy-Item -Path $_.FullName -Destination $destPath -Force
    }
}

Write-Host ""
Write-Host "✅ Files moved successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review the changes" -ForegroundColor White
Write-Host "2. Delete the with-supabase-app directory (optional)" -ForegroundColor White
Write-Host "3. Commit and push to GitHub" -ForegroundColor White
Write-Host "4. Update Vercel - root directory should now be '.' (root)" -ForegroundColor White

