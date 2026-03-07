$env:Path += ";C:\Progra~1\nodejs"
Start-Process "C:\Users\recy\wan-hardware-inventory\php\php.exe" -ArgumentList "-S localhost:8000 -t public" -WorkingDirectory "C:\Users\recy\wan-hardware-inventory\backend" -NoNewWindow
Start-Process "npm.cmd" -ArgumentList "run dev" -WorkingDirectory "C:\Users\recy\wan-hardware-inventory" -NoNewWindow
