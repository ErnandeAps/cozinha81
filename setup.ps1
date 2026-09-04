[CmdletBinding()]
param(
    [switch]$SkipInstall,
    [switch]$SkipDocker,
    [switch]$SkipMigrations,
    [switch]$SkipSeed,
    [switch]$ServeAfterSetup
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Garante que a instalação do Node 22 do sistema tenha precedência sobre o nvm antigo
$preferredNodePaths = @(
    'C:\Program Files\nodejs',
    'F:\nvm4w\nodejs'
)

$filteredPath = @()
foreach ($entry in ($env:PATH -split ';')) {
    if (-not $entry) { continue }
    if ($entry -match 'nodejs|nvm4w') {
        continue
    }
    $filteredPath += $entry
}

$env:PATH = ($filteredPath -join ';')

foreach ($nodePath in $preferredNodePaths) {
    if (Test-Path $nodePath) {
        $env:PATH = $nodePath + ';' + $env:PATH
        break
    }
}

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

$DbUser = 'admin'
$DbPassword = 'admin'
$DbName = 'cozinha81'
$RuntimeUser = 'cozinha_app'
$RuntimePassword = 'app_pwd'
$StaffEmail = 'ops@cozinha81'
$StaffPassword = 'SenhaForte!23'

function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Assert-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Comando '$Name' não foi encontrado no PATH. Instale-o e tente novamente."
    }
}

function Test-DockerReady {
    try {
        & docker info | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Invoke-CheckedCommand {
    param(
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$WorkingDirectory = $ProjectRoot
    )

    $commandLine = "$FilePath $($Arguments -join ' ')"
    Write-Host "Executando: $commandLine" -ForegroundColor DarkGray
    $result = & $FilePath @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Comando falhou (exit $LASTEXITCODE): $commandLine`n$result"
    }
    return $result
}

Write-Step 'Validando requisitos do ambiente'
Assert-Command 'node'
Assert-Command 'npm'
Assert-Command 'docker'

$nodeVersion = (node -p "process.versions.node") 2>$null
if (-not $nodeVersion) {
    throw 'Não foi possível obter a versão do Node.js. Verifique a instalação.'
}

$major = [int]((node -p "process.versions.node").Split('.')[0])
if ($major -ne 22) {
    throw "Node.js detectado: $nodeVersion. Este workspace exige Node 22.x (Nx 22). Instale a versão 22 e reinicie o terminal antes de continuar."
}

if (-not (Test-DockerReady)) {
    throw "Docker não está disponível ou o daemon não está em execução. Inicie o Docker Desktop ou o serviço do Docker e tente novamente."
}

Write-Step 'Instalando dependências do projeto'
if (-not $SkipInstall) {
    if (Test-Path (Join-Path $ProjectRoot 'package-lock.json')) {
        Write-Warning 'package-lock.json encontrado. Usando npm ci com compatibilidade legacy para evitar conflitos de peer dependency.'
        Invoke-CheckedCommand -FilePath 'npm' -Arguments @('ci', '--legacy-peer-deps')
    }
    else {
        Write-Warning 'package-lock.json não encontrado. Gerando install com compatibilidade para dependências peer-conflicting.'
        Invoke-CheckedCommand -FilePath 'npm' -Arguments @('install', '--legacy-peer-deps')
    }
}

Write-Step 'Subindo o PostgreSQL via Docker Compose'
if (-not $SkipDocker) {
    Invoke-CheckedCommand -FilePath 'docker' -Arguments @('compose', 'up', '-d')

    $maxAttempts = 30
    $attempt = 0
    do {
        Start-Sleep -Seconds 2
        $attempt++
        $ready = (& docker compose exec -T db pg_isready -U $DbUser -d $DbName 2>$null)
    } while ($LASTEXITCODE -ne 0 -and $attempt -lt $maxAttempts)

    if ($LASTEXITCODE -ne 0) {
        throw 'O PostgreSQL do Docker não ficou pronto em tempo hábil. Verifique os logs com: docker compose logs db'
    }
}

Write-Step 'Configurando papel de runtime do backend (cozinha_app)'
$sql = @"
CREATE ROLE $RuntimeUser LOGIN PASSWORD '$RuntimePassword' NOSUPERUSER NOBYPASSRLS;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $RuntimeUser;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO $RuntimeUser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $RuntimeUser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO $RuntimeUser;
"@

& docker compose exec -T db psql -U $DbUser -d $DbName -v ON_ERROR_STOP=1 -c "$sql" 2>&1 | Out-String | Write-Host
if ($LASTEXITCODE -ne 0) {
    throw 'Falha ao criar o papel de runtime cozinha_app no PostgreSQL.'
}

if (-not $SkipMigrations) {
    Write-Step 'Executando migrations do backend'
    $env:DATABASE_URL = "postgres://${DbUser}:${DbPassword}@localhost:5432/${DbName}"
    Invoke-CheckedCommand -FilePath 'npx' -Arguments @('nx', 'run', 'backend:migrate')
}

if (-not $SkipSeed) {
    Write-Step 'Bootstrapping do primeiro staff da plataforma'
    $env:DATABASE_URL = "postgres://${DbUser}:${DbPassword}@localhost:5432/${DbName}"
    $env:STAFF_BOOTSTRAP_EMAIL = $StaffEmail
    $env:STAFF_BOOTSTRAP_SENHA = $StaffPassword
    Invoke-CheckedCommand -FilePath 'npx' -Arguments @('nx', 'run', 'backend:seed-staff')
}

Write-Step 'Resumo da configuração'
Write-Host 'Banco PostgreSQL 18 em execução via Docker em localhost:5432' -ForegroundColor Green
Write-Host "Usuário admin: $DbUser / $DbPassword" -ForegroundColor Green
Write-Host "Usuário runtime: $RuntimeUser / $RuntimePassword" -ForegroundColor Green
Write-Host "Primeiro staff: $StaffEmail / $StaffPassword" -ForegroundColor Green
Write-Host ''
Write-Host 'Próximos passos:' -ForegroundColor Yellow
Write-Host '  1) Backend: PGHOST=localhost PGPORT=5432 PGUSER=cozinha_app PGPASSWORD=app_pwd PGDATABASE=cozinha81 npx nx serve backend' -ForegroundColor Gray
Write-Host '  2) Portal: npx nx serve portal' -ForegroundColor Gray
Write-Host '  3) Verificação: curl http://localhost:3000/health e curl http://localhost:3000/api/docs' -ForegroundColor Gray
Write-Host ''
Write-Host 'Observações importantes:' -ForegroundColor Yellow
Write-Host '- Não use DATABASE_URL no comando do backend em modo serve; o README exige os PG* para manter o papel cozinha_app.' -ForegroundColor Gray
Write-Host '- O Backoffice usa a conta staff do seed: ops@cozinha81 / SenhaForte!23' -ForegroundColor Gray
Write-Host '- Se quiser subir os serviços imediatamente, execute: .\setup.ps1 -ServeAfterSetup' -ForegroundColor Gray

if ($ServeAfterSetup) {
    Write-Step 'Iniciando backend e portal em segundo plano'
    $backendJob = Start-Job -Name 'cozinha81-backend' -ArgumentList $ProjectRoot -ScriptBlock {
        param($root)
        Set-Location $root
        $env:PGHOST = 'localhost'
        $env:PGPORT = '5432'
        $env:PGUSER = 'cozinha_app'
        $env:PGPASSWORD = 'app_pwd'
        $env:PGDATABASE = 'cozinha81'
        npx nx serve backend
    }

    $portalJob = Start-Job -Name 'cozinha81-portal' -ArgumentList $ProjectRoot -ScriptBlock {
        param($root)
        Set-Location $root
        npx nx serve portal
    }

    Write-Host "Backend em background: $($backendJob.Id)" -ForegroundColor Green
    Write-Host "Portal em background: $($portalJob.Id)" -ForegroundColor Green
}

Write-Host "`nSetup concluído com sucesso." -ForegroundColor Green
