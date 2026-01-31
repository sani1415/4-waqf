# Kill processes listening on common development ports
# RUN AS ADMINISTRATOR: Right-click PowerShell -> Run as Administrator, then:
#   cd "D:\apps by AI\1-GitHub\waqf"
#   .\kill-dev-ports.ps1

$ports = @(8000, 5500, 7070, 12345, 5040, 808, 10000)
$killed = @()
$failed = @()

foreach ($port in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        $pid = $conn.OwningProcess
        try {
            Stop-Process -Id $pid -Force -ErrorAction Stop
            $killed += "Port $port (PID $pid)"
        } catch {
            $failed += "Port $port (PID $pid): $($_.Exception.Message)"
        }
    }
}

Write-Host "`nKilled: $($killed.Count)" -ForegroundColor Green
$killed | ForEach-Object { Write-Host "  $_" }
if ($failed.Count -gt 0) {
    Write-Host "`nFailed (need Admin?): $($failed.Count)" -ForegroundColor Yellow
    $failed | ForEach-Object { Write-Host "  $_" }
}
