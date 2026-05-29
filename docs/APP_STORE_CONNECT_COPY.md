# App Store Connect copy

Paste into **App Store Connect → App Information / Version** for **Digital Service Pack** (iOS).

Replace `[BRACKETS]` with your real values before submitting.

---

## App Information

| Field | Value |
|-------|--------|
| **Name** | Digital Service Pack |
| **Subtitle** (30 chars max) | Music packs direct to DJs |
| **Primary category** | Music |
| **Secondary category** | Business (optional) |
| **Content rights** | Does not contain third-party content (unless you host licensed promo art you don’t own — adjust if needed) |

---

## URLs

| Field | URL |
|-------|-----|
| **Privacy Policy** | https://digitalservicepack.com/privacy |
| **Support URL** | https://digitalservicepack.com/support |
| **Marketing URL** (optional) | https://digitalservicepack.com |

---

## Promotional text (170 chars max, editable anytime)

Independent artists meet working DJs: discover packs, preview tracks, download promos, and report plays — without inbox chaos.

---

## Description (4000 chars max)

Digital Service Pack connects independent artists with vetted DJs through a structured promo workflow — not another cluttered inbox.

FOR DJS
• Browse a curated Discover feed with editorial spotlights and catalog filters
• Preview tracks before you download
• Download clean, organized promo packs
• Leave feedback and ratings for artists
• Report plays back to the community
• Control privacy: choose what artists can see about you

FOR ARTISTS
• Submit and manage DJ-ready promo packs
• Track engagement with per-track analytics
• Promote releases with Featured Spotlight placement
• See which DJs downloaded and supported your music

FOR LABELS & TEAMS
• Manage roster releases and catalog visibility (label accounts)

Built for the dance music community. Sign in with your Digital Service Pack account. DJ access is reviewed before full catalog access is granted.

Questions or account help: https://digitalservicepack.com/support

---

## Keywords (100 chars max, comma-separated, no spaces after commas)

dj,music,promo,edm,house,techno,artist,label,download,mix,pack,spotlight,feedback,plays

---

## What’s New in Version 1.0

Welcome to Digital Service Pack for iPhone.

• Sign in to your artist or DJ workspace
• Discover new music and editorial spotlights
• Download promo packs and report plays
• Mobile-optimized navigation with bottom tabs
• Password reset from the sign-in screen

---

## App Review Information

### Contact

| Field | Value |
|-------|--------|
| **First name** | [Your first name] |
| **Last name** | [Your last name] |
| **Phone** | [Your phone] |
| **Email** | [Email you monitor during review] |

### Sign-in required?

**Yes** — the app is a signed-in workspace for artists and DJs. Public marketing pages are visible without login; core features require an account.

### Demo accounts (create before submit)

Provide **two** accounts in the notes below if possible:

1. **Approved DJ** — full Discover feed, downloads, feedback  
2. **Artist** — dashboard, tracks, submission flow (Stripe test/live per your setup)

Do **not** use production admin credentials. Reset passwords to something simple for reviewers.

### Notes for reviewer (paste into “Notes”)

```
Digital Service Pack is a Capacitor shell that loads our production web app over HTTPS at https://digitalservicepack.com.

HOW TO TEST
1. Launch the app → tap Log in.
2. Sign in with the APPROVED DJ account below.
3. Use bottom tabs: Dashboard, Feed, Downloads, More.
4. On Feed, open a track, preview if available, and test download.
5. Sign out via More → Sign out (or Privacy & settings for DJs).

OPTIONAL — ARTIST ACCOUNT
Sign in with the artist account to view the artist dashboard and track list.

PASSWORD RESET
Forgot password is on the sign-in screen. Reset emails require network access.

PAYMENTS
Artist checkout opens Stripe in an in-app browser tab. Test mode may be enabled.

DJ VETTING
New DJ signups see a limited workspace until approved. Use the approved DJ demo account for full access.

DEMO ACCOUNTS
Approved DJ:
  Email: [dj-demo@yourdomain.com]
  Password: [DemoPassword123!]

Artist:
  Email: [artist-demo@yourdomain.com]
  Password: [DemoPassword123!]

Support: https://digitalservicepack.com/support
Privacy: https://digitalservicepack.com/privacy
```

---

## Age Rating (questionnaire guidance)

When completing **Age Rating**:

- **Unrestricted web access:** Yes (loads digitalservicepack.com)
- **User-generated content:** Yes (artist uploads, DJ feedback) — typically infrequent; answer honestly
- **Made for Kids:** No

Expect **12+** or **17+** depending on UGC answers; follow Apple’s wizard.

---

## App Privacy (Privacy Nutrition Labels)

Declare data collected per https://digitalservicepack.com/privacy. Typical declarations:

| Data type | Purpose | Linked to user |
|-----------|---------|----------------|
| Email address | App functionality, account | Yes |
| Name | App functionality | Yes |
| User ID | App functionality | Yes |
| Product interaction | Analytics / app functionality | Yes |
| Other user content | App functionality (packs, feedback) | Yes |
| Purchase history | App functionality (Stripe) | Yes |
| Crash data | Optional if you use crash reporting | Varies |

Payment card data is handled by **Stripe**, not stored in the app.

---

## Screenshot checklist

Capture on **iPhone 6.7"** (and 6.5" if required) from TestFlight or Simulator:

1. Home / spotlight hero  
2. DJ Discover feed with spotlight row  
3. Track detail / preview  
4. Artist dashboard or tracks list  
5. Login or “How it works” (optional)

Use dark mode to match brand. Avoid personal data in screenshots.

---

## Export compliance

**Uses encryption:** No (already set in Info.plist — `ITSAppUsesNonExemptEncryption` = false)

In App Store Connect, answer **No** for exempt encryption documentation unless Apple prompts otherwise.

---

## Pre-submit checklist

- [ ] Demo accounts created and tested on TestFlight  
- [ ] `npm run verify:app-store` passes  
- [ ] `npm run cap:sync:prod` → Archive → Upload build  
- [ ] Privacy URL and Support URL open on device Safari  
- [ ] Review notes include working demo credentials  
- [ ] Version **1.0 (1)** incremented for each new upload after rejection
