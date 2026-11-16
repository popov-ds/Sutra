@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

if not exist "android\gradlew.bat" (
  echo android\gradlew.bat not found. Run this script from the Sutra Android project folder.
  exit /b 1
)

for /f "tokens=2" %%V in ('findstr /c:"versionCode " android\app\build.gradle') do set "GRADLE_VCODE=%%~V"
for /f "tokens=2" %%V in ('findstr /c:"versionName" android\app\build.gradle') do set "GRADLE_VNAME=%%~V"

echo.
echo In android\app\build.gradle: versionCode=!GRADLE_VCODE! versionName=!GRADLE_VNAME!
echo RuStore requires versionCode higher than the version already in the console.
echo.

echo Mode:
echo   0. All
echo   1. Release
echo   2. Debug
echo.
set /p BUILD_MODE="Your choice [0/1/2]: "

if "%BUILD_MODE%"=="0" (
  set "MODE_TAG=All"
) else if "%BUILD_MODE%"=="1" (
  set "MODE_TAG=Release"
) else if "%BUILD_MODE%"=="2" (
  set "MODE_TAG=Debug"
) else (
  echo Invalid choice. Enter 0, 1 or 2.
  exit /b 1
)

echo.
echo Store:
echo   0. All
echo   1. Google Play
echo   2. RuStore
echo.
set /p BUILD_STORE="Your choice [0/1/2]: "

if "%BUILD_STORE%"=="0" (
  set "STORE_TAG=All"
) else if "%BUILD_STORE%"=="1" (
  set "STORE_TAG=Play"
) else if "%BUILD_STORE%"=="2" (
  set "STORE_TAG=RuStore"
) else (
  echo Invalid choice. Enter 0, 1 or 2.
  exit /b 1
)

if /i "%STORE_TAG%"=="RuStore" if /i "%MODE_TAG%"=="Debug" (
  echo.
  echo WARNING: RuStore needs a Release build. Prefer Mode 1 ^(Release^), not Debug.
  echo.
)

if /i "%STORE_TAG%"=="Play" (
  set "APP_DISTRIBUTION=play"
) else if /i "%STORE_TAG%"=="RuStore" (
  set "APP_DISTRIBUTION=rustore"
) else (
  set "APP_DISTRIBUTION=rustore"
)

set "GRADLE_TASK="
if "%MODE_TAG%"=="All" if "%STORE_TAG%"=="All" set "GRADLE_TASK=assemble"
if "%MODE_TAG%"=="All" if "%STORE_TAG%"=="Play" set "GRADLE_TASK=assemblePlay"
if "%MODE_TAG%"=="All" if "%STORE_TAG%"=="RuStore" set "GRADLE_TASK=assembleRustore"
if "%MODE_TAG%"=="Release" if "%STORE_TAG%"=="All" set "GRADLE_TASK=assembleRelease"
if "%MODE_TAG%"=="Release" if "%STORE_TAG%"=="Play" set "GRADLE_TASK=assemblePlayRelease"
if "%MODE_TAG%"=="Release" if "%STORE_TAG%"=="RuStore" set "GRADLE_TASK=assembleRustoreRelease"
if "%MODE_TAG%"=="Debug" if "%STORE_TAG%"=="All" set "GRADLE_TASK=assembleDebug"
if "%MODE_TAG%"=="Debug" if "%STORE_TAG%"=="Play" set "GRADLE_TASK=assemblePlayDebug"
if "%MODE_TAG%"=="Debug" if "%STORE_TAG%"=="RuStore" set "GRADLE_TASK=assembleRustoreDebug"

if not defined GRADLE_TASK (
  echo Internal error: could not resolve Gradle task.
  exit /b 1
)

echo.
echo Building: Mode=%MODE_TAG%, Store=%STORE_TAG%, APP_DISTRIBUTION=%APP_DISTRIBUTION%
echo Task: %GRADLE_TASK%
echo.

if exist "android\build\generated\autolinking\autolinking.json" (
  findstr /c:"Projects\\Sutra\\node_modules" "android\build\generated\autolinking\autolinking.json" >nul 2>&1
  if not errorlevel 1 (
    echo Removing stale autolinking config ^(paths before move to Android\^)...
    rd /s /q "android\build\generated\autolinking"
  )
)

pushd android
call gradlew.bat %GRADLE_TASK%
set ERR=%ERRORLEVEL%
popd

if not %ERR%==0 (
  echo.
  echo Build failed with exit code %ERR%.
  pause
  exit /b %ERR%
)

set "AAPT="
if defined ANDROID_HOME if exist "%ANDROID_HOME%\build-tools" (
  for /f "delims=" %%D in ('dir /b /ad /o-n "%ANDROID_HOME%\build-tools" 2^>nul') do (
    if exist "!ANDROID_HOME!\build-tools\%%D\aapt.exe" set "AAPT=!ANDROID_HOME!\build-tools\%%D\aapt.exe"
    if defined AAPT goto :found_aapt
  )
)
if not defined AAPT if exist "%LOCALAPPDATA%\Android\Sdk\build-tools" (
  for /f "delims=" %%D in ('dir /b /ad /o-n "%LOCALAPPDATA%\Android\Sdk\build-tools" 2^>nul') do (
    if exist "%LOCALAPPDATA%\Android\Sdk\build-tools\%%D\aapt.exe" set "AAPT=%LOCALAPPDATA%\Android\Sdk\build-tools\%%D\aapt.exe"
    if defined AAPT goto :found_aapt
  )
)
:found_aapt

echo.
echo Build finished.
echo.

set "APK_ROOT=android\app\build\outputs\apk"

if /i "%STORE_TAG%"=="RuStore" if exist "%APK_ROOT%\rustore\release\app-rustore-release.apk" (
  echo RuStore upload this file:
  echo   %CD%\%APK_ROOT%\rustore\release\app-rustore-release.apk
  if defined AAPT (
    for /f "tokens=2 delims='" %%A in ('"!AAPT!" dump badging "%APK_ROOT%\rustore\release\app-rustore-release.apk" ^| findstr "versionCode"') do echo   APK versionCode=%%A
    for /f "tokens=2 delims='" %%A in ('"!AAPT!" dump badging "%APK_ROOT%\rustore\release\app-rustore-release.apk" ^| findstr "versionName"') do echo   APK versionName=%%A
  )
  echo.
)

echo All APK:
for /r "%APK_ROOT%" %%F in (*.apk) do (
  echo   %%F
  if defined AAPT (
    for /f "tokens=2 delims='" %%A in ('"!AAPT!" dump badging "%%F" ^| findstr "versionCode"') do echo     versionCode=%%A
  )
)
echo.
echo Google Play AAB ^(Release^): npm run build:play
echo Copy to dist: npm run build:rustore
echo.
pause