# Deployment

How a change gets from an editor to <https://ladder-philosophy-mastery.vercel.app>.

## The trajectory

```
edit  ->  commit  ->  push to GitHub  ->  verify  ->  Vercel build  ->  live site
```

GitHub is the source of truth. Nothing is uploaded to Vercel by hand — a push is
the only way the live site changes, so the site always matches a commit you can
point at.

| Where you push | What you get |
| --- | --- |
| The repo's **default branch** | A production deploy — the live site updates |
| Any other branch | A **preview** deploy on its own URL; the live site is untouched |

A pull request runs the checks but does not deploy again — the branch behind it
already got its preview URL when it was pushed.

`.github/workflows/deploy.yml` reads the default branch from the repository
itself, so renaming or switching the production branch later needs no change
here.

## One-time setup

Two ways to wire GitHub to Vercel. **Pick one** — running both deploys every
commit twice.

### Option A — Vercel's Git integration (recommended)

No secrets, no CI minutes, and preview URLs get posted onto pull requests
automatically.

1. Vercel → the **ladder-philosophy-mastery** project → **Settings → Git**.
2. **Connect Git Repository** → GitHub → `harshitarora2564/Philosophy-master`.
3. Set **Production Branch** to the branch you want live (see *Production
   branch* below).
4. Confirm **Settings → Build & Deployment**: framework preset **Other**, build
   command empty, output directory `.` (root). `vercel.json` is picked up
   automatically.

Done. Every push now builds; pushes to the production branch go live. The
`verify` job in the workflow still runs on each push and reports on the commit,
and the `deploy` job notices there are no credentials and steps aside.

### Option B — deploy from GitHub Actions

Use this if the deploy has to be gated on CI passing, or if the Vercel project
cannot be connected to the repo. Add three repository secrets under
**GitHub → Settings → Secrets and variables → Actions**:

| Secret | Where it comes from |
| --- | --- |
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens → **Create** |
| `VERCEL_ORG_ID` | `npx vercel link` in a clone, then read `.vercel/project.json` → `orgId` |
| `VERCEL_PROJECT_ID` | the same file → `projectId` |

The workflow only deploys once all three are present, so adding them is what
switches this path on. If the project is *also* connected under Option A,
disconnect it first (**Settings → Git → Disconnect**).

## Production branch

The repo's only branch today is `claude/web-app-from-zip-m2j8fm`, which works
but is an odd name for the branch that is the public site. The usual shape:

```bash
git checkout -b main <the branch carrying the site>
git push -u origin main
```

Then set `main` as the default branch on GitHub (**Settings → General → Default
branch**) and as the **Production Branch** in Vercel. Feature work lands via
pull request, each PR gets a preview URL, and merging to `main` ships.

## What runs before a deploy

`node scripts/verify.mjs` — checks the things that would otherwise surface as a
blank page or a 500 on the live site:

- `index.html`, `sw.js`, `manifest.webmanifest` and `vercel.json` are present
- both files under `api/` parse (functions are compiled at request time, so a
  syntax error would otherwise ship and fail on the first visitor)
- `vercel.json` and the web manifest are valid JSON
- every icon the manifest lists is actually committed
- `index.html` has a title, links the manifest, registers `/sw.js`, and calls
  `/api/yt`

Run it locally before pushing:

```bash
node scripts/verify.mjs
```

## Checking a deploy

```bash
npx vercel ls                  # recent deployments
npx vercel inspect <url>       # one deployment in detail
npx vercel logs <url>          # runtime logs for /api/yt
```

A production deploy that goes wrong can be rolled back from Vercel →
**Deployments** → the previous good one → **Promote to Production**, which is
instant and needs no push.

## Cache note

`sw.js` is network-first for same-origin requests, so an online visitor gets the
new build on the next load — the cache is only a fallback for when the network
fails. Nothing needs bumping after a deploy. (`/api/` is excluded from the
worker entirely; those responses are cached at the Vercel edge for a day, which
is why a rung resolves instantly the second time.)
