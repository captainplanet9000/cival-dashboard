# TanStack Query Migration Helper
# This PowerShell script helps identify components that need migration to TanStack Query
# and tracks progress during the migration process.

param (
    [string]$Command = "scan",
    [string]$Path = "..\src",
    [string]$Component = "",
    [string]$Status = ""
)

# Constants
$CHECKLIST_PATH = "..\docs\query-migration-checklist.md"
$LEGACY_PATTERNS = @(
    'useState\(.*\).*useState\(.*isLoading',
    'const \[.*isLoading.*\] = useState',
    'const \[.*error.*\] = useState',
    'setIsLoading\(true\)',
    'setError\(',
    'useEffect\(.*\{.*fetch\(',
    'useEffect\(.*\{.*axios\.',
    'fetch\('
)
$QUERY_PATTERNS = @(
    'useQuery\(',
    'useMutation\(',
    'useQueryClient',
    'useInfiniteQuery'
)

# Helper Functions
function Scan-Components {
    param (
        [string]$ScanPath
    )

    Write-Host "🔍 Scanning for components that need migration..." -ForegroundColor Cyan
    
    $componentFiles = Get-ChildItem -Path $ScanPath -Recurse -Include "*.tsx", "*.ts" | 
                      Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*tests*" }
    
    $results = @()
    
    foreach ($file in $componentFiles) {
        $content = Get-Content -Path $file.FullName -Raw
        
        # Check if the file contains React component
        if ($content -match "function [A-Z][a-zA-Z0-9]*\(" -or $content -match "export default function") {
            $componentName = if ($content -match "function ([A-Z][a-zA-Z0-9]*)\(") {
                $matches[1]
            } elseif ($content -match "export default function ([A-Z][a-zA-Z0-9]*)\(") {
                $matches[1]
            } else {
                $file.BaseName
            }
            
            # Check for legacy patterns
            $legacyCount = 0
            foreach ($pattern in $LEGACY_PATTERNS) {
                if ($content -match $pattern) {
                    $legacyCount++
                }
            }
            
            # Check for query patterns
            $queryCount = 0
            foreach ($pattern in $QUERY_PATTERNS) {
                if ($content -match $pattern) {
                    $queryCount++
                }
            }
            
            # Determine status
            $status = "Unknown"
            if ($legacyCount -eq 0 -and $queryCount -gt 0) {
                $status = "✅ Migrated"
            } elseif ($legacyCount -gt 0 -and $queryCount -gt 0) {
                $status = "🔄 In Progress"
            } elseif ($legacyCount -gt 0 -and $queryCount -eq 0) {
                $status = "🔲 Pending"
            } elseif ($legacyCount -eq 0 -and $queryCount -eq 0) {
                # No data fetching detected
                $status = "➖ No fetching"
            }
            
            $results += [PSCustomObject]@{
                Component = $componentName
                Path = $file.FullName
                LegacyPatterns = $legacyCount
                QueryPatterns = $queryCount
                Status = $status
            }
        }
    }
    
    return $results
}

function Update-Checklist {
    param (
        [string]$Component,
        [string]$NewStatus
    )
    
    if (-not (Test-Path $CHECKLIST_PATH)) {
        Write-Host "Error: Checklist file not found at $CHECKLIST_PATH" -ForegroundColor Red
        return
    }
    
    $content = Get-Content -Path $CHECKLIST_PATH -Raw
    
    # Find the component in the checklist table
    $pattern = "(\| $Component \| )(🔲 Pending|🔄 In Progress|✅ Migrated|➖ No fetching)( \| .*? \| .*? \|)"
    
    if ($content -match $pattern) {
        $updatedContent = $content -replace $pattern, "`$1$NewStatus`$3"
        Set-Content -Path $CHECKLIST_PATH -Value $updatedContent
        Write-Host "✅ Updated $Component status to $NewStatus in checklist" -ForegroundColor Green
    } else {
        Write-Host "❌ Component '$Component' not found in checklist" -ForegroundColor Red
    }
}

function Show-MigrationPlan {
    param (
        [object[]]$Components
    )
    
    $pendingComponents = $Components | Where-Object { $_.Status -eq "🔲 Pending" }
    $inProgressComponents = $Components | Where-Object { $_.Status -eq "🔄 In Progress" }
    $migratedComponents = $Components | Where-Object { $_.Status -eq "✅ Migrated" }
    $noFetchingComponents = $Components | Where-Object { $_.Status -eq "➖ No fetching" }
    
    # Sort by complexity (number of legacy patterns)
    $simpleComponents = $pendingComponents | Where-Object { $_.LegacyPatterns -le 2 } | Sort-Object LegacyPatterns
    $mediumComponents = $pendingComponents | Where-Object { $_.LegacyPatterns -gt 2 -and $_.LegacyPatterns -le 5 } | Sort-Object LegacyPatterns
    $complexComponents = $pendingComponents | Where-Object { $_.LegacyPatterns -gt 5 } | Sort-Object LegacyPatterns -Descending
    
    Write-Host "`n📊 TanStack Query Migration Status" -ForegroundColor Cyan
    Write-Host "──────────────────────────────────────────────"
    Write-Host "Total Components: $($Components.Count)" -ForegroundColor White
    Write-Host "  ✅ Migrated: $($migratedComponents.Count)" -ForegroundColor Green
    Write-Host "  🔄 In Progress: $($inProgressComponents.Count)" -ForegroundColor Yellow
    Write-Host "  🔲 Pending: $($pendingComponents.Count)" -ForegroundColor Red
    Write-Host "  ➖ No fetching detected: $($noFetchingComponents.Count)" -ForegroundColor Gray
    
    Write-Host "`n📋 Suggested Migration Plan" -ForegroundColor Cyan
    Write-Host "──────────────────────────────────────────────"
    
    Write-Host "`nStart with these simple components:" -ForegroundColor Green
    if ($simpleComponents.Count -eq 0) {
        Write-Host "  No simple components found" -ForegroundColor Gray
    } else {
        $simpleComponents | ForEach-Object {
            Write-Host "  • $($_.Component) ($($_.LegacyPatterns) legacy patterns)" -ForegroundColor White
        }
    }
    
    Write-Host "`nThen tackle these medium-complexity components:" -ForegroundColor Yellow
    if ($mediumComponents.Count -eq 0) {
        Write-Host "  No medium components found" -ForegroundColor Gray
    } else {
        $mediumComponents | ForEach-Object {
            Write-Host "  • $($_.Component) ($($_.LegacyPatterns) legacy patterns)" -ForegroundColor White
        }
    }
    
    Write-Host "`nFinally, address these complex components:" -ForegroundColor Red
    if ($complexComponents.Count -eq 0) {
        Write-Host "  No complex components found" -ForegroundColor Gray
    } else {
        $complexComponents | ForEach-Object {
            Write-Host "  • $($_.Component) ($($_.LegacyPatterns) legacy patterns)" -ForegroundColor White
        }
    }
    
    Write-Host "`n💡 To update component status:" -ForegroundColor Cyan
    Write-Host "  .\tanstack-migration-helper.ps1 -Command update -Component ""ComponentName"" -Status ""🔄 In Progress""" -ForegroundColor White
}

function Show-ComponentDetails {
    param (
        [string]$ComponentPath
    )
    
    if (-not (Test-Path $ComponentPath)) {
        Write-Host "Error: Component file not found at $ComponentPath" -ForegroundColor Red
        return
    }
    
    $content = Get-Content -Path $ComponentPath -Raw
    $legacyMatches = @()
    
    Write-Host "`n🔍 Analyzing component: $ComponentPath" -ForegroundColor Cyan
    Write-Host "──────────────────────────────────────────────"
    
    # Find all legacy patterns
    foreach ($pattern in $LEGACY_PATTERNS) {
        if ($content -match $pattern) {
            $matches = [regex]::Matches($content, $pattern)
            foreach ($match in $matches) {
                $lineNumber = ($content.Substring(0, $match.Index).Split("`n")).Length
                $line = ($content.Split("`n"))[$lineNumber - 1].Trim()
                $legacyMatches += [PSCustomObject]@{
                    Pattern = $pattern
                    Line = $lineNumber
                    Code = $line
                }
            }
        }
    }
    
    if ($legacyMatches.Count -eq 0) {
        Write-Host "No legacy patterns found in this component." -ForegroundColor Green
        return
    }
    
    # Group by pattern type
    $stateMatches = $legacyMatches | Where-Object { $_.Pattern -like "*useState*" }
    $effectMatches = $legacyMatches | Where-Object { $_.Pattern -like "*useEffect*" }
    $fetchMatches = $legacyMatches | Where-Object { $_.Pattern -like "*fetch*" -or $_.Pattern -like "*axios*" }
    $loadingMatches = $legacyMatches | Where-Object { $_.Pattern -like "*setIsLoading*" }
    $errorMatches = $legacyMatches | Where-Object { $_.Pattern -like "*setError*" }
    
    # Display findings
    Write-Host "Found $($legacyMatches.Count) legacy patterns to migrate:" -ForegroundColor Yellow
    
    if ($stateMatches.Count -gt 0) {
        Write-Host "`n🔸 State Management ($($stateMatches.Count)):" -ForegroundColor Yellow
        foreach ($match in $stateMatches) {
            Write-Host "  Line $($match.Line): $($match.Code)" -ForegroundColor White
        }
        
        Write-Host "  ✏️ Refactor:" -ForegroundColor Green
        Write-Host "    Replace with useQuery hook" -ForegroundColor White
    }
    
    if ($effectMatches.Count -gt 0) {
        Write-Host "`n🔸 Effects with API calls ($($effectMatches.Count)):" -ForegroundColor Yellow
        foreach ($match in $effectMatches) {
            Write-Host "  Line $($match.Line): $($match.Code)" -ForegroundColor White
        }
        
        Write-Host "  ✏️ Refactor:" -ForegroundColor Green
        Write-Host "    Replace useEffect data fetching with useQuery" -ForegroundColor White
    }
    
    if ($fetchMatches.Count -gt 0) {
        Write-Host "`n🔸 Direct API Calls ($($fetchMatches.Count)):" -ForegroundColor Yellow
        foreach ($match in $fetchMatches) {
            Write-Host "  Line $($match.Line): $($match.Code)" -ForegroundColor White
        }
        
        Write-Host "  ✏️ Refactor:" -ForegroundColor Green
        Write-Host "    Move API calls to queryFn or mutationFn" -ForegroundColor White
    }
    
    if ($loadingMatches.Count -gt 0 -or $errorMatches.Count -gt 0) {
        Write-Host "`n🔸 Manual Loading/Error Management ($($loadingMatches.Count + $errorMatches.Count)):" -ForegroundColor Yellow
        foreach ($match in ($loadingMatches + $errorMatches)) {
            Write-Host "  Line $($match.Line): $($match.Code)" -ForegroundColor White
        }
        
        Write-Host "  ✏️ Refactor:" -ForegroundColor Green
        Write-Host "    Replace with useQuery isLoading, error states" -ForegroundColor White
    }
    
    Write-Host "`n💡 Migration Approach:" -ForegroundColor Cyan
    Write-Host "1. Identify all API endpoints used in this component" -ForegroundColor White
    Write-Host "2. Create or use existing query hooks for each endpoint" -ForegroundColor White
    Write-Host "3. Replace useState/useEffect patterns with useQuery" -ForegroundColor White
    Write-Host "4. Update component to use query results (data, isLoading, error)" -ForegroundColor White
    Write-Host "5. Replace direct API calls with mutation hooks" -ForegroundColor White
    Write-Host "6. Clean up unused imports and variables" -ForegroundColor White
    
    Write-Host "`n📝 After migration, update the checklist:" -ForegroundColor Cyan
    Write-Host "  .\tanstack-migration-helper.ps1 -Command update -Component ""ComponentName"" -Status ""✅ Migrated""" -ForegroundColor White
}

# Main Script Logic
switch ($Command) {
    "scan" {
        $scanResults = Scan-Components -ScanPath $Path
        $scanResults | Format-Table -Property Component, Status, LegacyPatterns, QueryPatterns -AutoSize
        Show-MigrationPlan -Components $scanResults
    }
    "analyze" {
        if (-not $Component) {
            Write-Host "Error: Component path is required for analysis" -ForegroundColor Red
            break
        }
        Show-ComponentDetails -ComponentPath $Component
    }
    "update" {
        if (-not $Component -or -not $Status) {
            Write-Host "Error: Component name and status are required for updates" -ForegroundColor Red
            break
        }
        Update-Checklist -Component $Component -NewStatus $Status
    }
    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Write-Host "Available commands: scan, analyze, update" -ForegroundColor Yellow
    }
}
