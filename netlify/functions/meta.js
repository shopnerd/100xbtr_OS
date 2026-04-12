// Fetches URL metadata: title, og:image, og:description, favicon
// Returns JSON. Graceful degradation on failure.

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
    return { statusCode: 405, headers, body: 'Method not allowed' };
  }

  const empty = { title: null, description: null, image: null, favicon: null };

  try {
    const { url } = JSON.parse(event.body);
    if (!url) return { statusCode: 400, headers, body: JSON.stringify({ error: 'url required' }) };

    let parsed;
    try { parsed = new URL(url); } catch {
      return { statusCode: 200, headers, body: JSON.stringify(empty) };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let html;
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; 100xbtr_sound/1.0; +https://sound.100xbtr.com)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      });
      clearTimeout(timeout);
      if (!res.ok) return { statusCode: 200, headers, body: JSON.stringify(empty) };
      html = await res.text();
    } catch {
      clearTimeout(timeout);
      return { statusCode: 200, headers, body: JSON.stringify(empty) };
    }

    const meta = (name) => {
      const propRe = new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i');
      const nameRe = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i');
      const propRe2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, 'i');
      const nameRe2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i');
      const m = html.match(propRe) || html.match(nameRe) || html.match(propRe2) || html.match(nameRe2);
      return m ? m[1] : null;
    };

    const ogTitle = meta('og:title');
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = ogTitle || (titleMatch ? titleMatch[1].trim() : null);

    const description = meta('og:description') || meta('description');

    const ogImage = meta('og:image');
    let image = null;
    if (ogImage) {
      try { image = new URL(ogImage, url).href; } catch { image = ogImage; }
    }

    let favicon = null;
    const appleIcon = html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i)
      || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']/i);
    const iconLink = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i)
      || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i);

    if (appleIcon) {
      try { favicon = new URL(appleIcon[1], url).href; } catch { favicon = appleIcon[1]; }
    } else if (iconLink) {
      try { favicon = new URL(iconLink[1], url).href; } catch { favicon = iconLink[1]; }
    } else {
      favicon = `${parsed.origin}/favicon.ico`;
    }

    return { statusCode: 200, headers, body: JSON.stringify({ title, description, image, favicon }) };
  } catch (err) {
    return { statusCode: 200, headers, body: JSON.stringify(empty) };
  }
};
