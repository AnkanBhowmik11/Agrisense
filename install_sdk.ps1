$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$sdkDir = "C:\Users\ankan\AppData\Local\Android\Sdk"
$toolsZip = "$sdkDir\cmdline-tools.zip"
$cmdlineToolsDir = "$sdkDir\cmdline-tools"

Write-Host "Downloading Android SDK Command-line Tools..."
Invoke-WebRequest -Uri "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip" -OutFile $toolsZip

Write-Host "Extracting..."
Expand-Archive -Path $toolsZip -DestinationPath $cmdlineToolsDir -Force

Write-Host "Restructuring..."
if (Test-Path "$cmdlineToolsDir\cmdline-tools") {
    Rename-Item -Path "$cmdlineToolsDir\cmdline-tools" -NewName "latest"
}

Write-Host "Accepting licenses and installing SDK..."
$env:JAVA_HOME = "C:\Program Files\JetBrains\PyCharm 2025.2.4\jbr"
$sdkManager = "$cmdlineToolsDir\latest\bin\sdkmanager.bat"
echo y | & $sdkManager "platforms;android-34" "build-tools;34.0.0" "platform-tools"

Write-Host "SDK Installation complete."
