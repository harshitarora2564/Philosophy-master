# Ladder — Philosophy Mastery

Type any person or concept. Get their ten defining principles, then climb each one
from Level 1 to Level 10 on a YouTube-powered ladder — beginner to mastery, no prior
knowledge needed.

A single-file static web app. No build step, no server, no secrets stored by you.

## What's here

| File | Purpose |
| --- | --- |
| `index.html` | The entire app — fonts, runtime, and logic are inlined |
| `vercel.json` | Static hosting config (clean URLs + security headers) |

## Run it locally

There is nothing to install. Serve the folder over HTTP:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` straight off the filesystem (`file://`) also works in most
browsers, but a local server matches production more closely.

## Deploy

**Vercel — Git import.** Point Vercel at this repo. Framework preset **Other**,
build command **none**, output directory **`.`** (root). `vercel.json` is picked up
automatically.

**Vercel — CLI.**

```bash
npm i -g vercel
vercel          # preview deploy
vercel --prod   # production
```

**Anywhere else.** Any static host works — GitHub Pages, Netlify, Cloudflare Pages,
S3. Upload `index.html` and you're done.

## How the AI connection works

The app has no backend. Each visitor picks a provider from the button in the
top-right:

1. **Free — no key** — a free Puter account sign-in popup covers the AI cost
   (`js.puter.com` is loaded at runtime).
2. **Google Gemini** — visitor pastes a free AI Studio key from
   [aistudio.google.com/apikey](https://aistudio.google.com/apikey). There is also a
   Gemini key bar at the top of the home screen.
3. **Anthropic Claude** — visitor pastes a key from
   [console.anthropic.com](https://console.anthropic.com) (best quality,
   pay-as-you-go).

Keys live only in the visitor's own browser `localStorage` and are sent only to that
provider's API. You never hold a key, and you are never billed for a visitor's usage.

### If you'd rather supply the AI yourself

Put your own key server-side instead of asking visitors:

1. Add `api/ai.js` as a Vercel Function that forwards a `prompt` to your provider
   using `process.env.ANTHROPIC_API_KEY`.
2. In `index.html`, find the `activeProvider()` / `ai(prompt)` pair and make `ai()`
   POST to `/api/ai` instead.
3. Set the env var in Vercel → Project → Settings → Environment Variables.

Add rate limiting before doing this publicly — otherwise visitors spend your tokens.

## How the two paths differ

- **Person** → brief · their 10 famous philosophies *by name* (Steve Jobs → Reality
  Distortion Field) · click one for its Level 1→10 ladder · life achievements and
  failures · business case study.
- **Concept** → brief · a straight Level 1→10 understanding ladder (level 1 assumes
  you've never heard of it) · application blunders · business case study.

## How the YouTube links resolve

Every rung links to study material, and a rung must never land on a dead video. The
app resolves each link in three steps:

1. The model returns both a search query and a candidate 11-character video ID for
   the rung.
2. The browser checks that ID against YouTube's public
   [oEmbed endpoint](https://www.youtube.com/oembed) — no API key, no quota. A
   deleted, private, or invented ID returns 404 and is discarded. The endpoint also
   returns the video's real title and channel, which are checked for a content-word
   overlap with the rung, so a live-but-unrelated video is rejected too.
3. A video that passes both checks becomes a direct
   `youtube.com/watch?v=…` link, labelled **▶ Watch on YouTube**, with the verified
   title and channel shown beneath it. Anything that fails falls back to a YouTube
   search for that rung, labelled **▶ Find on YouTube**.

Verification verdicts are cached in `localStorage`, so a rung is only checked once
per browser. If the check itself fails — offline, or a network that blocks YouTube —
the link degrades to search rather than breaking.

The fallback exists because there is no keyless way to run a YouTube *search* from a
static page; only ID *verification* is free. To make every rung a direct video, add a
[YouTube Data API](https://developers.google.com/youtube/v3) key and resolve each
`yt` query through `search.list` — replace `ytUrlFor()` in `index.html`.

## Notes

- Results, progress, and video verdicts are cached per browser, so revisits cost
  nothing.
- YouTube links open in a new tab. In embedded previews they show a copy-link dialog
  instead, because YouTube refuses to be framed; on your live domain they open
  directly.
- `index.html` is a bundled export: the readable source lives in the design
  component it was exported from. To change content or styling, edit there and
  re-export rather than hand-editing the bundle.
