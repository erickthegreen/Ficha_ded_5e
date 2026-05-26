@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>nul
if %errorlevel%==0 (
  start "" http://127.0.0.1:8000/
  py -3 -m http.server 8000 --bind 127.0.0.1
  goto :eof
)

where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://127.0.0.1:8000/
  python -m http.server 8000 --bind 127.0.0.1
  goto :eof
)

echo Python nao foi encontrado neste computador.
echo Instale Python 3 ou publique a ficha online, por exemplo no GitHub Pages.
pause
