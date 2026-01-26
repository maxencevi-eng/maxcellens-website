# Restart dev server and call delete endpoint for hero 'contact'
try {
    $pids = @()
    try { $pids = Get-NetTCPConnection -LocalPort 3000 -ErrorAction Stop | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique } catch { 
        $pids = (netstat -aon | Select-String ':3000' | ForEach-Object { ($_ -split '\s+')[-1] }) | Sort-Object -Unique
    }
    foreach ($pid in $pids) {
        try { Stop-Process -Id ([int]$pid) -Force -ErrorAction SilentlyContinue } catch {}
    }
} catch { Write-Output "Failed stopping processes: $_" }

# remove dev lock if present
try { Remove-Item -Path .next\dev\lock -Force -ErrorAction SilentlyContinue } catch {}

# start dev server in background
try {
    Start-Process -FilePath 'cmd.exe' -ArgumentList '/C npm run dev' -WindowStyle Hidden
    Write-Output "Started npm run dev"
} catch { Write-Output "Failed to start dev: $_" }

# wait for the dev server to respond
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000/api/admin/hero?slug=contact' -Method GET -TimeoutSec 3 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
    Start-Sleep -Seconds 1
}
if (-not $ready) { Write-Output 'Dev server did not become ready in time'; exit 1 }
Write-Output 'Dev ready; calling delete endpoint...'

try {
    $body = @{ page = 'contact' } | ConvertTo-Json
    $resp = Invoke-RestMethod -Uri 'http://localhost:3000/api/admin/delete-hero-media' -Method POST -ContentType 'application/json' -Body $body -ErrorAction Stop
    Write-Output 'Response:'
    $resp | ConvertTo-Json -Depth 5
} catch {
    Write-Output 'Delete request failed:'
    Write-Output $_
}
