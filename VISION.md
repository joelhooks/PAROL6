# Vision

## Outcome

Joel builds a PAROL6 desktop robot arm himself and understands every step. He works it up from a bare control board to an arm that patches cables and turns knobs on a Eurorack skiff, and he releases one video per milestone.

This repository is the public home for that build: milestones, explainers, video pages, sources and a glossary. It is written so that Joel, and anyone else building a PAROL6, can follow each step, check it against the official sources, and see it done on camera.

## Who it serves

- **Joel**, first. The wiki is his plan, his checklist and his record.
- **Other PAROL6 builders**, who want each step explained, sourced to the [official manual](https://docs.source-robotics.com/PAROL-docs/1.1/), and filmed.
- **Agents** helping with the build, which read the same pages through the site's search, read and MCP tools.

## How the milestones work

Each milestone is one task class from [four-component instructional design](https://www.4cid.org/): a smaller, complete version of the final job; the [milestones page](/lore/milestones) lists all seven. The final job is a robot that does a useful thing to a synth, safely, and that Joel can explain.

Inside each milestone:

- The **whole task** states the complete job for the stage.
- **Concepts** build the mental model.
- **How-to** links open the official page at the step that needs it.
- **Practice** drills the hand skills that recur.
- The **done check** is done cold, on camera.
- The **video** is the reflection and the assessment: if Joel can explain it to camera, he understands it.

## What good looks like

- Every build fact cites an official page. A claim without one carries a visible **needs_source** marker.
- Milestones 5 to 7 go past the official manual and say so: **Our design**.
- Official images and PDFs are linked, never copied. Hardware is CERN-OHL-S-2.0 and firmware GPL-3.0, per the [PAROL6 repository](https://github.com/Source-Robotics/PAROL6-Desktop-robot-arm).
- Nothing private reaches the public repo: no addresses, orders, deliveries, email, or private paths. `pnpm check` runs the public-safety guard to hold that line.

## Will not do

- Copy official images, PDFs or manual text wholesale.
- Publish purchases, prices, orders, deliveries, customs details or Joel's private questions.
- Recommend a skiff before Joel picks one.

## The stack

The site runs on [rat-stack](https://github.com/joelhooks/rat-stack): Effect, XState, Foldkit and Alchemy behind a fence of type checks, lint rules and commit hooks. `AGENTS.md` is the law for changing it.

New parts follow the cartridge test:

- **Labeled.** One package, one job, named for that job.
- **Push in.** Adding it takes one package plus one `Layer.provide` or Stack line.
- **Pull out.** Removing it takes deleting that package and that line, and `pnpm turbo run check test build` still passes.
- **Self-contained.** It declares its own resources and bindings.
- **Easy to trash.** It can be thrown away without affecting anything else.

## Needs sign-off

- Weakening lefthook, CI, or the `--no-verify` blocks.
- Loosening the public-safety guard in `scripts/public-safety-patterns.ts`.
- Choosing the domain or Cloudflare account, and the first deploy.
