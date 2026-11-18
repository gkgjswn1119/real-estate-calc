$Host.UI.RawUI.WindowTitle = "부동산 수익률 계산기"
$port = 8000

$ip = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike '169.254.*' -and $_.IPAddress -ne '127.0.0.1' } |
    Sort-Object -Property PrefixLength -Descending |
    Select-Object -First 1).IPAddress

if (-not $ip) { $ip = "IP를 찾지 못했습니다" }

Clear-Host
Write-Host ""
Write-Host " ============================================" -ForegroundColor Cyan
Write-Host "   부동산 수익률 계산기  -  서버 시작" -ForegroundColor White
Write-Host " ============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   PC  접속 : " -NoNewline; Write-Host "http://localhost:$port" -ForegroundColor Green
Write-Host "   폰  접속 : " -NoNewline; Write-Host "http://${ip}:$port" -ForegroundColor Yellow
Write-Host ""
Write-Host "   ※ 폰이 이 PC와 같은 WiFi에 연결돼 있어야 합니다." -ForegroundColor DarkGray
Write-Host ""
Write-Host "   [홈 화면에 추가하는 방법]" -ForegroundColor DarkGray
Write-Host "   iOS     : Safari로 접속 → 공유(□↑) → 홈 화면에 추가" -ForegroundColor DarkGray
Write-Host "   Android : Chrome으로 접속 → 메뉴(⋮) → 홈 화면에 추가" -ForegroundColor DarkGray
Write-Host ""
Write-Host "   종료하려면 Ctrl+C" -ForegroundColor DarkGray
Write-Host " --------------------------------------------"
Write-Host ""

Set-Location $PSScriptRoot
python -m http.server $port
