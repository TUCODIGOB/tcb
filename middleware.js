export function middleware(request) {
  const url = new URL(request.url);
  if (/\.[a-z0-9]+$/i.test(url.pathname)) return;
  const lower = url.pathname.toLowerCase();
  if (lower !== url.pathname) {
    url.pathname = lower;
    return Response.redirect(url.toString(), 301);
  }
}