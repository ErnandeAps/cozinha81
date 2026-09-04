$Projeto = "E:\Projetos\cozinha81\cozinha81-core-main"
Set-Location $Projeto

function Test-PortInUse {
  param(
    [int]$Port
  )

  $listener = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
    Where-Object { $_.State -eq 'Listen' } |
    Select-Object -First 1

  return [bool]$listener
}

# Garantir ambiente do PostgreSQL para o backend local
# IMPORTANTE: runtime do backend usa o papel cozinha_app e NÃO DATABASE_URL
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
$env:PGHOST = "localhost"
$env:PGPORT = "5432"
$env:PGUSER = "cozinha_app"
$env:PGPASSWORD = "app_pwd"
$env:PGDATABASE = "cozinha81"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "        INICIANDO COZINHA81" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

if (Test-PortInUse -Port 3000) {
  Write-Host "A porta 3000 já está em uso. O backend já está rodando; pulando nova inicialização." -ForegroundColor Yellow
} else {
  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$Projeto'; Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue; `$env:NX_DAEMON='false'; `$env:PGHOST='localhost'; `$env:PGPORT='5432'; `$env:PGDATABASE='cozinha81'; `$env:PGUSER='cozinha_app'; `$env:PGPASSWORD='app_pwd'; npx nx serve backend"
  )
}

if (Test-PortInUse -Port 4200) {
  Write-Host "A porta 4200 já está em uso. O backoffice já está rodando; pulando nova inicialização." -ForegroundColor Yellow
} else {
  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$Projeto'; Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue; `$env:NX_DAEMON='false'; `$env:PGHOST='localhost'; `$env:PGPORT='5432'; `$env:PGDATABASE='cozinha81'; `$env:PGUSER='cozinha_app'; `$env:PGPASSWORD='app_pwd'; npx nx serve backoffice"
  )
}

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "ngrok http 3000"
)

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "ngrok http 4200"
)

Start-Sleep -Seconds 6

Write-Host ""
Write-Host "URLs públicas do ngrok:" -ForegroundColor Green
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4040/api/tunnels | ConvertFrom-Json | Select-Object -ExpandProperty tunnels | Select-Object public_url, proto, name | Format-Table -AutoSize

Write-Host ""
Write-Host "Backend local: http://localhost:3000" -ForegroundColor White
Write-Host "Backoffice local: http://localhost:4200" -ForegroundColor White
Write-Host ""