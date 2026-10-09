# Canal Chaos: Plan and Progress

## 🚦 Pipeline (in priority order — work top to bottom)

### Now: quick wins
1. [x] **Share button on game over**: a pixel-art score card image ("I SURVIVED 1,240 POINTS ON THE REGENT'S CANAL · Killed by: a run club · playcanalchaos.com"), shared in one tap (phone share sheet; download on desktop).
2. [x] **Phone polish**: check the camera on tall phones (too much sky, player too small) and fix.

### Next: real players
3. [ ] **Friends playtest** (5–10 people, one week). Before it starts: anonymous stats (score, cause of death, seconds, walker) so we can see where and why people die.
4. [ ] **Weekly leaderboard**: a "This week" tab that resets every Monday, next to "All time".
5. [ ] **Tune difficulty from the playtest**: rush levels after ~1,000 points, enemy mix (rebalance step 2), café and unlock spacing.

### Then: more fun
6. [ ] **Installable game**: "Add to Home Screen" opens full-screen like an app (icons already done).
7. [ ] **Power-ups**: Oat shot (speed burst), Noise-cancelling headphones (slower warnings), Tote bag shield (absorbs one hit).
8. [ ] **Phone vibration** on hits and close calls.
9. [ ] **Weather**: a rain stretch (everyone runs faster, puddles splash).
10. [ ] **Golden hour / night stretch**: sunset, fairy lights on the boats.

### Later: bigger content
11. [ ] **The journey**: Victoria Park → Camden, with banners for real stretches (Broadway Market, Haggerston, Islington Tunnel) and a Camden finale (Spike's mates as the "boss").
12. [ ] **More fake ads and walkers** (ongoing; reserve names in the GDD).
13. [ ] **App stores** (Capacitor wrap; parody brand names first) and **money**: local sponsors first, ads only if it takes off.

### Maybe
- [ ] Pixel-style DOOM PIGEONS print for Josh, to match Alex's ARIES.
- [ ] Instagrammer enemy redesign (ring light or selfie stick), then re-enable in src/config.js.

## 🧑 For Curro (outside the code)
- [ ] GitHub → Settings → Pages: re-add the custom domain if needed, then tick **Enforce HTTPS** once allowed.
- [ ] Delete the old Netlify site.
- [ ] Replace [LINK] in `Marketing Materials/captions.md` with https://playcanalchaos.com.
- [ ] Push origin in GitHub Desktop after each session.

## ✅ Done so far
- Design: GDD, satire tone, cast, enemies, towpath lanes.
- Game: 3-lane endless runner in Three.js; Lime bikes, delivery e-bikes (fair: one warning at a time, no last-second swerves), runners, run clubs, dog walkers, prams, cargo bikes, specials, bridges, café coffee refills, close calls, rush levels, Hackney milestone titles, speech bubbles, 14+ canal gags, East London far bank, DUDE office.
- Walkers: 11 (free: Sophie, Alex, Joe, Jasper; unlocks: Pilar 500, Fern 600, David 700, Spike 800, Josh 900, Ross 1,000, Tanner 1,100), own drinks, one-liners, unlock screen with fanfare.
- Fake ad breaks: 6 pixel-art parody ads, shuffled, every 3rd game over.
- Sound: chiptune music and SFX, with separate on/off buttons.
- Online leaderboard (Supabase) with anti-cheat.
- Hosting: GitHub Pages at playcanalchaos.com; favicon and phone icons.
- Marketing stills for LinkedIn and Instagram.
- Score is called steps; NEW PB; share button with a pixel score card (crash snapshot, Saturday-on-the-canal copy).
- Phone camera: less sky, bigger walker; the camera stays still (sideways follow tried and removed: confusing).
- Opening camera swing (first walk and after changing walker) with name + one-liner caption and whoosh.
- Every walker spills and refills their own drink (own lines and icon).
