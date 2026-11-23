---
title: The sound of a night
date: 2026-12-15
description: Most of Wardlight's sound effects are generated in code when the game starts, and the rest are recordings of a few kilobytes each. How the effects, the ambience and the horde fit into a small app, and what I had to fix along the way.
image: /assets/shots/night-horde-at-wall-2000.webp
tags: audio, sound, tools
---

A late night in Wardlight has a couple of thousand creatures on the map, towers firing several times a second, spells, falling buildings and a boss. Every one of those things wants a sound. Played honestly, that is noise, and on a phone speaker it's noise without any bass.

This post is about the effects, the ambience and the crowd. The music has [its own post](/blog/music-without-a-composer/).

## Sounds made of code

The first version of the sound had no audio files at all. Every effect is a small program: a plucked string for a bow, a wooden resonator for a blow on a palisade, filtered noise and crackle for fire, a brass horn built from a saw wave, a choir from formant filters. The game renders all of them at start-up, in parallel, and keeps them in memory. When I built it, that was 36 sounds in 57 variants, rendered in about 16 milliseconds on a Mac.

Each family has its own palette. The siege engines creak and thump, and the stone lands a moment later, delayed by its flight. The interface clicks are soft wooden ticks, never a beep. Later passes gave each spell its own voice, shaped like what it does: Burst blasts, Lance charges and pierces, Hold stops time. Everything tonal is in D, the key the music is in too.

Since they are code, these sounds add nothing to the app's size.

## Two thousand creatures at once

The engine has a fixed pool of voices, and every sound has a minimum gap between plays, a cap on how many copies may ring at once, and a priority. A horn can take a voice from an arrow, never the other way round.

The game collects each frame's events and plays each sound once, at the level and position of its loudest instance, panned by the side of the screen and quieter outside the view. Deaths are one sound per frame, and a big batch plays up to 2.5 semitones higher, so a mass kill sounds like a reward.

Every play also gets a random nudge in pitch, up to 120 cents for a blow on wood, so a hundred arrows don't sound like one sample. When a big sound plays (a spell, the attack horn, a boss), the small combat under it drops by 45 % and comes back over half a second.

## The phone speaker

In early November I measured the whole bank the way a phone speaker hears it, with everything under 250 Hz cut away. The booms lost 7 to 15 dB. Lightning had 99 % of its energy under 250 Hz, and the knock that tells you a placement isn't allowed was close to silent.

The fix drives the low end into harmonics between 250 and 900 Hz, which the speaker can play, and trims the sub. On a phone that gave the heavy sounds 4 to 9 dB back. I left it off the mangonel, the stones and the fire, which carry their own mids and only lost level from it.

## Ambience from real recordings

The first ambience beds were synthesised too. After a playtest I called them what they were, a high hiss over white noise. The effects and the single animal calls were fine, so only the beds went.

They are now public domain (CC0) field recordings from freesound.org, each licence checked on its page. A script cuts 45 seconds from each, crossfades a 4-second tail over the head so it loops without a seam, filters it and encodes it as 64 kbit/s AAC. Witchwood, the Fenlands, the Highlands and Ashwood each have a day pool and a night pool, and the game draws a bed from the right one at every dawn and dusk.

Some rules came from listening. Recordings of wind alone sounded like noise, so the beds are still ones: quiet woods, far crows, lapping water. Nothing chirps at night; the forest night is low-passed at 3 kHz to take out an insect band at 8 to 10 kHz. In winter, the beds with birds, insects or frogs keep quiet.

Over the bed, single calls still come from the synthesiser: an owl, a far wolf, a twig snapping. One plays every 40 to 90 seconds, and now and then a bird or owl is answered from the other side.

One of the Fenlands' day beds. In the game it sits well under the music, so on its own it is quiet:

<figure class="clip"><figcaption>Fenlands, a day bed (marsh birds)</figcaption><audio controls preload="none" src="/assets/blog/sound-design/fenlands-day-bed.m4a"></audio></figure>

## Loudness

Once the music came in, the ambience was far too loud next to it. The built beds ranged from −14 to −40 LUFS, and the bird beds sat about 10 dB over the day music.

A second script now checks every encoded bed: −24 LUFS integrated, give or take 1, a loudness range of at most 12 LU so a single bird call can't jump out, and a true peak under −1.5 dBTP. A bed that misses goes through a compressor, a gain and a limiter, run twice round the loop so the seam stays clean. In the game the beds play about 14 dB under the music. The quietest bed, distant embers at night, needed 16 dB of gain.

The effects run through a compressor and a peak limiter on their own bus. The music skips both, so a big fight doesn't pump it.

## A few sounds that are recordings

Placing a building, upgrading it, tearing it down, a building falling, a boss arriving and the horn at the start of an attack are sampled, made the way the music is: CC0 recordings of wood and stone from freesound, under orchestral samples from the VS Chamber Orchestra 2 Community Edition, in the same church and hall the music uses. Placing a building is a wooden thud, a low log drum tuned to D and two harp notes. One layer is generated, a 46 Hz sine thump under a falling building, for weight.

The attack horn is a real viking horn in D, played an octave down over a war drum, a bass drum and timpani, with tuba and trombone under it:

<figure class="clip"><figcaption>The attack horn</figcaption><audio controls preload="none" src="/assets/blog/sound-design/attack-horn.m4a"></audio></figure>

A falling building can't sound again for 3 seconds. When three fall inside that time, a longer collapse plays once:

<figure class="clip"><figcaption>A line of buildings falling</figcaption><audio controls preload="none" src="/assets/blog/sound-design/line-falls.m4a"></audio></figure>

These are mono, 32 kHz, 56 kbit/s, between 10 and 48 KB each. The script renders two takes of each and I pick one. At first both shipped, about 210 KB nobody heard, so now only the chosen take goes into the app.

## The horde

For a long time the horde was silent. Thousands of creatures pressed against the wall, and the only sounds were the towers hitting them.

The horde is now two mono loops, a thin one of 11 seconds and a dense one of 13, 105 KB together: ghost moans, wails and monster grunts from four CC0 recordings, repitched and some reversed, with claves and a log drum as clacking. I picked it by ear from demos over four rounds. Anything with a pitch went (a choir, a string tremolo), so did a rattle and a scraped gong. The clacking stayed.

<figure class="clip"><figcaption>The horde, dense</figcaption><audio controls preload="none" src="/assets/blog/sound-design/horde-dense.m4a"></audio></figure>

The game counts the creatures attacking or standing inside a ward's light. Under about 3 there is no horde. The thin loop rises alone up to 16, then the dense one takes over until it is full at 80, mixed by power so the sum never dips in the crossfade. The bed pans toward the near creatures and ducks under big moments with the rest of the combat. At 3 LU under the night music's peak I didn't notice it, so it plays about 5 LU over.

The same count drives the night music, which [the music post](/blog/music-without-a-composer/) covers.

## Staying small

The sampled effects and the horde together are 456 KB in the app, and the ambience beds about 5 MB. The pass that added the horde, the music's drum and brass hits, the Attunement's sound and the collapse grew the effects folder by 4 KB, because dropping the unused takes paid for nearly all of it. The sound engine also pauses when nothing can be heard, so a quiet day doesn't cost battery.

Some things don't have their own sound yet. A few spells borrow another spell's voice, and the creatures have no calls by kind. Both are on the list.

---

Recordings: CC0 field recordings and effects from freesound.org (the authors are named in the game's credits, in the iOS Settings app). Orchestral samples: VS Chamber Orchestra 2 Community Edition by Versilian Studios (CC0). Choir and celesta: GeneralUser GS by S. Christian Collins. Impulse responses: OpenAIR, University of York (CC BY 4.0).

Wardlight is out [on the App Store](https://apps.apple.com/app/id6826542922).
