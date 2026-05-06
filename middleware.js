export const middleware = (req) => {
  const url = new URL(req.url);

      // If the request is for /api/*, don't rewrite it
        if (url.pathname.startsWith('/api/')) {
            return null; // Let the API handler deal with it
              }

                  // For all other requests, serve the React app
                    return null; // Let the default handler take over
                    };

                    export const config = {
                      matcher: [
                          /*
                               * Match all request paths except for the ones starting with:
                                    * - api (API routes)
                                         * - _next/static (static files)
                                              * - _next/image (image optimization files)
                                                   * - favicon.ico (favicon file)
                                                        */
                                                            '/((?!api|_next/static|_next/image|favicon.ico).*)',
                                                              ],
                                                              };
