---
title: The ledger, or how Wardlight is balanced
date: 2026-11-23
description: Bots playing whole runs told me too little, too slowly. Wardlight is now balanced against a target curve, a ledger that prices everything in damage, and a small maths model of a good player.
image: /assets/blog/ledger/pressure-curve.png
tags: balance, design, tools
---

Wardlight is a year of twelve nights. Each day you build, each night the Blight comes, and each night is bigger than the one before. Balancing it comes down to one question per night: how close does it come to breaking a village that played well?

For the first weeks I answered that with bots. Then I stopped.

## Two weeks of reacting

The simulation is deterministic and runs headless on a Mac, so early on I had bots that play whole runs, each in one style. `grow` is the par village: economy first, plain towers, then mage towers, then the Attunement. `nomage` never builds a mage tower. On top sat the red lines, rules like "the par village holds at least 7 of 10 runs on the first land" or "a village of plain towers holds at most 1 of 10", measured at 200 Echoes, the meta currency, about three or four runs' worth.

In two weeks I made about 14 balance passes, and the base size of each night (`baseBP` in the content files) was rewritten by hand about 8 times. A full red line check took 30 to 40 minutes and was noisy. And when the bots fell, I often couldn't tell whether the night was too strong or the bot had played badly.

After a large rework in November every bot fell on nights 4 to 8, on every land. Before touching a number I went through the bots and found misplays no player would make: walls eating 60 to 95 % of days 4 to 8, the first shrine on day 10, and a keystone learned so late that the par bot never attuned in 6 of 6 runs. I had been tuning the game to the bots' mistakes.

## One unit: damage

The ledger is a report, `wardlight-sim --ledger`. It reads the content files and the rule code, plays no runs, and prints in seconds. It puts everything in one unit, damage:

- Threat is each night's effective health, the health of all its Blight after armour.
- Cost is what each tower, at each step of its tree, pays in supplies per point of sustained damage a second. Mana is priced in supplies at what a shrine costs. Knowledge, which buys talents, is priced at what a library costs you in supplies and in villagers taken off work: 0.67 supplies per Knowledge.
- Pressure is a night's effective health divided by what the par village really deals during the night.

The first reading was clear at once. Nights 5 and 6 sat at about a third of the break point. Night 7 jumped ×3.8, because Bloaters arrived and the Crawlers' health went up ×4 at once. Nights 11 and 12 got easier, the reverse of a finale. Mage towers gave 2 to 3 times the curve's damage per supply.

## The target curve

With pressure as a number, I could decide what each night should feel like before setting any health value. This is the curve I picked on 6 November, as a share of the point where a well-played village breaks:

| Night | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Target | 25 % | 35 % | 55 % | 45 % | 60 % | 75 % | 65 % | 80 % | 90 % | 70 % | 85 % | 95 % |

One tooth per season of three nights: each season ends harder than it began, and the next one gives a little back. Night 9 is the hardest before the Attunement, night 10 is the relief the Attunement brings, then it climbs to the end.

![The target pressure curve over nights 1 to 12, with a measured reading from 9 November](/assets/blog/ledger/pressure-curve.png)

The dashed line is a reading from 9 November, ten par runs on the Witchwood. Night 1 always reads high because the Wardlight's own damage isn't priced. Night 12 reads low because its danger isn't damage per second: Blight from every side and a boss. Where 100 % lies came from the bots: on the first land they fell where the ledger read a pressure of 1.3 to 1.7, which put the break point at about 1.8.

## A perfect player, in maths

The bots were still the judge, and still slow. On 15 November I replaced them as the reference with a model. `wardlight-sim --perfect` plays the year as a budget, one day at a time. The dawn pays out. The Wardlight is raised if that doesn't cost tonight. Then it buys the tower with the fewest supplies per damage, again and again, until the night's need is met, with mana sources as the towers need them. The rest goes into whichever workplace returns most over the days left. A full reading takes about 22 seconds.

A perfect player is an upper bound, so the model also plays an "80 % player", whose towers deal 80 % of their damage. The 80 % is a placeholder; no data places it yet. Both are read at 0, 200 and 400 Echoes, the Memory a first, a regular and a seasoned player brings.

The first reading was blunt. From night 3 on, the model had 2 to 5 times the slack the target wanted. From night 5, one day's income bought more than the whole night needed: mage towers cost only 0.55 to 0.77 supplies per point of damage, and mana a one-off 3.1 supplies per mana a second. The bots agreed. With an empty Memory the par bot had held 10 of 10 on the first land, against a target of at most 3.

So the first fixes were prices. Mana got dearer. The ledger got a tower parity table: each tower's whole cost per damage divided by the median, with a band of ±25 %. The 11 base mage towers had read between 0.41 and 1.0; after changing their mana per cast (the fireball tower 3 to 3.5, for one) they sit between 0.76 and 1.20. Then the model derived each night's size, the factor that puts the 80 % player at 200 Echoes on the target. Nights 2 to 12 grew by ×1.06 to ×2.8.

## Calibrating it

The model leaves out spells, the Rally, walls and the Wardlight's damage, so it will be wrong. To see how wrong, I ran the par bot with every night ×1, 1.5, 2, 2.5 and 3 larger, 8 seeds each. At 0 Echoes it held 8, 5, 3, 1 and 3 of 8.

The raw model broke at the same ×2, on the same nights 8 to 10. It read nights 5 to 7 about 15 % too hard, since spells deal 12 to 24 % of the damage there, and nights 10 to 12 about 1.7 times too easy. It now carries a correction per night, ×1.15 on nights 5 to 7 and ×0.6 on 10 to 12, and with it the 80 % player and the bot both fall on night 8 at ×2. The late nights at 200 Echoes still fit less well.

On 19 November I stopped using the red lines as a gate. They took long to run and still didn't represent how people play.

## Human runs

Every run saves the village as it stood before each night, and that history can be shared as a `.wardlight` file. `wardlight-sim --history FILE --night N` plays night N headless from that exact village, and checks the file's content hash so I know whether it is replaying under the numbers it was played with.

Playtests decide feel, and feel changes a target before it changes a number. After one playtest in October the game was far too easy: I ended the year with six keystone buildings and never needed a wall. That became targets: the difficulty sits before the Attunement, walls matter, and a strong player affords two or three keystones.

## The Darkness ladder

The Darkness is the difficulty setting. Through the ledger, its first version turned out never harder than no Darkness at all, ×0.90 to ×0.94: its higher levels swapped Crawlers for specialists, who carry less health per point of budget than late, armoured Crawlers.

I rebuilt it in steps of about ×1.24 pressure. Then I played it, found it too hard, and moved the ladder down two steps. The year everything is tuned at is now level 2, Half Moon, and the levels change the economy too:

| Level | Blight health | Night size | Workplace pay | Extra Echoes |
|---|---|---|---|---|
| 0 Clear night | ×0.8 | ×0.85 | ×1.2 | none |
| 1 Waning Moon | ×0.9 | ×0.92 | ×1.1 | +5 % |
| 2 Half Moon | ×1 | ×1 | ×1 | +10 % |
| 3 Crescent | ×1.17 | ×1.12 | ×0.95 | +25 % |
| 4 New Moon | ×1.39 | ×1.27 | ×0.9 | +45 % |
| 5 Eclipse | ×1.66 | ×1.44 | ×0.85 | +70 % |

From Half Moon up, each level adds one hardship to the year, like Thick Mist or Lean Years. Levels 3 to 5 are the old 1 to 3, read at ×1.24, ×1.54 and ×1.90 the threat. On the old level 3 a bot with the whole Memory held 15 of 20, against 10 of 20 for the par village with no Darkness, which is within noise. The top of the ladder asks a veteran for about what the plain year asks of everyone else.

## What I took from it

If you balance a game alone, write down what each night should feel like as a number first, and put every cost and threat in the same unit. Keep a model you can run in seconds as the reference and let the slow runs calibrate it. Check your bots before you believe them.

Wardlight comes out on 3 December, [on the App Store](https://apps.apple.com/app/id6826542922).
