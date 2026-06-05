$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "app\backend"
$frontend = Join-Path $root "app\frontend"
$backendVenv = Join-Path $backend ".venv"
$backendPython = Join-Path $backendVenv "Scripts\python.exe"

if (-not (Test-Path $backendPython)) {
    Write-Host "Ambiente virtual do backend nao encontrado. Criando em app\backend\.venv..."
    py -3 -m venv $backendVenv
    if ($LASTEXITCODE -ne 0) { throw "Falha ao criar o ambiente virtual do backend." }
}

& $backendPython -c "import uvicorn, fastapi, sqlalchemy, asyncpg, dotenv" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Instalando/atualizando dependencias do backend..."
    & $backendPython -m pip install -r (Join-Path $backend "requirements.txt")
    if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar as dependencias do backend." }
}

if (-not (Test-Path (Join-Path $frontend "node_modules"))) {
    Write-Host "Dependencias do frontend nao encontradas. Instalando com npm..."
    Push-Location $frontend
    npm install
    if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar as dependencias do frontend." }
    Pop-Location
}

Write-Host "Iniciando backend em http://localhost:8000"
Start-Process powershell -WorkingDirectory $backend -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command",
    "& '.\.venv\Scripts\python.exe' -m uvicorn server:app --reload --host 0.0.0.0 --port 8000"
)

Write-Host "Iniciando frontend em http://localhost:3000"
Start-Process powershell -WorkingDirectory $frontend -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command",
    "npm start"
)

Write-Host ""
Write-Host "Projeto iniciado. Abra:"
Write-Host "Frontend: http://localhost:3000"
Write-Host "API Docs:  http://localhost:8000/docs"
Write-Host ""
Write-Host "Para parar, feche as duas janelas do PowerShell abertas."
