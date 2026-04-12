// Link-check proxy: takes { url } and returns { status, redirected, final_url, error }.
// Used by canvas.html's "Check links" sweep to detect broken reference URLs.
// Stateless — no Supabase, no API calls. Just network. Cost: $0.

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

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'invalid json' }) };
  }

  const { url } = body;
  if (!url || typeof url !== 'string') {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'url required' }) };
  }

  let parsed;
  try { parsed = new URL(url); } catch {
    return { statusCode: 200, headers, body: JSON.stringify({ status: 0, error: 'invalid url' }) };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { statusCode: 200, headers, body: JSON.stringify({ status: 0, error: 'unsupported protocol' }) };
  }

  const ua = 'Mozilla/5.0 (compatible; 100xbtr_sound-link-check/1.0)';

  const doFetch = async (method) => {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(url, {
        method,
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': ua, 'Accept': '*/*' },
      });
      return { status: res.status, redirected: res.redirected, final_url: res.url };
    } finally {
      clearTimeout(to);
    }
  };

  try {
    let result = await doFetch('HEAD');
    if (result.status === 405 || result.status === 501 || result.status === 403 || result.status === 0) {
      try { result = await doFetch('GET'); } catch {}
    }
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 0,
        error: err.name === 'AbortError' ? 'timeout' : (err.message || 'fetch failed'),
      }),
    };
  }
};
