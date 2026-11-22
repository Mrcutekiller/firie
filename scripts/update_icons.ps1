Add-Type -AssemblyName System.Drawing

$logoPath = "C:\Users\biruk\OneDrive\Desktop\FITLY\public\logo\Icy Ribbon Hanger F Logo.png"
$sourceImg = [System.Drawing.Image]::FromFile($logoPath)

function Resize-And-Save($targetPath, $width, $height, $isForeground = $false) {
    $bitmap = New-Object System.Drawing.Bitmap $width, $height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)

    if ($isForeground) {
        # Foreground icons need padding (approx 72% inner size)
        $innerW = [int]($width * 0.72)
        $innerH = [int]($height * 0.72)
        $x = [int](($width - $innerW) / 2)
        $y = [int](($height - $innerH) / 2)
        $graphics.DrawImage($sourceImg, $x, $y, $innerW, $innerH)
    } else {
        $graphics.DrawImage($sourceImg, 0, 0, $width, $height)
    }

    $graphics.Dispose()
    
    $dir = Split-Path $targetPath
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    # Save as PNG
    $bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
    Write-Host "Created: $targetPath ($width x $height)"
}

# 1. iOS App Icon (1024x1024)
Resize-And-Save "ios\App\App\Assets.xcassets\AppIcon.appiconset\AppIcon-512@2x.png" 1024 1024

# 2. Android App Icons
$densities = @(
    @{ Name = "mipmap-mdpi"; Size = 48; Fore = 108 },
    @{ Name = "mipmap-hdpi"; Size = 72; Fore = 162 },
    @{ Name = "mipmap-xhdpi"; Size = 96; Fore = 216 },
    @{ Name = "mipmap-xxhdpi"; Size = 144; Fore = 324 },
    @{ Name = "mipmap-xxxhdpi"; Size = 192; Fore = 432 }
)

foreach ($d in $densities) {
    $dir = "android\app\src\main\res\$($d.Name)"
    Resize-And-Save "$dir\ic_launcher.png" $d.Size $d.Size
    Resize-And-Save "$dir\ic_launcher_round.png" $d.Size $d.Size
    Resize-And-Save "$dir\ic_launcher_foreground.png" $d.Fore $d.Fore $true
}

# 3. Web & PWA Icons
Resize-And-Save "public\icon.png" 512 512
Resize-And-Save "public\favicon.png" 64 64

$sourceImg.Dispose()
Write-Host "All icons generated with official FITLY logo!"
