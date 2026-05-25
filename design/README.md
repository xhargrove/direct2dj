# Design reference assets

Source-of-truth files for brand assets that are not served from `public/` until exported for production.

## App icon

| File | Use |
|------|-----|
| [`app-icon-reference.png`](./app-icon-reference.png) | Master **1024×1024** app icon — Digital Service Pack (folders, cloud/gear/wifi, “digital SERVICE pack”, Established 2019) |

**Brand colors (approximate):** black background; blue/white glow accents; yellow for “pack” and established banner.

**iOS / Capacitor:** Export required sizes into `ios/App/App/Assets.xcassets/AppIcon.appiconset/` (replace `AppIcon-512@2x.png` and add full `Contents.json` set per Apple’s App Icon template). Do not hotlink this file from the web app — it is reference only.

**App Store:** Use the 1024×1024 export without transparency or rounded corners (Apple applies the mask).
