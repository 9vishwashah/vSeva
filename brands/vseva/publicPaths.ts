// Extra public website pages this brand serves without sign-in (rendered by ./PublicRoutes.tsx and prerendered
// at build time by scripts/prerender.mjs). Kept apart from PublicRoutes so App can check a path without
// loading the pages.
export const PUBLIC_PATHS: readonly string[] = ['/documentation', '/contact', '/support-us'];
