# Working in this repo

`main` is the live site. A push to `main` deploys to
<https://ladder-philosophy-mastery.vercel.app> — there is no separate release
step, no staging environment, and nobody promotes anything by hand. Treat every
commit on `main` as a change real visitors will see within about a minute.

## Before you push

```bash
node scripts/verify.mjs
```

CI runs exactly this, and production is gated on it passing. Running it locally
turns a red deploy into a red terminal, which is cheaper.

## Where changes go

| Kind of change | Branch |
| --- | --- |
| Small, obviously safe, asked for directly | `main` |
| Anything you want looked at first | a branch → gets its own preview URL |

Push a branch instead of `main` when the change is large, touches how the AI
providers or `/api/yt` behave, or when you are not sure it is right. The preview
URL is free and the live site stays untouched.

## What this app is

A single-page PWA. Type a person or a concept, get ten principles, then climb
each one from Level 1 to Level 10 on YouTube videos resolved server-side.

| Path | What it is |
| --- | --- |
| `index.html` | The whole front end, ~450 KB, **a bundled export** |
| `api/yt.js` | `GET /api/yt?q=` — resolves a rung's search phrase to a video |
| `api/_ytsearch.js` | The YouTube search itself; underscore = library, not a route |
| `sw.js` | Service worker, network-first, `/api/` excluded |
| `scripts/verify.mjs` | Pre-deploy checks |
| `DEPLOYMENT.md` | The pipeline and its one-time setup |

## Things that will bite you

**`index.html` is a build artifact, not source.** It is a bundled export from
the design component it came from, with the runtime and logic inlined and the
head written from an escaped template (`rel=\"manifest\"`, backslashes and all).
Hand-editing it works but the next re-export silently discards your edit. For
anything beyond a one-line fix, change it at the source and re-export.

**There is no `package.json` and no build step.** Vercel serves the root
directory as static files and compiles `api/*.js` as Node functions. Adding a
`package.json` changes how Vercel treats the project — do not add one casually.

**Serverless functions fail at request time, not deploy time.** A syntax error
in `api/` deploys green and then 500s on the first visitor. `verify.mjs` runs
`node --check` on both files for exactly this reason; keep new API files covered
by it.

**No secrets live in this repo.** Visitors bring their own AI key, held in their
own browser's `localStorage`, and `/api/yt` needs no key at all. If you ever add
a server-side key, it goes in Vercel's environment variables — never in a commit.

**The API is scraping, not an API.** `api/_ytsearch.js` reads YouTube's results
page and walks `ytInitialData`. YouTube changes that shape without warning, so
treat a sudden run of "no video found" as an upstream change rather than a bug
in the caller. The client already degrades to a search link when the route
fails.
