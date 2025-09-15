@echo off
setlocal

rem Caminho raiz do projeto
set "ROOT=%~dp0"

rem Garante LibreOffice (soffice) no PATH apenas nesta sessao
where soffice >nul 2>nul
if errorlevel 1 (
  set "LO_DIR=C:\Program Files\LibreOffice\program"
  if exist "%LO_DIR%\soffice.exe" (
    set "PATH=%LO_DIR%;%PATH%"
    echo [INFO] LibreOffice adicionado ao PATH desta sessao: "%LO_DIR%"
  ) else (
    set "LO_DIR=C:\Program Files (x86)\LibreOffice\program"
    if exist "%LO_DIR%\soffice.exe" (
      set "PATH=%LO_DIR%;%PATH%"
      echo [INFO] LibreOffice adicionado ao PATH desta sessao: "%LO_DIR%"
    ) else (
      echo [AVISO] soffice.exe nao encontrado no PATH nem nas pastas padrao.
      echo         Conversoes para PDF podem falhar. Ajuste LO_DIR neste .bat se necessario.
    )
  )
) else (
  echo [INFO] LibreOffice encontrado no PATH do sistema.
)

rem Detecta npm.cmd no PATH
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERRO] npm nao encontrado no PATH. Instale o Node.js e reabra o terminal.
  pause
  exit /b 1
)

rem Inicia o backend em uma nova janela
start "API (dev)" cmd /k "cd /d "%ROOT%" && npm run dev:server"

rem Aguarda um pouco para o backend subir
ping -n 2 127.0.0.1 >nul

rem Inicia o frontend (Vite) em outra nova janela
start "Frontend (Vite)" cmd /k "cd /d "%ROOT%" && npm run dev"

endlocal
