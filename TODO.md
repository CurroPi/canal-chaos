# On Your Right (was Canal Chaos): Plan and Progress

## 🚦 Pipeline (in priority order — work top to bottom)

### Now: quick wins
1. [x] **Share button on game over**: a pixel-art score card image ("I SURVIVED 1,240 POINTS ON THE REGENT'S CANAL · Killed by: a run club · playcanalchaos.com"), shared in one tap (phone share sheet; download on desktop).
2. [x] **Phone polish**: tried a new phone camera; Curro prefers the original framing, so it stays as it was.

### Next: real players
3. [ ] **Friends playtest** (5–10 people, one week). ✅ Anonymous stats are live (Supabase `runs`; page: playcanalchaos.com/stats.html). Next: Curro sends the link to friends; after a week, read the stats together.
4. [ ] **Weekly leaderboard**: a "This week" tab that resets every Monday, next to "All time".
5. [ ] **Tune difficulty from the playtest**: rush levels after ~1,000 points, enemy mix (rebalance step 2), café and unlock spacing.

### Then: more fun
6. [ ] **Installable game**: "Add to Home Screen" opens full-screen like an app (icons already done).
7. [ ] **Power-ups**: Oat shot (speed burst), Noise-cancelling headphones (slower warnings), Tote bag shield (absorbs one hit).
8. [ ] **Phone vibration** on hits and close calls.
9. [ ] **Weather**: a rain stretch (everyone runs faster, puddles splash).
10. [ ] **Golden hour / night stretch**: sunset, fairy lights on the boats.

### Side hustles (mini-games)
- [ ] **Personal bests per hustle** (fastest pool win, most PERFECT dance hits, Pilar's top mark), shown in Side Hustles; maybe online boards later.
- [ ] **More hustles for other walkers**: Spike (pogo to the beat at a Camden gig), Tanner (finish two litres before the walk), Josh (vape-cloud rhythm? band gig?).
- [ ] Tune difficulty of pool / dance / pottery from real play (pool: target lowered 3 → 2 after the playtest, 2 of 12 wins; check again).

### Later: bigger content
11. [ ] **The journey**: Victoria Park → Camden, with banners for real stretches (Broadway Market, Haggerston, Islington Tunnel) and a Camden finale (Spike's mates as the "boss").
12. [ ] **More fake ads and walkers** (ongoing; reserve names in the GDD).
13. [ ] **App stores** (App Store + Google Play; free; Individual developer accounts; Capacitor wrap that bundles the game, so it works offline). Apps do NOT update when we push: every game update needs a new build in each store.
    - [x] Self-contained game: Three.js and the pixel fonts ship in `public/vendor/` and `public/fonts/` (no CDN).
    - [x] Store-safe content: real brands made parody (Lime → **Lemon** bikes, Strova, Maps, 'gram, Airbunk, Bugaboom…), three crude bits toned down (lower age rating).
    - [x] Phone-app basics: sound and walk pause when the app goes to the background; flag next to leaderboard names to report them (needs `docs/supabase/06-reports.sql`); `public/privacy.html` + `public/support.html` (linked from the title card); 1024px app icon in `store-assets/`.
    - [x] **Name decided: "On Your Right"** (a similar app called "canalchaos" is already in the App Store). Renamed in the title card, page title, manifest, privacy/support/stats pages, share file name and docs. Deliberately NOT changed: the domain playcanalchaos.com (and the share card's "PLAYCANALCHAOS.COM" line), the GitHub repo name, and the `canal-` saved-data keys (changing those would wipe players' scores).
    - [ ] Still shows "Canal Chaos": the Marketing Materials stills and `captions.md` (they also say "Lime bikes"). Regenerate with the `?debug` promo tools before posting; the tool's text is already updated.
    - [ ] Optional: a new domain that matches the name (e.g. onyourright…), then point `GAME_URL` in `share.js` at it.
    - [ ] Capacitor wrap: `ios/` and `android/` projects, native share + in-app browser (`public/src/links.js`, `share.js`), icons and splash. Needs Curro to confirm the app id (proposed `com.playcanalchaos.onyourright`; it can't change after launch) and Xcode + Android Studio installed.
    - [ ] Test on iOS Simulator, Android emulator, then real phones (swipes, sound after first tap, share, notch, background, offline, landscape on tablets).
    - [ ] Android closed test: 12 testers opted in for 14 days (Google rule for new personal accounts), then apply for production. iOS: TestFlight.
    - [ ] Listings (`docs/STORE_LISTING.md`), screenshots from the game, age rating + privacy answers, submit (Curro presses Submit).
    - [ ] `docs/RELEASING.md`: how to ship an update to both stores.
    - [ ] **Money**: local sponsors first, ads only if it takes off.

### Maybe
- [ ] Pixel-style DOOM PIGEONS print for Josh, to match Alex's ARIES.
- [ ] Instagrammer enemy redesign (ring light or selfie stick), then re-enable in src/config.js.

## 🧑 For Curro (outside the code)
**App stores (start the waiting ones first):**
- [ ] Check "On Your Right" is free: in the App Store and Google Play searches now, and by reserving it the moment each account is ready (names are first come, first served).
- [ ] Enrol in the **Apple Developer Program** as an Individual ($99/year): https://developer.apple.com/programs/enroll/ (can take days).
- [ ] Create a **Google Play Console** account ($25 once, ID + phone check): https://play.google.com/console/signup
- [ ] Install **Xcode** (Mac App Store) and **Android Studio**, open each once. Tell Claude when done.
- [ ] Create the public contact email, then replace `[Contact email coming soon]` in `public/privacy.html` and `public/support.html` (it shows publicly once you push).
- [ ] In Supabase → SQL Editor, run `docs/supabase/06-reports.sql` (so name reports get stored). Until then the flag still hides the name for that player.
- [ ] Read `public/privacy.html` and check it says what you're happy with.
- [ ] Line up 15+ people with Android phones for the Google closed test (can be the playtest friends).
- [ ] Mention to DUDE that their ad line is now "CRAZY IDEAS. THAT WORK. LIKE THIS GAME."

**Website:**
- [ ] GitHub → Settings → Pages: check **Enforce HTTPS** is ticked (the site already loads over https).
- [ ] Delete the old Netlify site.
- [ ] Replace [LINK] in `Marketing Materials/captions.md` with https://playcanalchaos.com.
- [ ] Push origin in GitHub Desktop after each session.

## ✅ Done so far
- App-store prep (Nov 2026): game bundles Three.js + fonts (works offline); real brands renamed; crude bits toned down; background pause; report-a-name flag; privacy + support pages; 1024px icon. Still to do: see item 13.
- Design: GDD, satire tone, cast, enemies, towpath lanes.
- Game: 3-lane endless runner in Three.js; Lime bikes, delivery e-bikes (fair: one warning at a time, no last-second swerves), runners, run clubs, dog walkers, prams, cargo bikes, specials, bridges, café coffee refills, close calls, rush levels, Hackney milestone titles, speech bubbles, 14+ canal gags, East London far bank, DUDE office.
- Walkers: 12 (free: Sophie, Alex, Joe, Jasper; unlocks: Pilar 500 + Pilar's show, Fern 600, David 700 + pool, Spike 800, Josh 900, Ross 1,000, Tanner 1,100, Duck 1,200 + courtship dance), own drinks, one-liners, unlock screen with fanfare.
- Fake ad breaks: 6 pixel-art parody ads, shuffled, every 3rd game over.
- Sound: chiptune music and SFX, with separate on/off buttons.
- Online leaderboard (Supabase) with anti-cheat.
- Hosting: GitHub Pages at playcanalchaos.com; favicon and phone icons.
- Marketing stills for LinkedIn and Instagram.
- Score is called steps; NEW PB; share button with a pixel score card (crash snapshot, Saturday-on-the-canal copy).
- Phone camera: tried less sky + bigger walker + sideways follow; reverted to the original framing (preferred).
- Opening camera swing (first walk and after changing walker) with name + one-liner caption and whoosh.
- Every walker spills and refills their own drink (own lines and icon).
- Side Hustles on the game-over card to replay the mini-games.
- Canal from Curro's photos: realistic wall graffiti, houses and trees in the far-bank gaps, ONE HUNDRED YEARS portrait wall, a proper Containerville.
- Canal traffic now and then (cruising boats with jokes, hire boat, paddleboarder, duck fight, inflatable dinghy party); the sauna boat has a SAUNA sign.
- After the playtest: walkers unlock by total steps (Pilar 1,000 … Duck 8,000) or one great run, with a 'next walker' bar on the game-over card; pool needs 2 pots instead of 3; cafés close at 3,000 steps ("OAT MILK SOLD OUT") so expert runs end.
- Fern's mini-game: A Week with Fern (keep a monstera, fiddle-leaf fig and snake plant alive till Sunday).
- Spike's mini-game: Not Under My Squat (drop tellies on gentrifiers so the shop under his squat never opens).
- Unlock mini-games: David's pool at The Victory (pot 2 before his pint is gone), Duck's courtship dance on the canal (rhythm game vs a mallard), Pilar's Open Studio Show (throw, shape, glaze a mug to a local brief; Pilar judges).
