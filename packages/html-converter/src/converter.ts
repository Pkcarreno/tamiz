import { cleanHtml } from "./cleaner";
import { getDomParser } from "./dom";
import type { ConverterOptions, DomParser } from "./types";

/**
 * Convert an HTML string to the desired output format.
 *
 * When `options.clean` is not explicitly `false`, the HTML is first
 * passed through the {@link cleanHtml} extraction pipeline — which
 * removes scripts, styles, navigation, ads and sidebars, filters by
 * content density, and strips non-semantic attributes.
 *
 * The resulting (or original) HTML is then parsed once more and handed
 * to the strategy's `convert` method.
 *
 * @public
 */
export async function convert(
  html: string,
  options: ConverterOptions
): Promise<string> {
  const parser: DomParser = getDomParser();

  const cleaned = options.clean === false ? html : cleanHtml(html);
  const cleanedDoc = parser.parse(cleaned);

  return await options.strategy.convert(cleanedDoc);
}
