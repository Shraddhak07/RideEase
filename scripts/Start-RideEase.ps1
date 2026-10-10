$ErrorActionPreference = 'Stop'

$projectDir = 'C:\Users\DELL\RideEase'
$toolsDir = 'C:\Users\DELL\Downloads\RideEase-database-tools'
$mariaDir = 'C:\Program Files\MariaDB 13.0\bin'
$mariaExe = Join-Path $mariaDir 'mariadbd.exe'
$mariaConfig = 'C:\Program Files\MariaDB 13.0\data\my.ini'
$mysqlClient = Join-Path $mariaDir 'mysql.exe'
$phpExe = Join-Path $toolsDir 'php-runtime\php.exe'
$phpMyAdminDir = Join-Path $toolsDir 'phpMyAdmin'
$logDir = Join-Path $toolsDir 'logs'
$rideEaseUrl = 'http://127.0.0.1:3000/'
$phpMyAdminUrl = 'http://127.0.0.1:8081/'

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Test-LocalPort([int]$Port) {
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $pending = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
    if (-not $pending.AsyncWaitHandle.WaitOne(500)) {
      return $false
    }
    $client.EndConnect($pending)
    return $true
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Wait-ForUrl([string]$Url, [string]$Name, [switch]$RequireBikeApi) {
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        if ($RequireBikeApi) {
          $api = Invoke-RestMethod -Uri ($Url.TrimEnd('/') + '/api/bikes') -TimeoutSec 3
          if (-not $api.success -or $null -eq $api.bikes) {
            throw 'RideEase bikes API did not return a successful response.'
          }
        }
        Write-Host "$Name is ready at $Url"
        return
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  throw "$Name did not respond at $Url. Check its logs in $logDir."
}

if (-not (Test-LocalPort 3306)) {
  if (-not (Test-Path $mariaExe) -or -not (Test-Path $mariaConfig)) {
    throw "MariaDB is not running and its server/config were not found at '$mariaDir'."
  }
  Start-Process -FilePath $mariaExe `
    -ArgumentList @("--defaults-file=`"$mariaConfig`"", '--console') `
    -WorkingDirectory $mariaDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir 'mariadb.out.log') `
    -RedirectStandardError (Join-Path $logDir 'mariadb.err.log') | Out-Null
  for ($attempt = 0; $attempt -lt 60 -and -not (Test-LocalPort 3306); $attempt++) {
    Start-Sleep -Seconds 1
  }
}

if (-not (Test-LocalPort 3306)) {
  throw "MariaDB did not start on port 3306. Check $(Join-Path $logDir 'mariadb.err.log')."
}

$databaseReady = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
  & $mysqlClient --protocol=TCP --skip-ssl --host=127.0.0.1 --port=3306 --user=root --batch --skip-column-names --execute='SELECT 1' 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    $databaseReady = $true
    break
  }
  Start-Sleep -Seconds 1
}
if (-not $databaseReady) {
  throw 'MariaDB is listening, but RideEase cannot log in with the configured local root account.'
}
Write-Host 'MariaDB is ready on 127.0.0.1:3306.'

if (-not (Test-Path (Join-Path $projectDir 'server.js'))) {
  throw "RideEase server.js was not found in '$projectDir'."
}
if (-not (Test-LocalPort 3000)) {
  $nodeExe = $null
  $nodePackage = Get-ChildItem (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages') -Directory -Filter 'OpenJS.NodeJS.LTS*' -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($nodePackage) {
    $nodeExe = Get-ChildItem $nodePackage.FullName -Filter 'node.exe' -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
  }
  if (-not $nodeExe) {
    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($nodeCommand) { $nodeExe = $nodeCommand.Source }
  }
  if (-not $nodeExe) {
    throw 'Node.js was not found. Install Node.js, then run this launcher again.'
  }
  Start-Process -FilePath $nodeExe `
    -ArgumentList 'server.js' `
    -WorkingDirectory $projectDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir 'rideease.out.log') `
    -RedirectStandardError (Join-Path $logDir 'rideease.err.log') | Out-Null
}
Wait-ForUrl $rideEaseUrl 'RideEase' -RequireBikeApi

if (-not (Test-Path $phpExe) -or -not (Test-Path (Join-Path $phpMyAdminDir 'index.php'))) {
  throw 'PHP or phpMyAdmin was not found in the database tools folder.'
}
if (-not (Test-LocalPort 8081)) {
  Start-Process -FilePath $phpExe `
    -ArgumentList @('-S', '127.0.0.1:8081', '-t', $phpMyAdminDir) `
    -WorkingDirectory (Split-Path $phpExe) `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir 'phpmyadmin.out.log') `
    -RedirectStandardError (Join-Path $logDir 'phpmyadmin.err.log') | Out-Null
}
Wait-ForUrl $phpMyAdminUrl 'phpMyAdmin'

Start-Process $rideEaseUrl
Start-Process $phpMyAdminUrl
Write-Host ''
Write-Host 'Local services are ready. phpMyAdmin login: root, with a blank password.'
