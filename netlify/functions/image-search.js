// Image search with three backends:
//  1. Google Custom Search API (best coverage, requires API key)
//  2. Pexels API                (free 200 req/hr, high-quality modern stock photos)
//  3. Wikimedia Commons API     (free fallback — good for history, products, places)
//
// POST { query: "horn loudspeakers", count: 6, source?: "auto"|"google"|"pexels"|"wikimedia" }
//
// Env vars (set in Netlify dashboard or local .env):
//  GOOGLE_CSE_API_KEY  - from https://console.cloud.google.com/apis/credentials
//  GOOGLE_CSE_ID       - from https://programmablesearchengine.google.com/
//  PEXELS_API_KEY      - from https://www.pexels.com/api/ (free account)

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { query, count = 6, source = 'auto' } = JSON.parse(event.body || '{}');

    if (!query) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'query required' }) };
    }

    const limit = Math.min(Math.max(1, parseInt(count) || 6), 20);
    const googleConfigured = !!(process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_ID);
    const pexelsConfigured = !!process.env.PEXELS_API_KEY;

    let images = [];
    let usedSource = null;
    let error = null;

    if ((source === 'auto' || source === 'google') && googleConfigured) {
      try {
        images = await searchGoogle(query, limit);
        if (images.length > 0) usedSource = 'google';
      } catch (e) {
        error = 'google: ' + e.message;
      }
    }

    if (images.length === 0 && (source === 'auto' || source === 'pexels') && pexelsConfigured) {
      try {
        images = await searchPexels(query, limit);
        if (images.length > 0) usedSource = 'pexels';
      } catch (e) {
        error = (error ? error + '; ' : '') + 'pexels: ' + e.message;
      }
    }

    if (images.length === 0 && source !== 'google' && source !== 'pexels') {
      try {
        images = await searchWikimedia(query, limit);
        if (images.length > 0) usedSource = 'wikimedia';
      } catch (e) {
        error = (error ? error + '; ' : '') + 'wikimedia: ' + e.message;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ query, count: images.length, source: usedSource, error, images }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message, images: [] }),
    };
  }
};

// ── GOOGLE CUSTOM SEARCH ───────────────────────────────────────
async function searchGoogle(query, limit) {
  const key = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;
  if (!key) throw new Error('GOOGLE_CSE_API_KEY env var not set');
  if (!cx) throw new Error('GOOGLE_CSE_ID env var not set');
  const num = Math.min(limit, 10);
  const url = `https://www.googleapis.com/customsearch/v1?` + new URLSearchParams({
    key, cx, q: query, searchType: 'image', num: String(num), safe: 'active'
  });

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    let parsed; try { parsed = JSON.parse(text); } catch {}
    throw new Error(`HTTP ${res.status}: ${parsed?.error?.message || text.substring(0, 300)}`);
  }
  const data = await res.json();
  return (data.items || []).map(item => ({
    thumbnail: item.image?.thumbnailLink || item.link,
    url: item.link,
    sourcePage: item.image?.contextLink || item.link,
    title: (item.title || '').substring(0, 80),
    description: (item.snippet || '').substring(0, 200),
    artist: '',
    width: item.image?.width,
    height: item.image?.height,
  }));
}

// ── PEXELS ─────────────────────────────────────────────────────
async function searchPexels(query, limit) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error('PEXELS_API_KEY env var not set');
  const url = `https://api.pexels.com/v1/search?` + new URLSearchParams({
    query, per_page: String(Math.min(limit, 80)), page: '1',
  });
  const res = await fetch(url, {
    headers: { 'Authorization': key, 'Accept': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.substring(0, 300)}`);
  }
  const data = await res.json();
  return (data.photos || []).slice(0, limit).map(p => ({
    thumbnail: p.src?.medium || p.src?.small || p.src?.tiny || p.src?.original,
    url: p.src?.large || p.src?.original || p.url,
    sourcePage: p.url,
    title: (p.alt || '').substring(0, 80),
    description: (p.alt || '').substring(0, 200),
    artist: p.photographer || '',
    artistUrl: p.photographer_url || '',
    width: p.width,
    height: p.height,
  }));
}

// ── WIKIMEDIA COMMONS ──────────────────────────────────────────
async function searchWikimedia(query, limit) {
  const url = `https://commons.wikimedia.org/w/api.php?` + new URLSearchParams({
    action: 'query', format: 'json', generator: 'search',
    gsrsearch: query, gsrnamespace: '6', gsrlimit: String(limit * 2),
    prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '600', origin: '*',
  });
  const res = await fetch(url, {
    headers: { 'User-Agent': '100xbtr_sound/1.0 (https://sound.100xbtr.com)', 'Accept': 'application/json' }
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  const pages = data.query?.pages || {};
  const out = [];
  for (const pageId in pages) {
    const page = pages[pageId];
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const mime = info.mime || '';
    const fileUrl = info.url || '';
    if (mime && !mime.startsWith('image/')) continue;
    if (mime === 'image/svg+xml' || /\.svg$/i.test(fileUrl)) continue;
    if (!mime && !/\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl)) continue;
    const thumbnail = info.thumburl || info.url;
    const title = (page.title || '').replace(/^File:/, '').replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
    const ext = info.extmetadata || {};
    const description = (ext.ImageDescription?.value || '').replace(/<[^>]+>/g, '').substring(0, 200);
    const artist = (ext.Artist?.value || '').replace(/<[^>]+>/g, '').substring(0, 100);
    out.push({ thumbnail, url: fileUrl, sourcePage: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`, title, description, artist });
    if (out.length >= limit) break;
  }
  return out;
}
