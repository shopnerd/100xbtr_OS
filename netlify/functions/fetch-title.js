exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const url = event.queryStringParameters?.url;
  if (!url) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing url parameter' }) };
  }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 100xbtr-bot/1.0)' },
      signal: AbortSignal.timeout(5000),
    });
    const html = await response.text();
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = match?.[1]?.trim().replace(/\s+/g, ' ').substring(0, 60) || '';
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
