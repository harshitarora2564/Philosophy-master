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

Which one you want turns on a single question: **should a failing check be able
to stop a production deploy?**

- Under Vercel's Git integration, **no**. Vercel watches the repo directly and
  builds on push; it never sees the result of the `verify` job. A commit that
  fails CI still goes live, with a red X sitting next to it afterwards.
- Under GitHub Actions, **yes**. `deploy` declares `needs: verify`, so a failing
  check means production is simply never touched.

If people push to `main` by hand after looking at the diff, the first is fine
and simpler. If pushes to `main` are automated — an agent, a bot, a scheduled
job — take the second: the check is the only thing standing between a bad commit
and the live site.

### Option A — GitHub Actions (recommended here, because production is gated)

Add three repository secrets under **GitHub → Settings → Secrets and variables →
Actions → New repository secret**:

| Secret | Where it comes from |
| --- | --- |
| `VERCEL_TOKEN` | Vercel → **Account Settings → Tokens** → Create, scoped to the team that owns the project |
| `VERCEL_ORG_ID` | Vercel → **Settings → General → Team ID** (or `.vercel/project.json` → `orgId` after `npx vercel link`) |
| `VERCEL_PROJECT_ID` | Vercel → the project → **Settings → General → Project ID** |

The workflow deploys only once all three are present, so adding them is what
switches this path on. Leave the project **disconnected** from the repo in
Vercel (**Settings → Git**) — if it is connected too, every commit deploys
twice.

Confirm **Settings → Build & Deployment** on the project: framework preset
**Other**, build command empty, output directory `.` (root). `vercel.json` is
picked up automatically.

### Option B — Vercel's Git integration

No secrets, no CI minutes, and preview URLs get posted onto pull requests
automatically — at the cost of the gate described above.

1. Vercel → the **ladder-philosophy-mastery** project → **Settings → Git**.
2. **Connect Git Repository** → GitHub → `harshitarora2564/Philosophy-master`.
3. Set **Production Branch** to `main`.
4. Same Build & Deployment settings as above.

The `verify` job still runs on each push and reports on the commit — it just
cannot block anything. The `deploy` job finds no credentials and steps aside, so
there is no double deploy.

## Production branch

`main` is the production branch, and it must also be the repository's **default**
branch — the workflow decides production-vs-preview by comparing the pushed
branch against the default one, so if the default is still something else, a
push to `main` is treated as a preview.

Set it under **GitHub → Settings → General → Default branch**. Once that is
done, the two original `claude/*` branches are fully contained in `main` and can
be deleted.

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
