# Google Play Store Upload Guide — Space Shooter

Everything below is ready to copy-paste. Work top to bottom.

## What you upload

- **App bundle:** `SpaceShooter - Google Play package (1)\SpaceShooter.aab`
  (NOT the .apk — the APK is only for sideload testing on your own phone.)
- **Keep safe forever:** `signing.keystore` + `signing-key-info.txt` from that
  same folder. Copy them somewhere outside this project (password manager,
  USB drive). If you lose them you can never update the app.
- Do NOT use the older package folder (different signing key). Consider
  deleting it to avoid mixups.

## Step 1 — Developer account (you must do this part)

1. Go to https://play.google.com/console/signup
2. Choose **Personal** account, pay the one-time $25 fee.
3. Complete identity verification (can take a day or two — start now).

## Step 2 — Create the app

Play Console → All apps → **Create app**
- App name: `Space Shooter: Neon Galaxy` (or just `Space Shooter`)
- Default language: English (United States)
- App or game: **Game** · Free or paid: **Free**
- Accept the declarations.

## Step 3 — Store listing (copy-paste)

**Short description (max 80 chars):**
```
Neon arcade space shooter. Pick your ship, blast UFOs, survive the boss waves!
```

**Full description:**
```
Blast your way through waves of alien UFOs in this fast-paced neon arcade
shooter, inspired by the classics!

CHOOSE YOUR SHIP
- FALCON - the fastest ship in the fleet, single precision shot
- TANK - slow but devastating triple-shot spread
- WASP - agile with a blistering rate of fire

FEATURES
- Epic boss battles every few levels - take down the mothership!
- Power-ups: Rapid Fire, Triple Shot, and Shields
- Three difficulty modes, from casual to bullet-storm
- Gorgeous neon visuals: parallax starfields, nebula clouds, screen shake
- Works offline - play anywhere
- Free, no ads, no in-app purchases, no data collection

Simple touch controls: virtual joystick to move, one button to fire.
How long can you survive? Beat your high score!
```

**Graphics assets (all in this folder / repo root):**
| Asset | File | Requirement |
|---|---|---|
| App icon | `icon-512.png` (repo root) | 512×512 PNG |
| Feature graphic | `feature-graphic.png` (repo root) | 1024×500 |
| Phone screenshots | `01`–`06` PNGs in this folder | min 2, we have 6 (1920×1080) |

- Category: **Arcade**
- Contact email: musicbackup649@gmail.com
- Privacy policy URL: `https://bk26-hunt.github.io/space-shooter/privacy.html`

## Step 4 — Forms (exact answers)

**Data safety:** "Does your app collect or share any of the required user
data types?" → **No**. (High score is stored only on the device.)

**Content rating questionnaire:** Category: Game →
- Violence: cartoon/fantasy violence toward non-human characters → Yes,
  unrealistic/cartoonish
- Everything else (sex, language, drugs, gambling, user interaction,
  location sharing, purchases): **No**
- Expected rating: Everyone / PEGI 3

**Ads:** No. **In-app purchases:** No.
**Target audience:** 13+ (avoids extra "Designed for Families" requirements).
**App access:** All functionality available without special access.

## Step 5 — Upload to Closed testing

1. Left menu → Testing → **Closed testing** → Create track → Create release.
2. When asked about **Play App Signing**: accept/enroll (default).
3. Upload `SpaceShooter.aab`.
4. Release name: `1.0`, release notes: `First release`.
5. Add testers: create an email list with at least **12 Gmail addresses**
   (friends/family), save, and copy the **opt-in link** to send them.
6. Roll out the release. It goes to Google review (usually 1-3 days for a
   first app).

## Step 6 — CRITICAL after upload: fix app verification

Play re-signs your app with Google's own key, so the installed app won't
be "trusted" until we publish Google's certificate fingerprint:

1. Play Console → Test and release → Setup → **App signing**
   (a.k.a. App integrity).
2. Copy the **SHA-256 certificate fingerprint** under
   "App signing key certificate".
3. **Tell Claude the fingerprint** — it gets added to
   `https://bk26-hunt.github.io/.well-known/assetlinks.json`.
   (Without this, the Play-installed app shows a browser address bar.)

## Step 7 — The 14-day clock (Google's rule, cannot be skipped)

Personal accounts created after Nov 2023 must run the closed test with
**12 testers opted in for 14 consecutive days** before applying for
production. Once testers opt in via your link and install the game:
- Day 0: release approved + 12 testers opted in → clock starts
- Day 14: Dashboard → **Apply for production access**
- Google reviews your answers (describe the testing you did honestly)
- Approved → create a Production release with the same AAB → the app
  goes public on the Play Store

## Timeline summary

| When | What |
|---|---|
| Today | Account signup, create app, listing, forms, upload AAB, invite testers |
| Today+ | Give Claude the App-signing fingerprint (Step 6) |
| ~Day 1-3 | Google approves the closed-test release |
| Day 14+ | Apply for production access |
| ~Day 15-18 | App is live on the Play Store 🚀 |
