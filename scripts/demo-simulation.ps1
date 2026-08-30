<#
.SYNOPSIS
    Safe Yatra — Automated 1-Click SIH 2026 Demo Simulation Orchestrator (PowerShell).
.DESCRIPTION
    Automates the multi-pillar demo workflow against the local Backend Spatial Gateway (http://localhost:3001).
.PARAMETER Scenario
    The simulation scenario to run: FullDemo, GeofenceWalk, SOSLoop, or WeatherOverride.
#>

param (
    [ValidateSet('FullDemo', 'GeofenceWalk', 'SOSLoop', 'WeatherOverride')]
    [string]$Scenario = 'FullDemo',
    [string]$BaseUrl = 'http://localhost:3001/api/v1'
)

$ErrorActionPreference = 'Stop'

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  🛡️  SAFE YATRA — SIH 2026 DEMO SIMULATION ORCHESTRATOR        " -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Scenario Selected: $Scenario" -ForegroundColor Green
Write-Host "Target Gateway:    $BaseUrl" -ForegroundColor Gray
Write-Host ""

function Invoke-ApiPost {
    param (
        [string]$Endpoint,
        [hashtable]$Body
    )
    $json = $Body | ConvertTo-Json -Depth 5
    $uri = "$BaseUrl$Endpoint"
    try {
        $response = Invoke-RestMethod -Uri $uri -Method Post -Body $json -ContentType 'application/json'
        return $response
    }
    catch {
        Write-Warning "API call to $uri failed: $($_.Exception.Message)"
        return $null
    }
}

function Run-WeatherOverride {
    Write-Host "`n[1/4] Overriding Environmental Weather Inputs..." -ForegroundColor Yellow
    $weatherBody = @{
        zoneId = "zone-lonavala-bhushi-dam-01"
        rainfallMm = 180.0
        windSpeedKmh = 55.0
        visibilityMeters = 150
        temperatureC = 21.0
        forcedDangerScore = 85
    }
    $res = Invoke-ApiPost -Endpoint "/sim/weather-override" -Body $weatherBody
    if ($res -and $res.success) {
        Write-Host "  ✓ Weather override applied: Score set to $($res.data.forcedDangerScore) (CRITICAL)" -ForegroundColor Green
    }
}

function Run-GeofenceWalk {
    Write-Host "`n[2/4] Replaying Tourist Trajectory into Geofenced Hazard..." -ForegroundColor Yellow
    $trajBody = @{
        userId = "11111111-1111-1111-1111-111111111111"
        coordinates = @(
            @{ lat = 18.7300; lng = 73.4100; altitude = 600; accuracy = 5; battery = 95 }, # Safe
            @{ lat = 18.7330; lng = 73.4150; altitude = 615; accuracy = 4; battery = 94 }, # Approaching 500m
            @{ lat = 18.7350; lng = 73.4180; altitude = 620; accuracy = 4; battery = 93 }  # Inside CRITICAL
        )
        intervalSeconds = 5
    }
    $res = Invoke-ApiPost -Endpoint "/sim/trajectory" -Body $trajBody
    if ($res -and $res.success) {
        Write-Host "  ✓ Trajectory replayed: $($res.data.totalWaypoints) waypoints, $($res.data.violationsDetected) hazard violations detected." -ForegroundColor Green
    }
}

function Run-SOSLoop {
    Write-Host "`n[3/4] Triggering Automated Emergency Dispatch & Rescue Loop..." -ForegroundColor Yellow
    $sosBody = @{
        userId = "11111111-1111-1111-1111-111111111111"
        lat = 18.7352
        lng = 73.4182
        battery = 88
        scenario = "full_loop"
    }
    $res = Invoke-ApiPost -Endpoint "/sim/sos" -Body $sosBody
    if ($res -and $res.success) {
        Write-Host "  ✓ SOS loop simulated: Event ID '$($res.data.sosEvent.id)', Final Status '$($res.data.finalStatus)'" -ForegroundColor Green
    }
}

switch ($Scenario) {
    'WeatherOverride' {
        Run-WeatherOverride
    }
    'GeofenceWalk' {
        Run-GeofenceWalk
    }
    'SOSLoop' {
        Run-SOSLoop
    }
    'FullDemo' {
        Run-WeatherOverride
        Start-Sleep -Seconds 1
        Run-GeofenceWalk
        Start-Sleep -Seconds 1
        Run-SOSLoop
    }
}

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host "  🎉 SIMULATION WORKFLOW COMPLETED SUCCESSFULLY!                " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
