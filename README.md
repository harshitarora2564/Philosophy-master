# Ladder — Philosophy Mastery

Type any person or concept. Get their ten defining principles, then climb each one
from Level 1 to Level 10 on a YouTube-powered ladder — beginner to mastery, no prior
knowledge needed.

A single-file static web app. No build step, no server, no secrets stored by you.

## What's here

| File | Purpose |
| --- | --- |
| `index.html` | The entire front end — fonts, runtime, and logic are inlined |
| `api/yt.js` | Serverless endpoint that resolves a rung to a real YouTube video |
| `api/_ytsearch.js` | The YouTube search itself (shared library, not a route) |
| `vercel.json` | Static hosting config (clean URLs + security headers) |
| `scripts/verify.mjs` | Pre-deploy checks, run by CI and runnable by hand |
| `.github/workflows/deploy.yml` | Push → verify → Vercel pipeline |
| `DEPLOYMENT.md` | How a change reaches the live site, and the one-time setup |
| `CLAUDE.md` | Repo conventions for agents working here |

## Run it locally

There is nothing to install. Serve the folder over HTTP:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

That serves the front end, but not `/api/yt` — rungs will fall back to search
links. To run the API locally too, use the Vercel CLI, which serves both:

```bash
npx vercel dev
```

## Deploy

A change reaches <https://ladder-philosophy-mastery.vercel.app> by being pushed:

```
edit  ->  commit  ->  push to GitHub  ->  verify  ->  Vercel build  ->  live site
```

Pushing the default branch updates the live site. Any other branch or pull
request gets its own preview URL instead. Nothing is uploaded to Vercel by hand,
so the site always matches a commit.

Wiring it up is a one-time job — **[DEPLOYMENT.md](DEPLOYMENT.md)** has the two
options (Vercel's Git integration, or GitHub Actions with a Vercel token), the
production-branch setup, and how to roll a bad deploy back.

Before pushing, the same checks CI runs:

```bash
node scripts/verify.mjs
```

**Anywhere else.** Any static host works — GitHub Pages, Netlify, Cloudflare Pages,
S3 — but `/api/yt` is a Vercel Function, so rungs fall back to search links off
Vercel.

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

Clicking a rung opens the lesson itself, not a search box.

A browser cannot search YouTube: there is no keyless JSON search API, and CORS
blocks reading the results page from the page itself. So the search runs
server-side, in `api/yt.js`:

1. The model writes a search phrase for each rung (`yt`).
2. The client calls `/api/yt?q=<phrase>` for all ten rungs the moment a ladder
   opens — same origin, so no CORS and no API key.
3. The function loads YouTube's results page with the **Videos** filter applied,
   walks `ytInitialData`, skips live streams, and returns the top video's id,
   title, channel, and duration.
4. The rung becomes a direct `youtube.com/watch?v=…` link labelled
   **▶ Watch on YouTube**, with the real title and channel shown beneath it.

No API key and no quota — the function reads the same page a person would.
Resolved queries are cached at the Vercel edge for a day and in each visitor's
`localStorage` forever, so a rung is looked up once.

If `/api/yt` is unavailable — the file opened straight off disk, or hosted
somewhere without the function — links fall back to a YouTube search and the
button reads **▶ Find on YouTube**, so a rung degrades rather than breaking.

### Files behind it

| File | Role |
| --- | --- |
| `api/_ytsearch.js` | The search and result parsing (underscore = library, not a route) |
| `api/yt.js` | `GET /api/yt?q=` endpoint wrapping it |

## Notes

- Results, progress, and video verdicts are cached per browser, so revisits cost
  nothing.
- YouTube links open in a new tab. In embedded previews they show a copy-link dialog
  instead, because YouTube refuses to be framed; on your live domain they open
  directly.
- `index.html` is a bundled export: the readable source lives in the design
  component it was exported from. To change content or styling, edit there and
  re-export rather than hand-editing the bundle.
