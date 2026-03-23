// Auth0 v4 handles all auth routes via middleware.
// This file exists to ensure the route segment exists for Next.js routing.
// The actual handling happens in middleware.ts via auth0.middleware().

export function GET() {
  // This should never be reached — middleware intercepts /api/auth/* requests
  return new Response("Auth route handled by middleware", { status: 200 });
}
