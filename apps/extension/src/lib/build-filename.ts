const TRAILING_HYPHENS = /-+$/;

/**
 * Input sources for filename generation.
 *
 * @public
 */
export interface FilenameSource {
  /** Article name from og:article:title or meta[name="title"]. */
  articleName?: string;
  /** The user-selected DOM element. Used for heading extraction. */
  element: Element;
  /** Page title from document.title. Always available. */
  pageTitle: string;
  /** Twitter title from meta[name="twitter:title"]. */
  twitterTitle?: string;
}

/**
 * Extract the first heading text from the element.
 *
 * @param element - The DOM element to search for headings.
 * @returns The trimmed heading text or null if no heading found.
 * @public
 */
export function extractFirstHeading(element: Element): string | null {
  const heading = element.querySelector("h1, h2, h3, h4, h5, h6");
  const text = heading?.textContent?.trim();
  return text && text.length > 0 ? text : null;
}

/**
 * Extract the article name from meta tags.
 *
 * @param document - The document to search for meta tags.
 * @returns The trimmed article name or null if not found.
 * @public
 */
export function extractArticleName(document: Document): string | null {
  const ogArticleTitle = document.querySelector(
    'meta[property="og:article:title"]'
  ) as HTMLMetaElement | null;
  if (ogArticleTitle?.content) {
    const text = ogArticleTitle.content.trim();
    if (text.length > 0) {
      return text;
    }
  }

  const metaTitle = document.querySelector(
    'meta[name="title"]'
  ) as HTMLMetaElement | null;
  if (metaTitle?.content) {
    const text = metaTitle.content.trim();
    if (text.length > 0) {
      return text;
    }
  }

  return null;
}

/**
 * Extract the Twitter title from meta tags.
 *
 * @param document - The document to search for meta tags.
 * @returns The trimmed Twitter title or null if not found.
 * @public
 */
export function extractTwitterTitle(document: Document): string | null {
  const metaTwitterTitle = document.querySelector(
    'meta[name="twitter:title"]'
  ) as HTMLMetaElement | null;
  if (metaTwitterTitle?.content) {
    const text = metaTwitterTitle.content.trim();
    if (text.length > 0) {
      return text;
    }
  }

  return null;
}

/**
 * Convert text to a URL-friendly slug.
 *
 * @param text - The text to convert.
 * @returns A lowercase slug with hyphens as separators.
 * @public
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Truncate a slug to fit within a total filename length limit.
 *
 * @param slug - The slug to truncate.
 * @param extension - The file extension (without dot).
 * @param maxTotalLength - Maximum total filename length including extension.
 * @returns The truncated slug or "untitled" if truncation is impossible.
 * @public
 */
export function truncateSlug(
  slug: string,
  extension: string,
  maxTotalLength = 100
): string {
  const maxSlugLength = maxTotalLength - extension.length - 1;
  if (maxSlugLength <= 0) {
    return "untitled";
  }
  if (slug.length <= maxSlugLength) {
    return slug;
  }
  return slug.slice(0, maxSlugLength).replace(TRAILING_HYPHENS, "");
}

/**
 * Build a filename from content sources using a priority chain.
 *
 * @param source - The content sources to use for filename generation.
 * @param extension - The file extension (without dot).
 * @returns The generated filename.
 * @public
 */
export function buildFilename(
  source: FilenameSource,
  extension: string
): string {
  const heading = extractFirstHeading(source.element);
  if (heading) {
    const slug = slugify(heading);
    return `${truncateSlug(slug, extension)}.${extension}`;
  }

  if (source.articleName) {
    const slug = slugify(source.articleName);
    return `${truncateSlug(slug, extension)}.${extension}`;
  }

  if (source.twitterTitle) {
    const slug = slugify(source.twitterTitle);
    return `${truncateSlug(slug, extension)}.${extension}`;
  }

  if (source.pageTitle) {
    const slug = slugify(source.pageTitle);
    return `${truncateSlug(slug, extension)}.${extension}`;
  }

  return `tamiz-untitled.${extension}`;
}
