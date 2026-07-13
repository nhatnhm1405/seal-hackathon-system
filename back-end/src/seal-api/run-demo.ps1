<#
.SYNOPSIS
    Run the SEAL app in code-first mode and seed one demo scenario (S0..S4).

.DESCRIPTION
    Bundles the manual steps into a single command:
      1. Read DB_USERNAME / DB_PASSWORD from .env (per-machine password -> not hardcoded)
      2. DROP DATABASE seal_hackathon  (so DemoSeeder reseeds from scratch)
      3. set SEED_SCENARIO = chosen scenario
      4. ./mvnw.cmd spring-boot:run     (Hibernate recreates schema + seeds)

    Why drop first: DemoSeeder is guarded by the demo accounts -> if the DB still has
    old data it SKIPS seeding. A clean drop means a clean reseed.

.PARAMETER Scenario
    NONE | S0 | S1 | S2 | S3 | S4  (default NONE = real run, no fake data)
      NONE  bootstrap admin only
      S0    + all demo accounts (pre-approved)
      S1    + OPEN event + track/round/criteria + forming teams
      S2    + teams in tracks + submissions ready to score     (IN_PROGRESS)
      S3    + scores + rankings + ANNOUNCED prizes             (COMPLETED)
      S4    = S3 but prizes are DRAFT — demo announcing them   (COMPLETED)
      (S2+ also include one disqualified team for the disqualify demo)

.PARAMETER Force
    Drop the DB without a confirmation prompt (handy during a live demo).

.PARAMETER NoDrop
    Skip the drop step (keep the current DB; seeding is skipped if data already exists).

.EXAMPLE
    ./run-demo.ps1 S3            # full demo: scores, rankings, announced prizes
.EXAMPLE
    ./run-demo.ps1 S4            # same, but prizes still draft — demo awarding them live
.EXAMPLE
    ./run-demo.ps1 S2 -Force     # judge-scoring demo, no confirm before drop
.EXAMPLE
    ./run-demo.ps1               # NONE - clean run
#>
[CmdletBinding()]
param(
    [ValidateSet('NONE', 'S0', 'S1', 'S2', 'S3', 'S4')]
    [string]$Scenario = 'NONE',
    [switch]$Force,
    [switch]$NoDrop
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DbName = 'seal_hackathon'

function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "   OK  $msg" -ForegroundColor Green }
function Write-Warn2($msg){ Write-Host "   !   $msg" -ForegroundColor Yellow }

# ─── 1. Doc DB creds tu .env ──────────────────────────────────────────────────
$envFile = Join-Path $ScriptDir '.env'
$dbUser = 'root'; $dbPass = ''
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*DB_USERNAME\s*=\s*(.*)$') { $dbUser = $Matches[1].Trim().Trim('"') }
        if ($_ -match '^\s*DB_PASSWORD\s*=\s*(.*)$') { $dbPass = $Matches[1].Trim().Trim('"') }
    }
    Write-Ok ".env loaded (DB_USERNAME='$dbUser')"
} else {
    Write-Warn2 ".env not found -> falling back to user='root', no password"
}

# ─── 2. Dinh vi mysql.exe (PATH -> Program Files) ────────────────────────────
function Find-Mysql {
    $cmd = Get-Command mysql -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $candidates = Get-ChildItem 'C:\Program Files\MySQL' -Recurse -Filter 'mysql.exe' -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match 'Server' } |
        Sort-Object FullName -Descending
    if ($candidates) { return $candidates[0].FullName }
    return $null
}

# ─── 3. Drop DB ──────────────────────────────────────────────────────────────
if (-not $NoDrop) {
    $mysql = Find-Mysql
    if (-not $mysql) {
        Write-Warn2 "mysql.exe not found -> cannot drop the DB automatically."
        Write-Warn2 "Drop it manually:  DROP DATABASE $DbName;  then re-run with -NoDrop"
        throw "mysql.exe not found"
    }
    Write-Ok "mysql: $mysql"

    if (-not $Force) {
        $ans = Read-Host "About to DROP DATABASE '$DbName' (all current data is lost). Type 'y' to continue"
        if ($ans -ne 'y') { Write-Warn2 "Cancelled."; return }
    }

    Write-Step "Dropping database '$DbName'..."
    $args = @("-u$dbUser")
    if ($dbPass) { $args += "-p$dbPass" }
    $args += @('-e', "DROP DATABASE IF EXISTS ``$DbName``;")
    & $mysql @args
    if ($LASTEXITCODE -ne 0) { throw "Drop failed (check DB_USERNAME/DB_PASSWORD in .env)" }
    Write-Ok "Dropped '$DbName' (the app will recreate it)"
} else {
    Write-Warn2 "-NoDrop: skipping drop. If the DB already has demo data, seeding will be SKIPPED."
}

# ─── 4. Set kich ban + chay app ──────────────────────────────────────────────
$env:SEED_SCENARIO = $Scenario
Write-Step "Starting app  |  SEED_SCENARIO=$Scenario"
Write-Ok "Demo accounts: coordinator@fpt.edu.vn / judge1@ / p1@ ...  (password: Test@1234)"
Write-Ok "Bootstrap admin: admin@fpt.edu.vn / Test@1234"

Set-Location $ScriptDir
& "$ScriptDir\mvnw.cmd" spring-boot:run
