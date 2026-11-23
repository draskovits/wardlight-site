---
title: Two faces that talk without a voice
date: 2026-12-04
description: Wardlight's dwarf and Lady Vaelith are Rive figures whose mouths follow the written line through a small alphabet of 22 sounds. How the files are built, how a line becomes mouth shapes, and how the same files now play on this website.
image: /assets/blog/rive-lipsync/dwarf-and-vaelith.jpg
tags: animation, rive, story, website
---

Wardlight has two characters who speak to you. The dwarf is the village's old lampwright and your advisor, close to retirement. Lady Vaelith is the veiled elf who sends the Mist. Neither of them has a recorded voice. Their lines are text on a plate, and their mouths move along with that text as if they were saying it.

This post is about how those two figures are made and how their mouths know what to do.

![The dwarf and Vaelith, each in their own colours](/assets/blog/rive-lipsync/dwarf-and-vaelith.webp "The dwarf and Lady Vaelith as Rive figures, each on their own backdrop")

## Why Rive

For a long time the game had no third-party code at all. When I planned the intro on 4 November, I turned Rive down for exactly that reason and built the intro as a paper-cut shadow theatre instead. A week later I wanted the advisor to say the intro's five lines with a moving face, and on 11 November Rive became the game's first dependency.

Rive is a vector animation format with a runtime for iOS and the web. A `.riv` file holds the drawing, the animations and a state machine, and the app only sets a few values on it. Both figures share the same setup: an artboard of 600 by 760, a state machine called `Character`, and a view model with a text property called `Laut`, German for "sound". The app writes a sound into `Laut`, and the state machine moves the mouth to the shape for that sound. The figure breathes and blinks on its own layers, so it never stands still between lines.

## The dwarf, from an editor file

The dwarf started in the Rive editor. That file is exported to RML, Rive's markup, with the Rive command-line tool, and the CLI builds the `.riv` from it (`rive . --once`). The RML is about 7,800 lines, and I don't edit it by hand.

On 14 November I wanted both characters to look like they belong to the same game. A Python script, `restyle.py`, reads the exported RML and writes a new one. It turns every outline into one warm brown at the same line widths as Vaelith's, makes the gradients flat with one hard cel shadow per form, and mirrors his shading so the light comes from the upper right, as it does on her. It went through three passes that day. The first change was too timid to see, the second went so far that he stopped looking like himself, so the third brought his face back from the first and kept only the way of drawing he shares with Vaelith.

When the editor file changes, the script runs again, and the rig, the mouths and the state machine come through untouched.

## Vaelith, from a script

Vaelith has no editor file. She is a Python script of about 1,050 lines, `gen.py`, that describes her as vector paths and writes the RML for the CLI to build. It also writes an SVG preview of her and a sheet of every mouth, for a quick look between builds.

Her face can do more than his. Besides `Laut` she has four inputs:

| Input | What it does |
|---|---|
| `Stimmung` | Her mood: cool, mocking, angry or caught. Each one sets her eyes, brows, mouth angle and lean, and the state machine eases between them. |
| `Schleier` | How far the veil covers the scarred half of her face, 0 to 100. The mist at its hem moves with it. |
| `Licht` | A trigger. Light falls on her, she flinches and squints, and the gem on her circlet flares. |
| `Hintergrund` | Her dark backdrop, on or off, so she can stand on one of the game's own screens. |

Her idle motion is three loops on their own layers: a breath every 4.5 seconds, where the body rises and the head follows a beat later, a blink cycle of 5.3 seconds with one single blink and one double, and a slow drift.

## One mouth, many poses

In Vaelith's file the mouth is one set of shapes: the lips, the inside, the teeth and the tongue. Each mouth pose is a one-frame animation that keys the positions of those shapes' points. The mouth layer of the state machine has a transition to each pose, and each transition fires when `Laut` equals its sound. Because every pose moves the same points, Rive blends from one mouth to the next instead of swapping drawings. Hers blend in 70 milliseconds, the dwarf's in 200.

The poses come from a handful of numbers per mouth in `gen.py`: half width, opening, corner lift, a smirk on one corner, rounding, lip thickness, how much teeth show, and how high the tongue sits. On 16 November the mouths moved too little, so each one now opens further than drawn: vowels by 1.5 times their offset from the resting mouth, consonants by 1.3.

![Vaelith's thirteen mouths](/assets/blog/rive-lipsync/vaelith-mouths.webp "Vaelith's thirteen mouths, drawn from the numbers in gen.py")

## 22 sounds

The alphabet the mouths understand has 22 values: a space for the closed mouth, then `l th p b m s c z sh ch f w i ah ee uh eh oh oo u r`. The two figures map them onto their own sets of mouths. The dwarf has ten, named in his editor file by the sounds they cover. Vaelith has thirteen.

| Sounds | The dwarf's mouth | Vaelith's mouth |
|---|---|---|
| (space) | closed | rest |
| m, b, p | m, b, p | mbp |
| l, th | L, th | th |
| s, c, z | s, c, z, sh, ch | s |
| sh, ch | s, c, z, sh, ch | sh |
| f | f, w | f |
| w | f, w | oo |
| i | i | ee |
| ee | ee, uh, eh | ee |
| eh | ee, uh, eh | eh |
| uh | ee, uh, eh | uh |
| ah | ah | ah |
| oh | oh | oh |
| oo, u | oo, u, w, r | oo |
| r | oo, u, w, r | r |

## From a line of text to a mouth

There is no audio and no pronunciation dictionary. The part that reads a line is `SpokenLine`, a Swift type in the game's core package, and it works from spelling.

First it brings the text to Latin letters with the system's transliteration, so Chinese becomes pinyin, Japanese romaji, and Korean and Russian romanised letters. Then it reads each word with spelling rules: a common table, plus a small table per language, from English and German to Turkish and pinyin. The longest rule that fits wins. Some rules only apply at the start or end of a word, and a few whole English words have their own entry, such as "the", "you", "light" and "night". A silent final e in English says nothing, and German "sch" is a single sound.

Some letters get a mouth that is close enough. d, t and n all use the tongue-behind-the-teeth mouth. k, g and h have no mouth of their own, so the mouth keeps its last shape for a moment. A doubled consonant is said once, and a numeral counts as one beat.

Every sound gets a duration: 115 milliseconds for a vowel, 75 for a consonant, 45 for a held letter. A space adds 30, a comma 240 and the end of a sentence 420. Commas and stops also close the mouth. The result is a list of cues, each a sound and a start time, plus the moment every character of the text is spoken. While a line plays, the app looks up the cue for the current time up to 30 times a second and writes it into `Laut`.

That is only loosely right, and for a mouth without a voice it doesn't need to be more.

## The text runs ahead

Those character times also drive the text. In the first version the line wrote itself at the pace of the mouth, and in a playtest on 17 November the text came in too slowly. Now the text writes itself 2.5 times faster than the mouth speaks it, so you have read the line while the portrait is still saying it. A tap finishes the line at once. Lines in the story scenes are also said about 40 % faster than the dwarf's own pace.

With Reduce Motion turned on, the line appears whole and the mouth stays shut.

## On this website

The story section on this site uses the same two files as the game. `dwarf-talking.riv` and `vaelith.riv` in the site's assets are byte for byte the ones in the app, 102,800 and 88,166 bytes.

On the web they run on Rive's canvas runtime. The script loads them only when the story section comes close, pauses them while they are off screen, and sets the same properties as the app: `Laut` for the mouth, and for Vaelith `Stimmung` and `Licht`. The mouth cues come from a small TypeScript copy of the `SpokenLine` rules. It is simpler than the Swift one, with a few English and German letter pairs instead of the full tables, but it uses the same durations for vowels, consonants, commas and stops. If the runtime fails to load, the still pictures of the two figures underneath stay where they are.

Wardlight is out [on the App Store](https://apps.apple.com/app/id6826542922).
