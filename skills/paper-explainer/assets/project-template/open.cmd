@echo off
setlocal
cd /d "%~dp0"

if not exist "site\index.html" (
  echo First launch: building the explainer...
  where npm >nul 2>nul || (
    echo Node.js and npm are required for the first build.
    pause
    exit /b 1
  )
  pushd project
  if not exist node_modules call npm install || goto :fail
  call npm run build || goto :fail
  popd
)

where node >nul 2>nul && node runtime\serve.mjs site --open && exit /b 0
where py >nul 2>nul && py -3 runtime\serve.py site --open && exit /b 0
where python >nul 2>nul && python runtime\serve.py site --open && exit /b 0

echo Could not find Node.js or Python to start the local viewer.
pause
exit /b 1

:fail
popd
echo Build failed. See the error above.
pause
exit /b 1
