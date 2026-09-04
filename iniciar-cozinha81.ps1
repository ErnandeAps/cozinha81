# ==========================================
# COZINHA81 - INICIAR BACKEND + BACKOFFICE + NGROK
# ==========================================

$Projeto = "E:\Projetos\cozinha81\cozinha81-core-main"

function Test-PortInUse {
    param(
        [int]$Port
    )

    $listener = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
        Where-Object { $_.State -eq 'Listen' } |
        Select-Object -First 1

    return [bool]$listener
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "        INICIANDO COZINHA81" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Set-Location $Projeto

# Desabilita temporariamente o Nx Daemon
# Backend em runtime deve usar o papel cozinha_app; DATABASE_URL não pode ficar setado
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
$env:NX_DAEMON = "false"
$env:PGHOST = "localhost"
$env:PGPORT = "5432"
$env:PGDATABASE = "cozinha81"
$env:PGUSER = "cozinha_app"
$env:PGPASSWORD = "app_pwd"

Write-Host ""
if (Test-PortInUse -Port 3000) {
    Write-Host "[1/4] Porta 3000 já está em uso. O backend já está rodando." -ForegroundColor Yellow
} else {
    Write-Host "[1/4] Iniciando Backend na porta 3000..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$Projeto'; Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue; `$env:NX_DAEMON='false'; `$env:PGHOST='localhost'; `$env:PGPORT='5432'; `$env:PGDATABASE='cozinha81'; `$env:PGUSER='cozinha_app'; `$env:PGPASSWORD='app_pwd'; npx nx serve backend"
    )
}

Start-Sleep -Seconds 5

Write-Host ""
if (Test-PortInUse -Port 4200) {
    Write-Host "[2/4] Porta 4200 já está em uso. O backoffice já está rodando." -ForegroundColor Yellow
} else {
    Write-Host "[2/4] Iniciando Backoffice na porta 4200..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$Projeto'; `$env:NX_DAEMON='false'; npx nx serve backoffice"
    )
}

Start-Sleep -Seconds 8

Write-Host ""
Write-Host "[3/4] Criando túnel ngrok para Backend..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "ngrok http 3000"
)

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "[4/4] Criando túnel ngrok para Backoffice..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "ngrok http 4200"
)

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "       COZINHA81 INICIADO" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:   http://localhost:3000" -ForegroundColor White
Write-Host "Backoffice: http://localhost:4200" -ForegroundColor White
Write-Host ""
Write-Host "Túneis ngrok foram abertos em novas janelas." -ForegroundColor Cyan
Write-Host ""

try {
    $tunnels = Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4040/api/tunnels -TimeoutSec 10 | ConvertFrom-Json
    if ($tunnels -and $tunnels.tunnels) {
        Write-Host "URLs públicas ativas:" -ForegroundColor Cyan
        $tunnels.tunnels | Select-Object public_url, proto, name | Format-Table -AutoSize
    }
} catch {
    Write-Host "Aguarde alguns segundos e consulte http://127.0.0.1:4040 para ver as URLs públicas." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Para encerrar, feche as janelas abertas." -ForegroundColor Gray
