// GET /api/yt?q=<search phrase> -> { id, url, title, author, length }
//
// The one thing the client cannot do for itself: turn a rung's search phrase
// into an actual video. See ./_ytsearch.js for why this has to be server-side.

const { resolveQuery } = require('./_ytsearch');

module.exports = async (req, res) => {
  const q = String(((req.query || {}).q) || '').trim();

  // Resolved ids are stable, so let the edge serve repeats for free.
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');

  if (!q) {
    res.status(400).json({ error: 'missing q' });
    return;
  }

  try {
    res.status(200).json(await resolveQuery(q));
  } catch (err) {
    res.status(err && err.status ? err.status : 500)
       .json({ error: String((err && err.message) || err) });
  }
};
