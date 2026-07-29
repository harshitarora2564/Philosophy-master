// Shared YouTube search. Lives under an underscore so Vercel treats it as a
// library rather than a route.
//
// A browser cannot do this: there is no keyless JSON search API, and CORS
// blocks reading the results page from the page itself. Server side neither
// applies, so this reads the same results page a person would — no API key,
// no quota.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// sp=EgIQAQ%3D%3D is the "Videos" filter, which drops channels, playlists and
// the shelves YouTube injects between results.
const SEARCH = 'https://www.youtube.com/results?sp=EgIQAQ%3D%3D&search_query=';

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

function extractInitialData(html) {
  const m = html.match(/ytInitialData\s*=\s*(\{.+?\})\s*;\s*<\/script>/s);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch (e) { return null; }
}

// Walk the render tree rather than regexing ids out of the page: it keeps the
// title and channel, and lets us skip live streams, which make poor lessons.
function pickVideo(data) {
  if (!data) return null;
  const sections =
    ((((data.contents || {}).twoColumnSearchResultsRenderer || {}).primaryContents || {})
      .sectionListRenderer || {}).contents || [];

  const candidates = [];
  for (const section of sections) {
    const items = (section.itemSectionRenderer || {}).contents || [];
    for (const item of items) {
      const v = item.videoRenderer;
      if (!v || !ID_RE.test(v.videoId || '')) continue;
      const title = (v.title && v.title.runs && v.title.runs[0] && v.title.runs[0].text) ||
                    (v.title && v.title.simpleText) || '';
      const author = (v.ownerText && v.ownerText.runs && v.ownerText.runs[0] && v.ownerText.runs[0].text) ||
                     (v.longBylineText && v.longBylineText.runs && v.longBylineText.runs[0] && v.longBylineText.runs[0].text) || '';
      candidates.push({
        id: v.videoId,
        title: title,
        author: author,
        // Live streams carry no lengthText; a normal upload always does.
        length: (v.lengthText && v.lengthText.simpleText) || '',
      });
    }
  }
  return candidates.find(c => c.length) || candidates[0] || null;
}

function fallbackScrape(html) {
  const m = html.match(/"videoId":"([A-Za-z0-9_-]{11})"/);
  return m ? { id: m[1], title: '', author: '', length: '' } : null;
}

// Resolves a query to { id, url, title, author, length }, or throws.
async function resolveQuery(q) {
  const upstream = await fetch(SEARCH + encodeURIComponent(q), {
    headers: {
      'user-agent': UA,
      'accept-language': 'en-US,en;q=0.9',
      // Skips the EU consent interstitial, which returns no results.
      cookie: 'CONSENT=YES+cb; SOCS=CAI',
    },
  });
  if (!upstream.ok) {
    const err = new Error('youtube ' + upstream.status);
    err.status = 502;
    throw err;
  }

  const html = await upstream.text();
  const hit = pickVideo(extractInitialData(html)) || fallbackScrape(html);
  if (!hit) {
    const err = new Error('no video found');
    err.status = 404;
    throw err;
  }

  return {
    id: hit.id,
    url: 'https://www.youtube.com/watch?v=' + hit.id,
    title: hit.title,
    author: hit.author,
    length: hit.length,
  };
}

module.exports = { resolveQuery };
