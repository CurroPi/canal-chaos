# Canal Game: Plan and Progress

## Phase 0: Setup
- [x] Create project folder
- [x] CLAUDE.md (project memory for Claude)
- [x] Draft GDD (`docs/GDD.md`)
- [x] Install git and make the first commit

## Phase 1: Design (no code)
- [x] Section 2: Core loop and score (agreed)
- [x] Section 5: Towpath, canal edge, wall exits (agreed)
- [x] Section 6: Enemies and obstacles (agreed)
- [x] Section 4: Hipster character cast (Oatley, Fennel, Moss, Ziggy)
- [ ] Review the rest of the GDD draft and close the [OPEN] items
- [ ] Pick favourite satire ideas (points name, power-ups, death messages, rank titles)
- [ ] Confirm the zone list and the order of difficulty

## Phase 2: Tech decisions
- [x] Visual style: 3D behind-the-player, low-poly toy style
- [x] Engine/framework: Three.js
- [x] Hosting: Netlify (account ready)
- [x] Leaderboard backend: Supabase (account ready)

## Phase 3: Build (each milestone must be playable)
- [x] M1 Prototype: square in 3 lanes, scrolling, one enemy, game over
- [ ] M2 "Saturday on the canal" (after M1 playtest: needs variety and satire early)
  - [x] M2a: cyclists (oncoming + from behind with bell/"ON YOUR LEFT!" warning), coffee lives, death message per enemy, sounds, busier start
  - [x] M2b: Lime bikes replace Lycra cyclists, dog walkers, Instagrammers, prams, bridges, busy path from the start
  - [x] M2c-1: speech bubbles (lines in src/lines.js), office every 100 points
  - [x] Run clubs (packs + convoys) and delivery e-bikes (from behind, last-second swerves)
  - [ ] Zones: shelved for now (it's a Hackney-themed endless run). Maybe later: wall jokes, CLOSE CALL pop-ups
- [ ] M3 Enemies and obstacles: full roster with behaviours
- [ ] M4 Zones: Victoria Park → Camden progression and banners
- [ ] M5 Art: canal, towpath, characters
- [ ] M6 Satire and juice: sounds, death messages, power-ups
- [x] Character select: Sophie, Alex, Joe, Josh (all unlocked for testing; unlocks by score later?), own drinks, 3D turntable preview
- [ ] M7 Menus, mobile controls, polish
- [x] M8 Online leaderboard
- [ ] M9 Playtesting with friends and fixes
- [ ] M10 Launch 🚀

## Notes for later
- Instagrammer: removed for now (design not readable). Redesign later, e.g. ring light or selfie stick, then re-enable in src/config.js.
- Phone (portrait) view: lots of empty sky, player looks small. Tilt camera down on tall screens (M7).

## Playtest round 1 (bot) - done 2026-10-07
- [x] Rush levels every 1000 pts (faster + denser, banner line)
- [x] Café gaps grow: 500, 1250, 2250, 3500...
- [x] Bridges + deliveries appear as planned (bridge lane hold, deliveries booked in advance)
- [x] Mix rebalance step 1: runner 3->2.6, dog 2.8->3.0, pram 0.5->0.7, run club 1.2->1.4
- [x] Phone camera (lower/closer on tall screens), passers-by hidden near camera
- [x] CLOSE CALL +25 (window 0.9s)
- [ ] Human playtest needed: the bot has perfect perception and never dies late game, so tune rush by real play
- [ ] Mix rebalance step 2 after playtest

## Next session (as of 2026-10-07)
- [ ] Check the live Netlify site (re-upload `public/` to Deploys first)
- [x] Leaderboard (Supabase): live. Table `scores` in CurroPi's Project; publishable key in public/src/leaderboard.js
- [ ] Share button on game over
- [ ] Maybe: pixel-style DOOM PIGEONS print for Josh to match Alex's ARIES
- [ ] Maybe: unlock walkers by score; walker-specific lines
- [ ] Phone polish: too much sky on tall screens
