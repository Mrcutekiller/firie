$ErrorActionPreference = "Stop"

# Builds a lean iOS app bundle archive from the current web build.
#
# The previous version of this script was broken in three ways:
#   1. It copied dist/ into BOTH App.app/ and App.app/public/, doubling every asset.
#   2. It dragged along FITLY.apk / FITLY.ipa from dist/, so the IPA ended up
#      containing copies of itself and the APK (~761 MB total).
#   3. It produced a zip with no code signature and no native executable, so
#      the result could never be installed on an iPhone.
#
# This version only stages the web assets. Signing + native code is handled by
# xtool (see .gemini/rules/ios_distribution_rule.md).

$workspaceRoot = "C:\Users\biruk\OneDrive\Desktop\FITLY"
$tempPayloadDir = "$workspaceRoot\build-ipa-temp"
$payloadDir = "$tempPayloadDir\Payload"
$appDir = "$payloadDir\App.app"
$webDir = "$appDir\public"
$outputIpa = "$workspaceRoot\FITLY.ipa"

if (Test-Path $tempPayloadDir) {
    Remove-Item -Recurse -Force $tempPayloadDir
}
if (Test-Path $outputIpa) {
    Remove-Item -Force $outputIpa
}

if (-not (Test-Path "$workspaceRoot\dist\index.html")) {
    throw "dist/index.html not found. Run 'npm run build' first."
}

New-Item -ItemType Directory -Path $webDir -Force | Out-Null

# 1. Web assets live in App.app/public (Capacitor webDir convention).
#    Never copy installers into the bundle - they do not belong in an .app.
Copy-Item -Recurse -Force "$workspaceRoot\dist\*" $webDir
Get-ChildItem -Path $webDir -Recurse -File -Include *.apk, *.ipa | Remove-Item -Force

# 2. Metadata + config at the bundle root.
Copy-Item -Force "$workspaceRoot\ios\App\App\Info.plist" $appDir
Copy-Item -Force "$workspaceRoot\capacitor.config.json" $appDir
Copy-Item -Force "$workspaceRoot\public\icon.png" "$appDir\AppIcon.png"
Copy-Item -Force "$workspaceRoot\ios\App\App\Assets.xcassets\AppIcon.appiconset\AppIcon-512@2x.png" "$appDir\AppIcon60x60@2x.png"

# 3. Report what we staged so size regressions are obvious.
$staged = (Get-ChildItem -Path $payloadDir -Recurse -File | Measure-Object Length -Sum).Sum
Write-Host ("Staged bundle: {0:N1} MB" -f ($staged / 1MB))

# 4. Package into ZIP with .ipa extension.
$zipTarget = "$workspaceRoot\FITLY.zip"
if (Test-Path $zipTarget) {
    Remove-Item -Force $zipTarget
}

Compress-Archive -Path "$payloadDir" -DestinationPath $zipTarget -CompressionLevel Optimal
Rename-Item -Path $zipTarget -NewName "FITLY.ipa" -Force
Copy-Item -Force $outputIpa "$workspaceRoot\public\FITLY.ipa"

Remove-Item -Recurse -Force $tempPayloadDir

$final = (Get-Item $outputIpa).Length
Write-Host ("Successfully generated {0} ({1:N1} MB)" -f $outputIpa, ($final / 1MB))
Write-Host "NOTE: this archive is NOT yet code-signed and has no native executable."
Write-Host "      Run xtool to sign it before distributing to iPhones."
