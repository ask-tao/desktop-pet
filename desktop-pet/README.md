# Desktop Pet

Cross-platform desktop pet scaffold for `macOS` and `Windows`, using:

- `Tauri 2`
- `Vue 3`
- `PixiJS 8`
- `@esotericsoftware/spine-pixi-v8`

## Current state

This repository already includes:

- a transparent always-on-top Tauri window
- a Vue control shell
- a PixiJS stage
- a Spine loading path with placeholder fallback
- Tauri window drag / minimize / close bindings

If no Spine assets are present, the app renders a placeholder pet so the shell
still runs.

## Requirements

- Node.js `18+` recommended
- Rust toolchain
- Tauri prerequisites for your platform

On this machine, `Node` exists but `rustc` and `cargo` were not installed when
the scaffold was created, so the project was not executed yet.

## Install

```bash
npm install
```

Install Rust first if needed:

```bash
curl https://sh.rustup.rs -sSf | sh
```

Then install Tauri OS prerequisites from the official docs.

## Run

Browser preview:

```bash
npm run dev
```

Desktop app:

```bash
npm run tauri:dev
```

## Spine assets

Put your export files in `/Users/zhang/Documents/New project/desktop-pet/public/spine`:

- `pet.skel` or `pet.json`
- `pet.atlas`
- atlas page images such as `pet.png`

The loader is configured in `/Users/zhang/Documents/New project/desktop-pet/src/lib/pet-stage.ts`.

If your export uses JSON instead of binary `.skel`, change:

```ts
const SPINE_SKELETON_PATH = "/spine/pet.skel";
```

to:

```ts
const SPINE_SKELETON_PATH = "/spine/pet.json";
```

## Suggested next implementation steps

1. Replace the placeholder with your real Spine character assets.
2. Add an animation config table so UI actions map to your real animation names.
3. Add tray behavior and background idle logic.
4. Add click-through mode for non-interactive states.
