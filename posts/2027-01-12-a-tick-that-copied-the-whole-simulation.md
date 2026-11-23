---
title: A tick that copied the whole simulation
date: 2027-01-12
description: Wardlight's simulation is a Swift struct that runs 20 times a second with thousands of creatures. The first time I measured it with 2,500 of them, one tick took 67 ms. Most of that was Swift quietly copying the whole game.
image: /assets/shots/night-horde-wide-2000.webp
tags: swift, performance, simulation
---

Everything that decides a Wardlight night happens in a simulation written in plain Swift: where every creature walks, what each tower shoots, what breaks. The renderer only draws what the simulation says. An [earlier post](/blog/the-frames-were-not-the-gpus-fault/) was about the main thread and the interface. This one is about the simulation itself, and the Swift code inside it.

## The rules it lives by

The simulation lives in a Swift package, WardlightCore, with no Metal and no UIKit in it. The app runs it, and so does a command line tool, `wardlight-sim`, that plays whole runs with bots on my Mac. Both use the same code.

It ticks at a fixed 20 Hz, and it has to be deterministic: the same seed and the same commands give the same run, bit for bit. That rules out a few things. All randomness comes from the state's own random streams, one per system. Nothing iterates over a `Dictionary` or a `Set`, because their order isn't stable. Float maths sticks to the basic operations and square roots. Tests compare a hash of the whole state, and every change in this post had to leave that hash exactly where it was, for every bot, land and mutator set.

`Simulation` is a struct. That is what makes it cheap and safe to hand a copy to another thread. It is also where the worst problem came from.

## Measuring on the Mac

I can't profile a game by playing it, so `wardlight-sim` has modes for this. `--perf 2500` builds a test night: a ring of 40 towers and some wards, and 2,500 Crawlers coming in from every side. The Crawlers can't die and the buildings can't break, so the count stays at 2,500 and the pathfinding field never rebuilds in the middle of a measurement. The tool times each tick from outside; the simulation itself never reads a clock.

`--ticktimes` does the same over a real bot run, with the mean, p95, p99 and worst tick, split into all ticks, night ticks and the late nights from day 9. All of it runs as a release build (`swift run -c release`), because a debug build tells you nothing about speed.

## 67 milliseconds

The first `--perf 2500` run took 67 ms a tick. At 20 Hz a tick has 50 ms of game time, so the simulation was slower than the game it simulated.

85 % of the tick went into one question: each creature asking which building it could attack. It looked harmless:

```swift
// Inside a mutating func, once per Blight, every tick.
let inReach = state.buildings.filter { b in
    guard b.hp != nil, !b.sealed, let d = content.building(b.def),
          d.wall != true, d.hp != nil else { return false }
    return distance(a.position, to: b) <= reach
}
target = inReach.first { $0.def != "heartstone" } ?? inReach.first
```

The closure calls `content` and `distance`, which belong to `self`. Inside a `mutating` method, that closure got its own copy of the whole `Simulation`: every building, every creature, every table. Once per creature, 2,500 times a tick.

The fix was to stop asking per creature. Before the loop, once a tick, the simulation now builds a small table of what can be attacked, with each building's centre and half size:

```swift
let attackable: [(index: Int, center: SIMD2<Float>, half: SIMD2<Float>, isHeart: Bool)] =
    state.buildings.indices.compactMap { k in
        let b = state.buildings[k]
        guard b.hp != nil, !b.sealed, let d = content.building(b.def),
              d.wall != true, d.hp != nil else { return nil }
        return (k, center(of: b), halfSize(of: b), b.def == "heartstone")
    }
```

Inside the loop each creature then does plain arithmetic on `SIMD2<Float>` values against that table, a distance to a box, and stops at the first hit. Nothing in the loop adds or removes buildings, so the indices hold. The lanterns that lure Crawlers got the same treatment.

The towers had a smaller version of the same thing. They checked whether they could see a creature before checking whether it was in range, and sight samples the light field, which is the most expensive check there is. Swapping the order gives the same answer, because a creature out of range doesn't count either way.

Result: 2.5 ms a tick, with the same state hash. After merging it into the main branch, which had moved on in the meantime, the same test read 1.6 ms.

## The same mistake, smaller

Three days later I went through the rest of the night's loops looking for the same pattern, and it was everywhere in smaller doses. A ward's upkeep, for example:

```swift
// Before: `upkeep` asked in this loop copied the whole Simulation per building.
for i in state.buildings.indices where !state.buildings[i].sealed {
    let r = upkeep(of: state.buildings[i])
    if r > 0 { state.buildings[i].owed += r * dt }
}

// After: the rates come from a non-mutating helper first.
for (i, r) in upkeepRates() where r > 0 { state.buildings[i].owed += r * dt }
```

The mutating loop asks a non-mutating helper for the numbers first, then writes. Other spots worked out the same value again and again: a building's full health scanned the whole village every time it was asked, so a pass over the walls scanned the village once per wall. That value is now worked out once per pass and handed down.

A related cost is that Swift structs get copied when you return them. Looking up a building's definition returned the whole `BuildingDef`, so reading one field meant copying all of it. The lookup is now `@inline(__always)`, so a caller that reads only `.wall` lets the compiler skip the copy. Later, a profile of the stress night showed that `BuildingDef` had grown to 1.7 KB, and two tiny functions that only wanted a building's width and depth were copying it for every building and every creature. They now have a lookup that returns just those two numbers.

## Big structs, small stacks

Value types live on the stack, and the simulation is a big one. When I moved the tick off the main thread, a debug build overflowed the dispatch queue's 512 KB stack in the middle of a night. The simulation now runs on its own thread with a 16 MB stack. The test suite has the same issue: in debug, the simulation's frames overflow the test threads' stack, so Xcode Cloud runs the core tests as a release build.

## Grids instead of dictionaries

Some questions have to look at neighbours, like which creatures stand in the same square metre, or which ones a tower could hit. A `Dictionary` keyed by cell would be the obvious answer, but its order isn't stable. Instead the simulation uses a counting sort into flat arrays, once a tick:

```swift
for k in agents.indices {                       // count per cell
    let c = cell(agents[k].position)
    cellOf[k] = Int32(c); counts[c + 1] += 1
}
for c in 0..<cells { counts[c + 1] += counts[c] }   // running sum
var fill = counts
for k in agents.indices {                       // agents into their slots, in agent order
    let c = Int(cellOf[k])
    items[Int(fill[c])] = Int32(k); fill[c] += 1
}
```

Agents in cell `c` are then `items[start[c]..<start[c + 1]]`, always in the same order. The crowd uses 1 m cells to keep more than two ground creatures from standing in one. The towers use 4 m cells. On the stress night a tower had a median of 5 % of the creatures in range (280 of 5,600), and of those a median of zero in sight, so scanning every creature was nearly all waste. A tower that shoots the nearest creature now searches outward from its own cell and stops as soon as the answer can't change; the other orders look only at the cells their reach touches.

## More cores, same answer

The stress night is about 8,000 creatures, 700 buildings and 120 towers at three times speed, which leaves 16.7 ms per tick if it is to keep up with 60 frames a second. There, the creatures' movement was more than half of the tick.

So movement now runs in two phases. First every creature plans its step on its own, reading only the state as it was at the start of the tick. That part runs on six fixed chunks across cores, writing straight into an uninitialised array:

```swift
return [MarchPlan](unsafeUninitializedCapacity: n) { buf, made in
    guard let base = buf.baseAddress else { made = 0; return }
    DispatchQueue.concurrentPerform(iterations: chunks) { c in
        for i in (c * n / chunks)..<((c + 1) * n / chunks) {
            (base + i).initialize(to: marchPlan(i, tables))
        }
    }
    made = n
}
```

Then a single loop goes through the creatures in order and applies everything they share: blows on walls, room in each cell, traps, deaths. The number of chunks is fixed, so the work splits the same way on every device, and `wardlight-sim --threads 1` checks that one core and six give the same state. A creature that another one changed during the loop plans again at its turn.

I don't have a clean after number for this pass yet.

## The numbers

| `--perf 2500` (2,500 creatures, Mac) | ms per tick |
|---|---|
| First measurement | 67 |
| Attack and lure tables, range before sight | 2.5 |
| The same, merged into main | 1.6 |
| Smarter walking: walls priced in the path, lanes | 2.1 → 2.6 |
| Eight mage towers and their summons on top | about the same on a quiet Mac |

Some readings were taken on a Mac busy with other work, and I count those as noise. The no-stacking crowd went in at 4.8 → 3.6 ms on such a Mac, which only says it didn't make things worse. Today a tick with 2,500 creatures alive costs about 2.7 ms on the Mac.

There is still work left. The interface's hint book copies the whole simulation, about 1 % of a night's main thread, and two of the fight's passes still walk every creature with copies.

## What I took from it

- In Swift, a closure or a `where` clause that touches `self` inside a `mutating` method can copy all of `self`. With a large struct, that is the first place I look now.
- Work out tables once per tick, then loop over plain numbers.
- Determinism is a good constraint for speed work. If the state hash moves, the optimisation is wrong.
- Flat arrays and a counting sort do what a dictionary would, in a fixed order.

Wardlight is out [on the App Store](https://apps.apple.com/app/id6826542922).
