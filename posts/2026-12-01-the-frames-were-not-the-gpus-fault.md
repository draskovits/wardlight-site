---
title: The frames I lost were not the GPU's fault
date: 2026-12-01
description: Wardlight dropped a quarter of its frames on late nights, with the GPU well inside its budget. The cause was the main thread, a game tick, and a translated error message built eight times a second.
image: /assets/img/horde-1600.jpg
tags: performance, metal, swift, swiftui
---

Wardlight's late nights put a couple of thousand creatures on screen, inside a volumetric Mist, around a village with its own lights. On a ProMotion iPhone or iPad the game aims for 120 frames a second, which leaves 8.3 milliseconds for everything in a frame.

The benchmark said it fit. The real game said it didn't. This is how those two disagreed, and what it was.

## The numbers that didn't add up

I measure real nights by loading a save from one of the balance bots, calling the night, and logging 30 seconds of frames. On an iPhone 17 Pro, night 11:

| | GPU per frame (p50 / p95) | Frames dropped |
|---|---|---|
| The benchmark horde, same GPU load | about the same | almost none |
| The real night | 6.65 / 8.57 ms | about 25 % |

The GPU was right at the edge on the worst frames but fine on most of them. Yet one frame in four missed its slot, and the frame time's 95th percentile sat at exactly 16.8 ms: two refreshes instead of one. A GPU that is slightly too slow doesn't do that. It drifts. A clean doubling means something on the CPU sometimes takes the whole frame.

## The game tick

Wardlight's game runs as a fixed simulation at 20 ticks a second, on the CPU, deterministic, so the same seed and the same commands always give the same run. That is what lets the balance bots play thousands of nights headless on a Mac in seconds. The renderer only reads the state and interpolates the creatures between ticks.

At 120 Hz, every sixth frame carried a tick. On a late night a tick costs a few milliseconds on the phone, and right after it the game refreshed the values the SwiftUI interface shows. Both on the main thread, both in the same frame as the rendering work.

The fix was to move the tick off the frame. The ticks due in a frame now go to a serial queue as one batch, with a copy of the simulation (it is a Swift value type, so the copy is cheap and safe to send). The next frame collects the result. Anything that writes to the game, a tap, a command, waits for the batch in flight first, so everything still happens in one order and the run stays deterministic. The cost is one frame of latency on the creatures, which you can't see.

Dropped frames after that: 27 %. Slightly worse.

## Eight milliseconds of words

With the tick gone, the main thread's 95th percentile went *up*, to almost 10 ms, and nearly all of it was one function: the refresh that feeds the interface. It took 8.2 ms.

The interface shows which talents you can learn right now. To find out, the refresh asked every node of every building's tree whether it could be learned, and the function that answered returned the reason as a sentence when it couldn't: not enough Knowledge, a talent missing below it. Localized, through the string catalog, for every node, eight times a second. Thousands of translated sentences a second that nobody ever read.

The fix was boring. The check now answers with an enum, and only the place that shows a reason turns it into words. The count of learnable nodes is remembered until Knowledge, the learned nodes or the Wardlight's level change. At night the interface refreshes four times a second instead of eight; a tap still refreshes it at once.

Refresh after: 2.4 ms. Dropped frames: 14.6 %.

## The rest is the interface

Same build, same night, with the interface hidden (`-noHUD`, a launch flag I keep for screenshots): 0.9 % dropped. So the remaining loss is SwiftUI laying out and animating the glass interface over the map, and that is the next thing to work on, not the renderer.

## What I took from it

- A benchmark that has no game in it measures the GPU very well and the game not at all. I now measure on saves from real nights.
- Look at the shape of the frame times before the averages. A clean doubling at exactly two refreshes points at the CPU blocking a frame.
- Strings are not free. Building and localizing text belongs at the edge where someone reads it, not inside a check that runs on every frame.

The smallest phone I test on, an iPhone 13 mini, runs the game in a lower quality tier at 30 frames a second, and it holds that on a real last night with about 650 creatures in view. It has no headroom left, so it is the phone every later change gets checked on.

Wardlight comes out on 3 December, [on the App Store](https://apps.apple.com/app/id6826542922).
