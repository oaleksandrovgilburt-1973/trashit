$lines = Get-Content -Encoding UTF8 'server\routers.ts'
$balance = 0
for ($i = 2388; $i -le 2555; $i++) {
    $line = $lines[$i]
    $opens = ($line.ToCharArray() | Where-Object { $_ -eq '{' }).Count
    $closes = ($line.ToCharArray() | Where-Object { $_ -eq '}' }).Count
    $balance += $opens - $closes
    $lineNum = $i + 1
    Write-Output "$lineNum : balance=$balance : $line"
}
