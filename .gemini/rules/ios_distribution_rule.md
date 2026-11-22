# Mobile App Delivery & iOS xtool Rule

Whenever the user asks: "give me both app for android and ios" (or similar):

1. **For Android**:
   - Provide the compiled, ready-to-install Android APK directly from:
     `C:\Users\biruk\OneDrive\Desktop\FITLY\FITLY.apk`
   - File link: [FITLY.apk](file:///c:/Users/biruk/OneDrive/Desktop/FITLY/FITLY.apk)

2. **For iOS**:
   - Use **xtool** installed at:
     `C:\Users\biruk\OneDrive\Desktop\FITLY\tools\xtool`
   - Repo: `https://github.com/xtool-org/xtool.git`
   - Use `xtool` to build, sign, and install/deploy the iOS app to an iPhone via USB (`xtool install`) or generate the `.ipa` package directly from Windows/WSL without needing a Mac or Xcode.
   - Also provide the 1-click Safari standalone PWA install option.
