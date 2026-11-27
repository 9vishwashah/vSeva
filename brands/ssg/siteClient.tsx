// SSG has no prerendered public website pages (scripts/prerender.mjs skips other brands), so index.tsx never calls this.
export function hydrateSite(_root: HTMLElement, _path: string): void {
  throw new Error('Shraman Seva Group has no prerendered website pages');
}
