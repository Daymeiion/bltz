# PowerShell script to update Vercel project root directory
# Usage: .\update-vercel-root.ps1 -Token "your_token" -ProjectId "your_project_id"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token,
    
    [Parameter(Mandatory=$true)]
    [string]$ProjectId,
    
    [string]$RootDirectory = "with-supabase-app"
)

$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

$body = @{
    rootDirectory = $RootDirectory
} | ConvertTo-Json

Write-Host "Updating Vercel project root directory to: $RootDirectory" -ForegroundColor Yellow
Write-Host "Project ID: $ProjectId" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "https://api.vercel.com/v9/projects/$ProjectId" -Method PATCH -Headers $headers -Body $body
    
    Write-Host "✅ Successfully updated root directory!" -ForegroundColor Green
    Write-Host "Root Directory: $($response.rootDirectory)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Go to Vercel dashboard and redeploy your project" -ForegroundColor White
    Write-Host "2. The build should now use the correct directory" -ForegroundColor White
} catch {
    Write-Host "❌ Error updating root directory:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

