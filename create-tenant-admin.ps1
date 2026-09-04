[CmdletBinding()]
param(
    [string]$StaffEmail = 'ops@cozinha81',
    [string]$StaffPassword = 'SenhaForte!23',
    [string]$TenantName = 'Cozinha Teste',
    [string]$OwnerEmail = 'dono@cozinhateste.com',
    [string]$OwnerName = 'Dona Teste',
    [string]$OwnerPassword = 'DonoForte!23'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$api = 'http://localhost:3000/api'

Write-Host '==> Fazendo login no backoffice com o staff da plataforma' -ForegroundColor Cyan
$staffBody = @{
    email = $StaffEmail
    senha = $StaffPassword
} | ConvertTo-Json

$staffResponse = Invoke-RestMethod -Method Post -Uri "$api/backoffice/auth/login" -ContentType 'application/json' -Body $staffBody
$token = $staffResponse.accessToken

Write-Host '==> Provisionando inquilino e criando convite do dono' -ForegroundColor Cyan
$tenantBody = @{
    nome = $TenantName
    dono = @{
        email = $OwnerEmail
        nome = $OwnerName
    }
    modulos = @('gestao_cozinha', 'pedidos_kds')
} | ConvertTo-Json -Depth 10

$tenantResponse = Invoke-RestMethod -Method Post -Uri "$api/backoffice/inquilinos" -ContentType 'application/json' -Headers @{ Authorization = "Bearer $token" } -Body $tenantBody

$inviteToken = $tenantResponse.conviteDono.token

Write-Host '==> Aceitando convite do dono e definindo a senha do portal' -ForegroundColor Cyan
$acceptBody = @{
    token = $inviteToken
    senha = $OwnerPassword
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "$api/portal/usuarios/convites/aceitar" -ContentType 'application/json' -Body $acceptBody | Out-Null

Write-Host ''
Write-Host 'Credenciais criadas com sucesso:' -ForegroundColor Green
Write-Host "Portal: $OwnerEmail / $OwnerPassword" -ForegroundColor Green
Write-Host "Backoffice: $StaffEmail / $StaffPassword" -ForegroundColor Green
Write-Host ''
Write-Host 'Acesse o portal em: http://localhost:4200' -ForegroundColor Yellow
