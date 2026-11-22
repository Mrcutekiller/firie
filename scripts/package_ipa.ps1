$ErrorActionPreference = "Stop"

$workspaceRoot = "C:\Users\biruk\OneDrive\Desktop\FITLY"
$tempPayloadDir = "$workspaceRoot\build-ipa-temp"
$payloadDir = "$tempPayloadDir\Payload"
$appDir = "$payloadDir\App.app"
$outputIpa = "$workspaceRoot\FITLY.ipa"

if (Test-Path $tempPayloadDir) {
    Remove-Item -Recurse -Force $tempPayloadDir
}
if (Test-Path $outputIpa) {
    Remove-Item -Force $outputIpa
}

New-Item -ItemType Directory -Path $appDir -Force | Out-Null

# 1. Copy web dist bundle into App.app/public
$publicTarget = "$appDir\public"
Copy-Item -Recurse -Force "$workspaceRoot\dist\*" $appDir
New-Item -ItemType Directory -Path $publicTarget -Force | Out-Null
Copy-Item -Recurse -Force "$workspaceRoot\dist\*" $publicTarget

# 2. Copy Info.plist
Copy-Item -Force "$workspaceRoot\ios\App\App\Info.plist" $appDir

# 3. Copy capacitor config
Copy-Item -Force "$workspaceRoot\capacitor.config.json" $appDir

# 4. Copy app icon
Copy-Item -Force "$workspaceRoot\public\icon.png" "$appDir\AppIcon.png"
Copy-Item -Force "$workspaceRoot\ios\App\App\Assets.xcassets\AppIcon.appiconset\AppIcon-512@2x.png" "$appDir\AppIcon60x60@2x.png"

# 5. Package into ZIP with .ipa extension
$zipTarget = "$workspaceRoot\FITLY.zip"
if (Test-Path $zipTarget) {
    Remove-Item -Force $zipTarget
}

Compress-Archive -Path "$payloadDir" -DestinationPath $zipTarget -CompressionLevel Optimal
Rename-Item -Path $zipTarget -NewName "FITLY.ipa" -Force
Copy-Item -Force "$workspaceRoot\FITLY.ipa" "$workspaceRoot\public\FITLY.ipa"

Remove-Item -Recurse -Force $tempPayloadDir

Write-Host "Successfully generated iOS App Package: $outputIpa and copied to public/FITLY.ipa"
