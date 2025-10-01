# Simple PowerShell test for System Catalog API

Write-Host "🧪 Testing System Catalog API" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# Test 1: Get API info
Write-Host "`n📊 Test 1: API Information" -ForegroundColor Yellow
Write-Host "---------------------------" -ForegroundColor Yellow

try {
    $infoResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/database/system-catalog" -Method GET
    $infoData = $infoResponse.Content | ConvertFrom-Json
    
    Write-Host "✅ API Info:" -ForegroundColor Green
    Write-Host "   Success: $($infoData.success)"
    Write-Host "   Message: $($infoData.message)"
    Write-Host "   Supported Types: $($infoData.supportedTypes -join ', ')"
} catch {
    Write-Host "❌ Failed to get API info: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: SQLite extraction
Write-Host "`n📊 Test 2: SQLite System Catalog Extraction" -ForegroundColor Yellow
Write-Host "---------------------------------------------" -ForegroundColor Yellow

try {
    $body = @{
        databaseType = "sqlite"
        connectionInfo = @{
            filePath = "./test.db"
        }
    } | ConvertTo-Json -Depth 3
    
    $sqliteResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/database/system-catalog" -Method POST -Body $body -ContentType "application/json"
    $sqliteData = $sqliteResponse.Content | ConvertFrom-Json
    
    if ($sqliteData.success) {
        Write-Host "✅ SQLite extraction successful!" -ForegroundColor Green
        Write-Host "📊 Summary:" -ForegroundColor Cyan
        Write-Host "   Tables: $($sqliteData.metadata.summary.tables)"
        Write-Host "   Views: $($sqliteData.metadata.summary.views)"
        Write-Host "   Indexes: $($sqliteData.metadata.summary.indexes)"
        Write-Host "   Triggers: $($sqliteData.metadata.summary.triggers)"
        
        Write-Host "`n📋 Database Info:" -ForegroundColor Cyan
        Write-Host "   Type: $($sqliteData.data.metadata.databaseType)"
        Write-Host "   Version: $($sqliteData.data.metadata.version)"
        Write-Host "   Encoding: $($sqliteData.data.metadata.encoding)"
        
        Write-Host "`nTables found:" -ForegroundColor Cyan
        for ($i = 0; $i -lt $sqliteData.data.tables.Count; $i++) {
            $table = $sqliteData.data.tables[$i]
            $columnCount = $table.columns.Count
            Write-Host "   $($i + 1). $($table.name) ($columnCount columns)" -ForegroundColor White
            if ($table.statistics.rowCount) {
                Write-Host "      - Row count: $($table.statistics.rowCount)" -ForegroundColor Gray
            }
        }
        
        if ($sqliteData.data.views.Count -gt 0) {
            Write-Host "`nViews found:" -ForegroundColor Cyan
            for ($i = 0; $i -lt $sqliteData.data.views.Count; $i++) {
                $view = $sqliteData.data.views[$i]
                Write-Host "   $($i + 1). $($view.name)" -ForegroundColor White
            }
        }
        
        if ($sqliteData.data.indexes.Count -gt 0) {
            Write-Host "`nIndexes found:" -ForegroundColor Cyan
            for ($i = 0; $i -lt $sqliteData.data.indexes.Count; $i++) {
                $index = $sqliteData.data.indexes[$i]
                $uniqueText = if ($index.unique) { "UNIQUE" } else { "NON-UNIQUE" }
                Write-Host "   $($i + 1). $($index.name) on $($index.tableName) ($uniqueText)" -ForegroundColor White
            }
        }
        
    } else {
        Write-Host "❌ SQLite extraction failed: $($sqliteData.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed to test SQLite extraction: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 System Catalog API Tests Completed!" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
