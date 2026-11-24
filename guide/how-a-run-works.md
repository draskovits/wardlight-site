---
title: How a run works
description: The rules of a Wardlight run. Days and nights, seasons, light, supplies, villagers, mana, Knowledge, building trees, prices and how a run ends.
order: 1
updated: 2026-11-23
---
A run is 12 nights in 4 seasons. Each night comes after an untimed day of building. You win (the Rekindling) if the Wardlight still burns at the dawn after the last night; you lose when the Wardlight breaks. A run takes about 35–41 minutes.

## Days and nights

- **Dawn:** buildings the Blight broke stand again (only the Wardlight keeps its wounds), the dawn report shows what happened, and the village is paid: supplies from every staffed workplace that stood through the night, Knowledge from libraries and ranks. Mana is not paid at dawn; what is left in the pool carries over. The run is saved at every dawn; quitting at night resumes at the last dawn.
- **The day has no clock.** Build, grow buildings on their cards, learn tree steps with Knowledge and raise the Wardlight. Nothing ticks by day.
- **Tonight:** Call the night opens the Tonight screen: the Almanac (tonight's sides, each with why it comes and its Blight by kind and count, the surges, the weather and the Glow), the Dares and the mana ledger. Its button starts dusk (5 s), then the night.
- **The night flows by itself** in real time (2× speed and pause are there). The village fights on its own: towers, traps, walls, wards, summons and the Wardlight's answer. You cast spells, call the Rally, fire flares, turn prisms, Overcharge or Seal wards, and may call the next surge early.

### Surges

A night is a few **surges** of 10 s each, with a lull between them; the last surge is the strongest. The next surge comes by itself when its lull is over; **Call the surge** brings it early.

| Nights | Surges | Lull |
|---|---|---|
| 1–3 | 2 | 28 s |
| 4–9 | 3 | 26 s |
| 10–12 | 4 | 24 s |

How a night's Blight is split over its surges: 2 surges: 40 % / 60 %; 3 surges: 25 % / 35 % / 40 %; 4 surges: 15 % / 20 % / 25 % / 40 %.

- A surge's Blight leave the Mist within its 10 s: 25 % as an even trickle, the rest as a swell that peaks 60 % of the way in, at most 150 a second.
- **The drain:** a surge that is due waits, up to 10 s, while more than 25 % of the last surge is still walking.
- At most 2,500 Blight are alive on the field at once; the rest wait in the Mist and come as others die. The night still sends all of its Blight.
- The night ends when the last surge is cleared, at the latest 120 s after the last Blight left the Mist.

**Packs by kind:** on nights 1–6 each kind comes as its own pack, the packs 3 s apart, each from its own stretch (45 %) of the side; on nights 7–9 each kind comes as its own pack, the packs 1 s apart, each from its own stretch (80 %) of the side; on nights 10–12 every kind is mixed through the surge. The newest kind of the run comes first and the Crawlers last.

### Sides

The map is cut into 6 sides. The night's Blight comes from the open sides with the strongest **pull**: your light (Glow), the noise of loud buildings, a stirring nest, the thinnest defence and a seeded wander. The first night follows the light alone. Each side in the Almanac shows its reason.

| Nights | Sides | Share of the night's Blight |
|---|---|---|
| 1–4 | 1 | 100 % |
| 5–8 | 2 | 65 % / 35 % |
| 9–11 | 3 | 50 % / 30 % / 20 % |
| 12 | 6 | 30 % / 20 % / 15 % / 15 % / 10 % / 10 % |

Some lands change this (Ashwood brings more sides sooner; Stonehold has only one front): see [the lands](/guide/lands/).

## Light and the Mist

Light is a field from 0 to 1 over the map. In **Sheltered** light (0.6 or more) everything works and the Blight walks at 60 % of its speed. At the **edge** (0.3–0.6) everything works and the Blight gathers between surges. Below 0.3 is the **Mist**: nothing can be built there and towers can't see the Blight.

- You build only in light of 0.3 or more, on a 2 m grid. Traps (spike pits, trenches, caltrops) may go up to 8 m past the light's edge.
- **Sources:** the Wardlight (11 m, +2 m a level), wards (9 m, growing 0.5 m each dawn they were fed with mana, up to 4 m more), lanterns (3 m), prisms (a ward's light thrown 24 m as a cone you turn), flares (8 m for 15 s where you aim, within 40 m).
- **Sight:** towers shoot only Blight in light of 0.3 or more, or Revealed. Every ward Reveals the Blight up to 2 m past its light. Fog shows only Sheltered light. Summons and rallied villagers fight in the Mist too.
- An unpaid ward burns dim: it lights half its radius until the mana pool pays it.

### Glow

**Glow** measures how bright your village is: the lit area in m² ÷ 12, plus 0.25 for every building that counts for the village's size. A night's Blight is its base budget × (your Glow ÷ the night's par Glow) to the power 0.35 below par and 0.5 above it, kept between ×0.9 and ×2. Build big and you defend big. Raising the Wardlight never raises the night's Blight: for Glow its light counts at its level-I radius. The par Glow by night: 30, 33, 37, 42, 48, 55, 62, 70, 78, 86, 95, 105.

## Supplies

- **Supplies** build everything: buildings, their growth on their cards and the Wardlight's levels.
- **Dawn pay:** every workplace that stood through the night and has its villagers pays its amount (see [village buildings](/guide/village-buildings/)). A ruined workplace pays nothing that dawn. The Wardlight itself pays 3 a dawn.
- **Tonight's bounty:** each night has a fixed bounty of supplies, paid as its Blight falls (each Blight its share of the night's Blight points; a night slain whole pays it whole). By night: 9, 12, 20, 30, 30, 40, 45, 60, 70, 80, 100, 100. It is multiplied by your Glow tier: ×1 below 0.8× par, ×1.1 from 0.8× par, ×1.25 from 1.25× par, ×1.4 from 1.6× par, and raised by bounty talents (Spoils, Skinners, Stakes, Bright crystal).
- **The store** holds 500 supplies; pay above that is lost.
- **Winter firewood:** from the harvest dawn on, every house burns 1 supply a dawn; every woodcutter brings 1 more at each winter dawn.
- **Outside workers:** a woodcutter pays 1.5 more a dawn when its woodcutters can walk out to the forest, and a hunting lodge pays only 25 % while walls lock its hunters in, so leave a gate.

### Prices, moving and tearing down

- Prices rise by season: ×1 in spring, ×1.2 in summer, ×1.5 in autumn, ×2 in winter, and by 5 % for every copy already standing (each further building of a tree, or each building that took the same growth step; walls, trenches and caltrops never count). The build bar always shows today's price.
- Moving or tearing a building down is free on the day it was built (all of its cost back). After that, tearing down gives back 50 % of what it cost at its day's price, and moving costs 25 %. The Wardlight never moves.

## Villagers

The Wardlight brings 4 villagers and every house 4 (a longhouse 8); they move in at the first dawn. Workplaces need 1–3 villagers each and pay nothing without them. Towers, traps, walls and lights need none. Villagers of ⚔ buildings (barracks, axemen camp, rangers, netcasters, wardens) keep working by day and answer the Rally at night. In winter, a workplace that pays nothing that season (a field) frees its villagers for other work.

## Mana

Mana is the night's currency. Early nights have mana to spare; from about night 9 the mage towers, keystones and walls want more than the village makes, and where it goes is the night's decision.

- **The pool** holds 120 (some talents and heirlooms raise it). A run starts with 30 mana and 30 supplies.
- **Made at night:** the Wardlight 2 a second, +0.25 a level; shrines bless the houses near them and each blessed house makes mana all night; the Blight you slay gives 0.4 mana for each of its Blight points, up to 200 a night.
- **Spent in this order every second:** (1) the wards' light, 0.2 a second each (Seal a ward and it draws nothing); (2) the keystones' tithe, 0.5 a second for each building a boost keystone boosts; (3) mending walls: every 3 s a lit ward heals the most hurt wall in its light 60 health at 0.1 mana a health, while the pool holds more than 60; (4) the mage towers, each cast.
- **Spells cost no mana**, only their cooldown. An empty pool silences the mage towers.
- **Overcharge** (a battle-light ward's talent) pours 3 mana a second into a ward for more light.

## Knowledge and the building trees

**Knowledge** opens tree steps. It comes from kills (20 Knowledge a rank; rank k comes at 20 × k^2.55 Blight points slain in total, paid at dawn), libraries (5 a dawn each, a scriptorium 8), Dares and boss rewards. It never expires and steps can't be refunded.

| Rank | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Blight points slain | 20 | 117 | 329 | 686 | 1,212 | 1,929 | 2,858 | 4,017 | 5,424 | 7,096 | 9,049 | 11,296 |

Every building has a tree of the same shape. Knowledge opens a step; supplies build the building or grow it on its card. Talents cost no supplies, and once learned they work on every building of that kind, its specialised ones too.

| Step | Knowledge | What it needs and does |
|---|---|---|
| Unlock | 10 (5 for a land's own building) | Puts the building on the build bar. The starting kit's trees are open from the start |
| 3 base talents | 10 each | Buy at most 2 of the 3; the third locks for the run |
| Checkpoint | — | 2 base talents and Wardlight II |
| Specialisation (1 of 2) | 20; 40 for the second | Lets a built Level 2 building grow into it in place; it is never on the build bar |
| 3 specialisation talents | 20 each | At most 2 of the 3 |
| Checkpoint | — | 2 of its talents and Wardlight III |
| Keystone | 45 | One per village: one specialised building grows into it |
| 3 keystone talents | 30 each | At most 2 of the 3 |

- **Late trees** (the four mage towers): the unlock needs Wardlight II, the checkpoints III and IV.
- **Walls** are one long path instead of two specialisations: palisade → timber wall → stone wall → the Bastion.
- **Kindled trees:** each run kindles 2 trees at random; their base talents cost 50 % of the Knowledge.
- **Growing in place:** on a building's card, Level 2 (after its tree's first checkpoint) costs 50 % of the building's price and makes it do 25 % more. Growing a Level 2 building into a learned specialisation, or a specialised one into the keystone, costs the difference to the new building's price (at least 50 % of its own). **Grow all** grows every building of the same kind that can take the step, as far as the supplies go.
- **Keystones** come in two kinds. A **boost** keystone lifts every other building of its tree while it stands: in a defence, magic or light tree ×2.5 damage (the fireball and lightning trees ×1.15 tempo instead) for a tithe of 0.5 mana a second for each boosted building at night; a village keystone's boost (more pay, more Knowledge or more people at the Rally) costs no tithe. A **global** keystone has its own effect only.

The trees in full: [village](/guide/village-buildings/), [defence](/guide/defence-buildings/), [magic](/guide/magic-buildings/) and [light](/guide/light-buildings/) buildings.

## Raising the Wardlight

The Wardlight has four levels. You raise it for supplies once the village has enough villagers, buildings and lights standing. Buildings count everything but the Wardlight, walls, traps and temporary ones; lights count every ward, lantern, prism and flare post, with their specialisations and keystones.

| Level | Supplies | Villagers | Buildings | Lights | Gives |
|---|---|---|---|---|---|
| I | — | — | — | — | 11 m light, 1,000 health, 2 mana a second; a spell offer |
| II | 20 | 20 | 16 | 3 | +2 m light (13 m); +250 health (1,250); +0.25 mana a second (2.25); the trees' first checkpoints; the mage towers |
| III | 40 | 34 | 38 | 7 | +2 m light (15 m); +250 health (1,500); +0.25 mana a second (2.5); a spell offer; the trees' second checkpoints (the mage towers' first) |
| IV | 70 | 46 | 57 | 11 | +2 m light (17 m); +250 health (1,750); +0.25 mana a second (2.75); the mage towers' second checkpoints; the Attunement |

More in [the Wardlight](/guide/the-wardlight/).

## Night actions

- **Spells:** tap a spell, then the ground. Two slots; see [the Wardlight](/guide/the-wardlight/).
- **Rally:** the villagers of every ⚔ building run to where you tap and fight there for 20 s, then walk home. A banner stands there meanwhile: towers and mage towers within 10 m fire ×1.5 as fast. 2 charges, full at dusk; a spent one comes back in 40 s. Fighters grow with the Wardlight: ×1, ×1.5, ×2.5, ×4 at levels I–IV. The wounded miss the next night.
- **Flares:** a flare post fires 2 flares a night, 8 m of light for 15 s where you tap within 40 m.
- **Turn a prism:** its cone points where you drag, any time, at night too.
- **Seal a ward:** pull its light back. It draws no mana, the Blight loses interest, and the towers there go blind. Lift it any time.
- **Overcharge** (a talent of the battle-light ward): more light and a stronger buff for mana a second.
- **Call the surge:** bring the next surge early.

## Dares

Every day, the first included, Tonight offers Dares: a harder night for a reward paid at the next dawn.

| Dare | Does | Reward |
|---|---|---|
| Swarm | Brings 30 % more Blight tonight. | 10 Knowledge, 8 supplies |
| Brutes | Sends 2 more Brutes tonight. | 10 Knowledge, 10 supplies |
| Hungry wards | Doubles the mana your wards draw tonight. | 10 Knowledge, 6 supplies |

## Bosses and elites

Nights 4 and 8 bring a boss, and night 12 the land's final boss. Between them an earlier boss comes back as an elite. Each is named the dawn before. See [the Blight](/guide/the-blight/).

## Seasons and weather

A season is 3 nights on the Witchwood; the other lands move nights between seasons but keep 12 in all ([the lands](/guide/lands/)). The **harvest dawn** is the dawn after autumn's last night. Each season has a rule, and at its first dawn you choose one of two boons.

| Season | Rule |
|---|---|
| Spring (rain) | Light reaches 10 % less far at night; fields pay +25 %; the Blight walks 15 % slower in the mud |
| Summer (heat) | Burning on the Blight lasts 50 % longer; Wisps take a 50 % bigger share of the night when the run's Wisps come, else the night's Blight is ×1.1 |
| Autumn (fog nights) | Every tower reaches 15 % less far at night |
| Winter (cold) | The Blight walks 10 % slower but has +2 armour; the water freezes at winter's first dusk |

**The boons** (two are offered, from different categories, picked to fit what you have built):

| Boon | Gives |
|---|---|
| Good year | Workplaces pay ×1.2 after each night of the season |
| Full barns | +12 supplies for each night of the season, at once |
| Timber season | +2 supplies a woodcutter after each night (2+ woodcutters) |
| The land's boon | The land's own building pays ×1.4 after each night |
| Stout walls | Walls' health ×1.3 this season |
| Mending days | Every building and wall back to full health after each night |
| Heartstone | The Wardlight healed in full at once, its health ×1.25 this season |
| Watchfires | Towers reach ×1.15 at night |
| Whetstones | Watchtowers, mangonels and ballistas deal ×1.2 damage |
| Storm season | The Blight is Wet all night, as in rain (with a tower that uses Wet) |
| Bitter frost (winter) | +25 % Shatter and Flash freeze chance |
| Dry tinder (summer) | +25 % Ignite chance |
| Clear nights | Light ×1.15 at night |
| Tended wards | Wards mend ×2 as fast |
| Tales of daring | Dares give ×1.5 Knowledge |
| Long evenings | +2 Knowledge a library after each night |
| Scholar's chest | +4 Knowledge for each night of the season, at once |
| Ley tide | The night's mana flow ×1.25 |
| Quick charms | Spell cooldowns ×0.8 |

**Weather** is rolled for each season from its chances (some lands lean differently) and shown in the Almanac. The default chances:

| Season | Weather chances |
|---|---|
| Spring | clear 40 %, rain 40 %, thaw 20 % |
| Summer | clear 60 %, wind 40 % |
| Autumn | clear 20 %, wind 45 %, rain 10 %, fog 25 % |
| Winter | clear 40 %, hard frost 40 %, thaw 20 % |

- **Rain:** Burning lasts ×0.5 as long and oil trenches don't ignite; every Blight is Wet.
- **Wind:** fire spreads further downwind; arrows lose 30 % of their range upwind.
- **Fog:** only Sheltered light or a Reveal shows the Blight.
- **Thaw:** the Blight walks at ×0.8 speed in the mud; in winter the ice breaks halfway through the season.
- **The ice:** every land's water freezes at winter's first dusk, so the Blight crosses it; walls and traps can stand on the ice by day and raise the ground under them to dry land for good.

## How a run ends

- **Rekindled (a win):** the Wardlight still burns at the dawn after the last night.
- **Fallen:** the Wardlight goes out.
- **Let the light go:** end the run from the pause menu. It counts as fallen and keeps every Echo earned.
- **Score:** 1,000 a night held, 50 for each building standing at the end (not walls or ruins), up to 3,000 for the Wardlight's health, 10 for each Blight in the last night's best combo, all × the Darkness' score bonus.
- Every run earns Echoes for the Memory: see [the Memory and difficulty](/guide/memory-and-difficulty/).
