# NXC-Esports Startup Script

# 1. Bypass execution policy for the current process
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

Write-Host "Starting NXC-Esports Services..." -ForegroundColor Cyan

# 2. Check if ports are available
$p3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
$p5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue

if ($p3001) {
    Write-Host "WARNING: Port 3001 is already in use. Attempting to restart anyway..." -ForegroundColor Yellow
}
if ($p5173) {
    Write-Host "WARNING: Port 5173 is already in use. Attempting to restart anyway..." -ForegroundColor Yellow
}

# 3. Start Server and Dev Environment
# Use Jobs to run in background or separate windows
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run server" -WindowStyle Normal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal

Write-Host "Services initiated." -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend: http://localhost:3001"
