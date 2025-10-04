addEventListener('fetch', event => {
  event.respondWith(handleEvent(event));
});

async function handleEvent(event) {
  const url = new URL(event.request.url);

  // Try to serve static asset from the Sites binding
  try {
    const response = await fetch(url.href);
    if (response && response.status === 200) return response;
  } catch (e) {
    // ignore and fallback to index.html
  }

  // SPA fallback: serve index.html
  const index = await fetch(new URL('/index.html', url.origin).toString());
  const headers = new Headers(index.headers);
  headers.set('Cache-Control', 'no-cache');
  return new Response(await index.arrayBuffer(), {
    status: index.status,
    statusText: index.statusText,
    headers,
  });
}
