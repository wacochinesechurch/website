import type { ImageMetadata } from 'astro';

/* =========================================================================
   IMAGE RESOLUTION
   =========================================================================

   Content files refer to photographs by bare filename ("hotpot.webp") so a
   volunteer editing an event in the CMS never has to think about import
   paths. This maps those names onto real imported assets, which is what
   lets Astro generate responsive AVIF/WebP variants at build time.

   Photographs live in src/assets/ rather than public/ precisely so they go
   through that pipeline — a 1.4 MB screenshot becomes a ~60 KB AVIF at the
   size actually displayed.
   ========================================================================= */

const moments = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/moments/*.{webp,jpg,jpeg,png,avif}',
  { eager: true },
);

const uploads = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/uploads/*.{webp,jpg,jpeg,png,avif}',
  { eager: true },
);

/**
 * Resolve a filename (or a CMS-relative path) to an imported image.
 * Returns undefined rather than throwing, so one missing photo degrades to
 * a layout without an image instead of failing the whole build.
 */
export function resolveImage(src: string | undefined): ImageMetadata | undefined {
  if (!src) return undefined;

  // Tolerate the several shapes a CMS might write.
  const name = src.replace(/^\/?(src\/assets\/(moments|uploads)\/|images\/)/, '');

  return (
    moments[`/src/assets/moments/${name}`]?.default ??
    uploads[`/src/assets/uploads/${name}`]?.default ??
    undefined
  );
}

/** A CSS object-position string from a focal point, for art-directed crops. */
export function focalPosition(
  focus: { x: number; y: number } | undefined,
): string {
  if (!focus) return '50% 50%';
  return `${focus.x}% ${focus.y}%`;
}

export function allMomentImages(): string[] {
  return Object.keys(moments).map((k) => k.split('/').pop() ?? '');
}
