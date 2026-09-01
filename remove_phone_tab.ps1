$lines = Get-Content -Encoding UTF8 'client\src\pages\ClientAuth.tsx'
$partA = $lines[0..528]
$partB = $lines[654..($lines.Length-1)]
$newLines = $partA + $partB
$newLines | Set-Content -Encoding UTF8 'client\src\pages\ClientAuth.tsx'
Write-Output "Done"
