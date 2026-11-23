---
title: Music for a game, without a composer
date: 2026-11-26
description: Wardlight's day and night music is written as code and played with free orchestral samples. It isn't perfect and it doesn't replace a musician, but it got a one-person game from silence to something that carries a night.
image: /assets/img/seasons-1600.jpg
tags: music, audio, tools
---

For most of its development Wardlight had no music. In a game where you sit inside one village for forty minutes, the music decides how that time feels. The day is supposed to be a calm place to plan. The night is supposed to press on you. Without music, both felt the same, and the game felt smaller than it is.

I'm not a composer. This is how I got from silence to the music that ships on 3 December, and where it falls short.

## What didn't work

Licensed music was the first idea. The stock music library I looked at only licenses its tracks for games on its business plans, so that was out.

The second try was synthesised: loops built from oscillators in code. They were in key and in time, and they sounded like a phone from 2004. Rejected.

The third try played the same kind of loops with real recorded instruments, a harp up front. Better, but it sounded like a yoga class. The harp was too loud, the plucked strings sat on top of everything, and nothing was underneath.

## What did

The scores are Python. Each piece is a list of notes per instrument, with a tempo and a swell for each part, written out as an ordinary MIDI file. I wrote them together with Claude, the same AI assistant I build the game's code with, and judged every version by ear.

A render script then plays the MIDI with recorded samples:

- Strings, woodwinds, brass, harp and drums from the VS Chamber Orchestra 2 Community Edition, which is public domain.
- A soft piano from the Salamander Grand Piano, played quietly and filtered, so it sounds like felt.
- A choir and a pad from the GeneralUser GS sound font.

Raw samples alone were the yoga class. The difference came from treating the render like a mix:

- Real rooms. The reverb is measured from a church and a marble hall (from the OpenAIR library at the University of York), with the long hall only on the sustained beds.
- A bottom end. A plain sine sub and a contrabass sit under the roots, which the early loops never had.
- Percussion far back, soft and wet.
- The melody lower and thinner than I first wrote it, over a bed that never stops.
- A gentle EQ tilt, bus compression and a slow rise and fall in level, so a loop breathes instead of standing still.

To tune that, I recorded a few professionally produced tracks I liked and measured them next to my renders: loudness, how the energy spreads across the frequencies, how wide the stereo is. They were only ever a ruler. No melody or chord came from them, and none of it is in the game.

## How it sounds

The old wood by day, in D major at 88 beats a minute:

<figure class="clip"><figcaption>Witchwood, day</figcaption><audio controls preload="none" src="/assets/audio/witchwood-day.m4a"></audio></figure>

The same land by night, a march in low strings and choir:

<figure class="clip"><figcaption>Witchwood, night</figcaption><audio controls preload="none" src="/assets/audio/witchwood-night.m4a"></audio></figure>

Rosegarth is the elf's own garden, so her day is a minuet. Her night is the same minuet, spoiled:

<figure class="clip"><figcaption>Rosegarth, day</figcaption><audio controls preload="none" src="/assets/audio/rosegarth-day.m4a"></audio></figure>

And what plays when you hold the twelfth night:

<figure class="clip"><figcaption>Victory</figcaption><audio controls preload="none" src="/assets/audio/victory.m4a"></audio></figure>

## Inside the game

Every land has a day loop and a night loop, plus a short piece for winning and one for losing. Fourteen pieces in all, about 10 MB, because each loop is rendered once and stored as 64 kbit/s AAC. A file can't loop cleanly if its last notes are cut off, so each piece is rendered with sixteen extra seconds and that tail is folded back onto its start. When the loop repeats, the ringing notes and the reverb carry over as they would in a room.

The night music listens to the fight. The more pressure on the wall, the louder and brighter it plays, drums and brass hit on the beat, and a boss gets a motif of its own.

## Where it falls short

It isn't perfect, and I know where. A composer would write themes that come back across the lands and grow. Mine are pleasant, and few of them stick in your head. The samples play the notes they're given, with none of the small decisions a player makes in every bar. Some loops are better than others, and you can hear the seams if you listen for them.

It doesn't replace a musician, and if Wardlight does well enough, a real score is the first thing I'd pay for. As a way for one person to put a real orchestra under a game, it is far better than silence, and better than anything I expected to get out of a Python script.

---

Piano: Salamander Grand Piano V3 by Alexander Holm, CC BY 3.0. Orchestral samples: VS Chamber Orchestra 2 Community Edition by Versilian Studios (CC0). Choir and pads: GeneralUser GS by S. Christian Collins. Impulse responses: OpenAIR, University of York (CC BY 4.0).

Wardlight comes out on 3 December, [on the App Store](https://apps.apple.com/app/id6826542922).
