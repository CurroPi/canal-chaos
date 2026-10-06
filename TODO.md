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
  - [ ] M2c: speech bubbles, zone banners, wall jokes, CLOSE CALL pop-ups
- [ ] M3 Enemies and obstacles: full roster with behaviours
- [ ] M4 Zones: Victoria Park → Camden progression and banners
- [ ] M5 Art: canal, towpath, characters
- [ ] M6 Satire and juice: sounds, death messages, power-ups
- [ ] M7 Menus, mobile controls, polish
- [ ] M8 Online leaderboard
- [ ] M9 Playtesting with friends and fixes
- [ ] M10 Launch 🚀

## Notes for later
- Instagrammer: removed for now (design not readable). Redesign later, e.g. ring light or selfie stick, then re-enable in src/config.js.
- Phone (portrait) view: lots of empty sky, player looks small. Tilt camera down on tall screens (M7).
