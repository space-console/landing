# landing

The **marketing site** for **Space Console** — the page that explains the product
to someone who has never seen it: your TV is the console, everyone's phone is the
controller, nothing to install.

It is a sales page, not part of the console. It links out to the live launcher
(`game-launcher-web`), the games, and the repos; it ships no product code.

Zero-build, zero-backend static site — plain HTML, one CSS file, one ES module, no
bundler, no framework. Open `index.html` and it runs.

```sh
npm install     # dev tooling only
npm run dev     # http://localhost:5175 (auto-reload)
```

## What's on the page

| Section | Sells |
| --- | --- |
| Hero | TV as the console, phone as the controller, no app |
| How it works | open on the TV → scan the code → play (3 steps) |
| Adaptive controller | each game declares its pad; the phone re-renders to match |
| Library | all 33 games, real screenshots |
| Under the hood | WebRTC P2P input, signaling only brokers the handshake |
| Built for a room | roster & seats, scan-to-rejoin, 2-player, high scores, 10-foot UI |

## Assets

`assets/img/` and `assets/thumbs/` are **real captures** of the running console
(launcher, in-game HUD, phone pads, and one poster per game) — not mockups. When the
console's UI changes materially, recapture rather than retouch, so the page never
promises something the product doesn't do.

## Documentation

All docs live in the **wiki** repo (the org-wide hub), not here:

- How we build, deploy, and review across repos: `wiki/docs/way-of-working.md`

Published site (per branch): `main` deploys to the Pages root; feature branches get
a preview at `/preview/<branch-slug>-<hash>/`. Scripts and the stylesheet are
cache-busted at deploy time (`npm run build` → `_dist/`); local `npm run dev` stays
build-free.
