Get-ChildItem -Recurse -Include *.ts, *.js, *.json, *.tsx, *.jsx, *.go, go.mod, go.sum -ErrorAction SilentlyContinue | 
Where-Object { $_.FullName -notmatch '[\\/](node_modules|\.next|\.git|\.turbo|\.husky|dist|build)[\\/]' } | 
ForEach-Object {
    try {
        "=== File: $($_.FullName) ==="
        [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
        "`n"
    } catch {
        # در صورت بروز خطای دسترسی روی یک فایل خاص، از آن عبور می‌کند
    }
} | Set-Content -Path "p.txt" -Encoding utf8