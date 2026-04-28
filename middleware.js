export function middleware(request) {
  const url = request.nextUrl.clone();
  const lower = url.pathname.toLowerCase();
  if (lower !== url.pathname) {
    url.pathname = lower;
    return Response.redirect(url, 301);
  }
}