# Canal Game (working title)

A satirical endless-runner browser game set on the Regent's Canal towpath in London on a busy Saturday.
Inspired by Subway Surfers, but the enemies are cyclists and runners, and the tone is MAXIMUM SATIRE.

## Key documents
- `docs/GDD.md`: Game Design Document. The source of truth for what the game is.
- `TODO.md`: phases, milestones, and current status. Update it when a task is finished.

## Working rules
- The owner is not a programmer. Explain decisions in plain language and keep them short.
- Build in small, playable steps. After each change the game must still run.
- Plan before building each milestone (plan mode), then implement.
- Put every tuning number (speeds, spawn rates, zone lengths) in one config file, never scattered through the code.
- Placeholder graphics (shapes or emoji) come first. Real art only arrives in milestone M5.
- Commit to git after every working step.

## Tech
- **View:** 3D, camera behind the player (like Subway Surfers).
- **Art style:** low-poly "toy" 3D (think Crossy Road). All models are built in code from simple shapes,
  with no external art files needed. 2D overlays (speech bubbles, banners, signs) carry the jokes.
- **Engine:** Three.js, using plain JavaScript in the browser.
- **Hosting:** Netlify (account created by owner). Set up at launch/playtest time.
- **Leaderboard backend:** Supabase (account created by owner). Set up at milestone M8.
  Only the public "anon/publishable" key goes in the game code. Never secret keys or passwords.
