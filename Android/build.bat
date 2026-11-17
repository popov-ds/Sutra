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

echo Increase versionCode before build?
echo   1. No
echo   2. Yes
echo.
set /p BUMP_VCODE="Your choice [1/2]: "

if "%BUMP_VCODE%"=="2" (
  for /f "tokens=1,* delims==" %%A in ('powershell -ExecutionPolicy Bypass -File "scripts\bump-version-code.ps1" -BuildGradlePath "%CD%\android\app\build.gradle"') do (
    if /i "%%A"=="versionCode" set "GRADLE_VCODE=%%B"
  )
  if errorlevel 1 (
    echo Failed to bump versionCode.
    pause
    exit /b 1
  )
  echo Updated versionCode=!GRADLE_VCODE! in android\app\build.gradle
  echo.
) else if not "%BUMP_VCODE%"=="1" (
  echo Invalid choice. Enter 1 or 2.
  exit /b 1
)

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

set "SHOW_PLAY_RELEASE=0"
set "SHOW_PLAY_DEBUG=0"
set "SHOW_RUSTORE_RELEASE=0"
set "SHOW_RUSTORE_DEBUG=0"

if /i "%MODE_TAG%"=="All" if /i "%STORE_TAG%"=="All" (
  set "SHOW_PLAY_RELEASE=1"
  set "SHOW_PLAY_DEBUG=1"
  set "SHOW_RUSTORE_RELEASE=1"
  set "SHOW_RUSTORE_DEBUG=1"
) else if /i "%MODE_TAG%"=="All" if /i "%STORE_TAG%"=="Play" (
  set "SHOW_PLAY_RELEASE=1"
  set "SHOW_PLAY_DEBUG=1"
) else if /i "%MODE_TAG%"=="All" if /i "%STORE_TAG%"=="RuStore" (
  set "SHOW_RUSTORE_RELEASE=1"
  set "SHOW_RUSTORE_DEBUG=1"
) else if /i "%MODE_TAG%"=="Release" if /i "%STORE_TAG%"=="All" (
  set "SHOW_PLAY_RELEASE=1"
  set "SHOW_RUSTORE_RELEASE=1"
) else if /i "%MODE_TAG%"=="Release" if /i "%STORE_TAG%"=="Play" (
  set "SHOW_PLAY_RELEASE=1"
) else if /i "%MODE_TAG%"=="Release" if /i "%STORE_TAG%"=="RuStore" (
  set "SHOW_RUSTORE_RELEASE=1"
) else if /i "%MODE_TAG%"=="Debug" if /i "%STORE_TAG%"=="All" (
  set "SHOW_PLAY_DEBUG=1"
  set "SHOW_RUSTORE_DEBUG=1"
) else if /i "%MODE_TAG%"=="Debug" if /i "%STORE_TAG%"=="Play" (
  set "SHOW_PLAY_DEBUG=1"
) else if /i "%MODE_TAG%"=="Debug" if /i "%STORE_TAG%"=="RuStore" (
  set "SHOW_RUSTORE_DEBUG=1"
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

powershell -ExecutionPolicy Bypass -File "scripts\ensure-android-local-properties.ps1" -AndroidProjectDir "%CD%\android"
if errorlevel 1 (
  echo.
  echo Could not configure android\local.properties ^(Android SDK path^).
  pause
  exit /b 1
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
set "ANY_APK=0"

if "!SHOW_RUSTORE_RELEASE!"=="1" if exist "%APK_ROOT%\rustore\release\app-rustore-release.apk" (
  set "ANY_APK=1"
  echo RuStore upload this file:
  echo   %CD%\%APK_ROOT%\rustore\release\app-rustore-release.apk
  if defined AAPT (
    for /f "tokens=2 delims='" %%A in ('"!AAPT!" dump badging "%APK_ROOT%\rustore\release\app-rustore-release.apk" ^| findstr "versionCode"') do echo   APK versionCode=%%A
    for /f "tokens=2 delims='" %%A in ('"!AAPT!" dump badging "%APK_ROOT%\rustore\release\app-rustore-release.apk" ^| findstr "versionName"') do echo   APK versionName=%%A
  )
  echo.
)

if "!SHOW_RUSTORE_DEBUG!"=="1" call :ListApkDir "%APK_ROOT%\rustore\debug"
if "!SHOW_RUSTORE_RELEASE!"=="1" if not exist "%APK_ROOT%\rustore\release\app-rustore-release.apk" call :ListApkDir "%APK_ROOT%\rustore\release"
if "!SHOW_PLAY_RELEASE!"=="1" call :ListApkDir "%APK_ROOT%\play\release"
if "!SHOW_PLAY_DEBUG!"=="1" call :ListApkDir "%APK_ROOT%\play\debug"

if "!ANY_APK!"=="0" (
  echo No APK listed for the selected Mode/Store. Check Gradle output above.
  echo.
)

if "!SHOW_PLAY_RELEASE!"=="1" (
  echo Google Play AAB ^(Release^): npm run build:play
)
if "!SHOW_RUSTORE_RELEASE!"=="1" (
  echo Copy to dist: npm run build:rustore
)
echo.
pause
exit /b 0

:ListApkDir
set "SCAN_DIR=%~1"
if not exist "%SCAN_DIR%" exit /b 0
for %%F in ("%SCAN_DIR%\*.apk") do (
  if exist "%%~fF" (
    set "ANY_APK=1"
    echo   %%~fF
    if defined AAPT (
      for /f "tokens=2 delims='" %%A in ('"!AAPT!" dump badging "%%~fF" ^| findstr "versionCode"') do echo     versionCode=%%A
    )
  )
)
exit /b 0