// Web search — returns real web page results with titles, URLs, descriptions
// Uses Brave Web Search API (free tier: 2000 req/mo)
// Fallback: Google Custom Search (without image filter)
//
// POST { query: "Klipsch Klipschorn review", count: 5 }
// Returns: { query, count, source, results: [{ title, url, description, favicon }] }

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
    const { query, count = 5 } = JSON.parse(event.body || '{}');

    if (!query) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'query required' }) };
    }

    const limit = Math.min(Math.max(1, parseInt(count) || 5), 20);
    const braveConfigured = !!process.env.BRAVE_API_KEY;
    const googleConfigured = !!(process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_ID);

    let results = [];
    let usedSource = null;
    let error = null;

    // Try Brave web search first
    if (braveConfigured) {
      try {
        results = await searchBraveWeb(query, limit);
        if (results.length > 0) usedSource = 'brave';
      } catch (e) {
        error = 'brave: ' + e.message;
      }
    }

    // Fallback to Google CSE (web mode, no searchType=image)
    if (results.length === 0 && googleConfigured) {
      try {
        results = await searchGoogleWeb(query, limit);
        if (results.length > 0) usedSource = 'google';
      } catch (e) {
        error = (error ? error + '; ' : '') + 'google: ' + e.message;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ query, count: results.length, source: usedSource, error, results }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message, results: [] }),
    };
  }
};

// ── BRAVE WEB SEARCH ─────────────────────────────────────────
async function searchBraveWeb(query, limit) {
  const key = process.env.BRAVE_API_KEY;
  if (!key) throw new Error('BRAVE_API_KEY env var not set');

  const url = `https://api.search.brave.com/res/v1/web/search?` + new URLSearchParams({
    q: query, count: String(Math.min(limit, 20)), safesearch: 'moderate',
  });

  const res = await fetch(url, {
    headers: { 'X-Subscription-Token': key, 'Accept': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.substring(0, 300)}`);
  }
  const data = await res.json();
  return (data.web?.results || []).slice(0, limit).map(r => ({
    title: (r.title || '').substring(0, 100),
    url: r.url,
    description: (r.description || '').replace(/<[^>]+>/g, '').substring(0, 300),
    favicon: r.profile?.img || r.meta_url?.favicon || '',
  }));
}

// ── GOOGLE CSE (WEB MODE) ────────────────────────────────────
async function searchGoogleWeb(query, limit) {
  const key = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;
  if (!key || !cx) throw new Error('Google CSE not configured');

  const url = `https://www.googleapis.com/customsearch/v1?` + new URLSearchParams({
    key, cx, q: query, num: String(Math.min(limit, 10)),
  });

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.substring(0, 300)}`);
  }
  const data = await res.json();
  return (data.items || []).slice(0, limit).map(item => ({
    title: (item.title || '').substring(0, 100),
    url: item.link,
    description: (item.snippet || '').substring(0, 300),
    favicon: item.pagemap?.cse_image?.[0]?.src || '',
  }));
}
