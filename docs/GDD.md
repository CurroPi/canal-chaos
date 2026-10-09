# Game Design Document: Canal Chaos

*A Hackney Towpath Survival Game*

_Status: DRAFT v0.1. Items marked **[OPEN]** still need a decision._

## 1. Pitch
You're a Hackney hipster with a tote bag and a flat white trying to walk the Regent's Canal towpath
from Victoria Park to Camden on a Saturday. Everyone else is trying to kill you.
It's an endless runner that keeps getting harder, and the satire goes up with it.

## 2. Core loop ✅ (agreed)
- **Endless run:** no level ends.
- **Your walking speed stays the same.** Difficulty comes from the towpath getting **busier and busier**:
  more enemies, more obstacles, more bridges, and tighter gaps between them.
- **Zones:** as you travel you pass through the real canal route, from Victoria Park to Camden. Each zone has its
  own joke banner and introduces new hazards (see section 7).
- **The loop:** reaching Camden starts **Lap 2** back at Victoria Park, with everything busier and more chaotic.
  Then Lap 3, Lap 4... with no end. The lap you reach becomes a bragging badge ("I reached Lap 3!").

### 2.1 Score
- **Distance** is the main source of points.
- **Collectibles** give bonus points (oat milk, vinyl, sourdough... see section 8).
- **Near-misses:** dodging an enemy at the last moment pops up "+50 CLOSE CALL!" on screen.
- **Spilling your coffee** costs some points.

### 2.2 Game over and bragging
- The game-over screen shows: score, lap and zone reached, and a satirical cause of death.
- **Submit to the online leaderboard.**
- **Share button:** creates a shareable image or text for social media
  (e.g. "I survived to Lap 2, Haggerston, before being Deliveroo'd. Score 12,450 🚲☕").

## 3. Controls ✅ (agreed)
- Left / right: change lane (keyboard arrows, plus swipe on mobile).
- No jump or duck for now. Possible later addition.

## 4. The player ✅ (agreed)
- **Choose your hipster** before each run. They all carry a coffee (your extra life).
- **Looks only:** each character has their own appearance, lines and death messages, but they all play the same.
  This keeps the leaderboard fair. Perks may come later, after playtesting.

| Character | Look | Drink (= extra life) |
|---|---|---|
| **Sophie** | Mustard beanie, long brown hair, sage overshirt, tote bag | Oat flat white |
| **Alex** | Blonde bob, black punk-pixel ARIES tee | Builder's tea (teabag tag) |
| **Joe** | Green cap, moustache, corduroy jacket, headphones, record bag | Black batch brew |
| **Josh** | Grey punk cap (studs, red patch), bleached hair, DOOM PIGEONS tee, neon bum bag | Energy drink can |
| **Ross** | Light orange beanie, ginger, lilac mushroom tee, mustard cords, blue trainers, big tote | Flat white in his own ceramic mug |
| **Tanner** | Mountain gear: orange shell jacket, hiking trousers, boots, backpack, half-blond hair | Huge reusable water bottle |

**[OPEN]** Unlock by score or all open? Own drink per character? 3D preview or flat cards?

Reserve cast for later: Jasper (Creative Director), Saffron (Ceramicist), Rafe (Startup Founder),
Juniper (Natural Wine Person).

## 5. The towpath (lanes) ✅ (agreed)
```
 CANAL ~~~ | lane 1 | lane 2 | lane 3 | WALL
 (left)      edge     middle   wall side (right)
```
- **Canal edge:** pressing left in lane 1 does nothing. You can't fall in.
- **Wall:** scenery, with jokes painted on it (signs, graffiti, prices).
- **Exits (the trap):** now and then the wall has an **exit** (stairs or a ramp up to the street).
  If you're in lane 3 and press right *while passing an exit*, you **leave the towpath, which is game over**.
  Cause of death examples: "Gave up and got the Overground.", "Left for a £7 flat white on Kingsland Road."
  Exits must be clearly visible so it feels like your mistake, not a trick.
- **Bridges:** the towpath narrows, so only 1 or 2 lanes stay open. They appear more often the further you go.

## 6. Obstacles and enemies ✅ (agreed)

### 6.1 Life system: ☕ coffee = your extra life
- **Any** hit (bike, runner or obstacle) while holding coffee: you **spill it**, slow down briefly and lose some points.
- **Any** hit with no coffee: **game over**.
- You can get a new coffee (rarely) at the **narrowboat café** (see 6.4).

### 6.2 Fairness rule (golden rule)
**There is always at least one escape path.** At every moment at least one lane is free, with enough time
to reach it. The game must never combine bridges, enemies and obstacles in a way that closes all 3 lanes.

### 6.3 Directions
- **From ahead:** visible in the distance, so you dodge.
- **From behind:** invisible, so the game gives a **warning** first: a bell sound, the lane flashes red,
  and "ON YOUR LEFT!" appears. You have about 1 second to leave that lane.

### 6.4 Enemies (bikes and runners)
| Enemy | Direction | Speed | Lanes | Behaviour | First zone |
|---|---|---|---|---|---|
| Solo runner | Ahead | Slow | 1 | Runs straight at you and never moves aside. | 1 Victoria Park |
| Regular cyclist | Ahead or behind | Medium | 1 | Stays in its lane. From behind, rings the bell first. | 2 Mile End |
| Lime bike | Ahead | Medium | 1 | Wobbles and drifts into the next lane once, at random. | 4 Haggerston |
| Running club | Ahead | Slow | **max 2** | A wide wall of matching shirts. In later zones it comes as a **staggered formation**: several rows, each blocking 2 lanes, with the gap moving, so you weave. | 7 King's Cross |
| Delivery e-bike | Behind | Very fast | 1 | Short warning, then zooms past. Later on it changes lane at the last second. **The final boss.** | 8 Camden |

### 6.5 Neutral obstacles (static or slow, these appear often)
| Obstacle | Lanes | Behaviour |
|---|---|---|
| Dog walker | 1 + lead across a 2nd | Owner on one side, dog on the other, lead blocking both. |
| Pram | 1 | Static. |
| Instagrammer | 1 | Stopped dead, taking a selfie. |
| Geese | 1–2 | Wander slowly sideways across lanes. |
| Houseboat clutter | Canal-side lane only | Bikes, plant pots, log piles. |
| Busker and crowd | 2 | A wide static block. |
| Bridge | Leaves 1–2 lanes open | Narrows the path, so everything gets squeezed. |

### 6.6 Hackney specials (one-off surprises, each appears **once** per run)
| Special | Lanes | Joke | Zone |
|---|---|---|---|
| Cargo bike with two toddlers and a sourdough loaf | 2 | Wide, slow and enormous. Counts as an enemy (it's a bike). | Broadway Market |
| Estate agent showing a "canal-side warehouse conversion" | 2 | "Only £3,200 pcm, very vibey" | Haggerston |
| Monstera carrier (Marketplace deal) | 1 | Leaves stick into the next lane. | Broadway Market |
| Sourdough queue spilling onto the towpath | 2 | "Est. wait: 50 mins" | Broadway Market |
| Fixie rider doing a track stand | 1 | Refuses to put a foot down. | Haggerston |
| Fashion lookbook shoot | 2 | "Can you not walk through the shot?" | Kingsland Road |
| Towpath yoga class | 2 | Downward dog across the path. | Victoria Park |
| **Narrowboat café** (£6 cinnamon bun) | 1 | Walk through it to **get a new coffee** (life back). | Any (rare) |
| Natural wine pop-up | 1 | "Orange wine, £14 a glass" | De Beauvoir |
| Paddleboarders | Canal-side lane | Splash! Soaks you if you're in the edge lane. | Mile End |
| Someone with the same tote bag | 1 | An awkward standoff. Neither of you moves. | Any |
| Startup "walking meeting" | 2 | "Let's circle back on the towpath." | King's Cross |
| Wild swimmer climbing out | Canal-side lane | Dripping, smug. | Victoria Park |
| Lost Columbia Road flower seller | 1 | "Wrong day mate, it's Saturday." | Any |
| Sofa carrier | 2 | Two people, one sofa, no plan. | Any |
| E-scooter, hen party, film crew, "towpath closed" diversion | — | Reserve list, maybe later. | — |

## 7. Zones (the route): Victoria Park → Camden
Each zone has its own look, new hazards and a joke banner when you enter it.
_First draft, all open to change:_

| # | Zone | Banner idea | New thing introduced |
|---|---|---|---|
| 1 | Victoria Park | "Brunch queue: 45 mins" | Solo runners, geese |
| 2 | Hertford Union / Mile End | "Saturday parkrun just finished" | Regular cyclists |
| 3 | Broadway Market | "Sourdough is £9 now" | Dog walkers, prams, crowds |
| 4 | Haggerston | "Every warehouse is now a coffee roastery" | Lime bikes |
| 5 | Kingsland Road / De Beauvoir | "Houseboat wood smoke advisory" | More frequent bridges |
| 6 | Islington Tunnel (detour over the streets at Angel) | "The towpath stops. Good luck, Angel." | A special street section? |
| 7 | King's Cross / Granary Square | "Tech bros on scooters" | Running clubs |
| 8 | Camden Lock | "Tourist singularity reached" | Delivery e-bikes at max speed, everything at once |
| ↻ | Back to Victoria Park, Lap 2, 3... | "Lap 2: it's somehow even busier" | Everything at once, denser every lap |

## 8. Scoring and satire: brainstorm (pick favourites)
- **Points currency:** "Smug Points", "Flat Whites", or "Vibes".
- **Collectibles:** oat milk cartons, vinyl records, natural wine bottles, sourdough loaves.
- **Power-ups:**
  - Noise-cancelling headphones: ignore bells for 5s (invincible).
  - Brompton: a speed boost.
  - Tote bag shield: absorbs one hit.
  - "I'm a local" aura: tourists step aside.
- **Causes of death** (shown on game over):
  - "Deliveroo'd. Your order is 2 minutes away."
  - "Overtaken by a running club. Strava will remember."
  - "Lime bike'd. It wasn't even being ridden."
  - "Tangled in an extendable dog lead. The dog is fine."
- **Rank titles by score:** Tourist → Day-tripper → Zone 2 Renter → Hackney Local → Houseboat Owner → Canal Legend.
- **Leaderboard flavour:** player name + postcode area ("E8" vs "N1" rivalry?).
- Funny signs along the wall: "Share the Space, Drop Your Pace", "Kombucha on tap", "Bike shed £2,400/month".

## 9. Online leaderboard
- After game over, enter a name and submit your score to a public top-scores list.
- This needs a small online database (decide in Phase 2). Needs a basic swear-word filter and basic anti-cheat.

## 10. Audio and feel
- Bike bells, "ON YOUR LEFT!", geese honking, a coffee slurp on pickup, sad trombone on death.
- **[OPEN]** Music style. Lo-fi? Ironic jazz?

## 11. Out of scope for v1
Jump/duck, character customisation (outfits), accounts and logins.

## Walker unlocks (built)
- Free from the start: **Sophie, Alex, Joe**.
- Unlocked by best score (saved on the device, so players who already scored high get them automatically):

| Walker | Unlocks at | Celebration line |
|---|---|---|
| Josh | 500 | 🎉 JOSH IS FULLY CHARGED. SO IS HIS VAPE. |
| Ross | 1,000 | 🎉 ROSS IS HERE. HE BROUGHT HIS OWN MUG. |
| Tanner | 1,500 | 🎉 TANNER HAS HYDRATED. TANNER IS READY. |

- Selection screen: locked walkers shown as "???" and a dark silhouette with "🔒 Reach 1,000 points"; drink hidden.
- Game over: a "New walker unlocked!" screen (silhouette turns into the walker, fanfare), then the usual card with a "Try <name> 🆕" button. Thresholds live in config.js.

## Fake ad breaks (built)
- Every 3rd game over (`CONFIG.ads.every`), a pixel-art "ad" appears before the game-over card, styled like a cheap mobile-game ad. "Skip ad" works after 3 seconds (`CONFIG.ads.skipAfter`). The ads play in a shuffled order: each one once per round, never the same twice in a row.

| Ad | Headline | Button → after pressing |
|---|---|---|
| The Victory (pub sign flips OPEN/SHUT) | GOOGLE SAYS OPEN. GOOGLE IS WRONG. | GET DIRECTIONS → SORRY, WE'RE SHUT |
| Community Canoe (chained, a duck sitting in it) | SENT TO THE GROUP CHAT 31 TIMES. BOOKED 0 TIMES. | BOOK NOW → MAYBE NEXT SUMMER |
| DUDE London (the black warehouse, drinks upstairs) | CRAZY SHIT. THAT WORKS. LIKE THIS GAME. | HIRE US → NOT NOW, WE'RE AT THE VICTORY (2nd press opens dude.it/london) |
| Hot Tub Time (floating sauna; Dave drops the towel, censored by a pixel mosaic, jumps in, surfaces wearing a cone/bag/duck) | MISSING THE HEATWAVE? 90°C ON A BOAT. 4°C IN THE CANAL. | BOOK A SESSION → FULLY BOOKED BY CONSULTANTS |
| Narrowboat for sale (£85,000 ONO; the boat keeps moving to a new mooring) | MOVE EVERY 14 DAYS. LIKE RENTING, BUT WET. | ENQUIRE NOW → YOUR TOILET IS NOW FULL |
| Soft Launch Run Club (matching neon kit, a couple holding hands drifts to the back, hearts instead of sweat) | 5K. 3 DATES. 0 PERSONAL BESTS. | JOIN THE CLUB → MATCHED WITH YOUR EX |

## Draft walker: David (designed, not playable yet)
- The real local: skinny older man, messy windswept light grey hair, dirty blue boiler suit unzipped at the collar, brown work boots. Drinks a pint of Guinness (new "pint" drink).
- Saved in `DRAFTS` in characters.js, hidden from the selection screen. Preview locally: `?debug`, then `debug.walker('david')`.
- To decide: add as a 7th walker or replace someone; free or unlock score (2,000 suggested); unlock line ("DAVID HAS CLOCKED OFF. THE PINT HAS NOT." / "DAVID WAS HERE BEFORE THE OAT MILK.").
