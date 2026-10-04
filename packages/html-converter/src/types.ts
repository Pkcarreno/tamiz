/**
 * Supported output formats for HTML conversion.
 *
 * @public
 */
export type ConversionFormat = "markdown" | "html";

/**
 * Strategy contract for converting cleaned HTML to a specific format.
 *
 * @public
 */
export interface ConversionStrategy {
  /** Convert cleaned DOM content to target format */
  convert: (content: Element | Document) => string | Promise<string>;
}

/**
 * Configuration for the HTML converter.
 *
 * @public
 */
export interface ConverterOptions {
  /**
   * Whether to run the cleaning pipeline before conversion.
   * Defaults to true.
   */
  clean?: boolean;
  /**
   * Elements to exclude from conversion.
   */
  exclude?: Element[] | Set<Element>;
  /**
   * Output format identifier ("markdown" | "html").
   * Defaults to "markdown" when neither format nor strategy is specified.
   */
  format?: ConversionFormat;
  /**
   * Output format strategy.
   * Takes precedence over format when explicitly provided.
   */
  strategy?: ConversionStrategy;
}

/**
 * Isomorphic DOM parser abstraction.
 *
 * @public
 */
export interface DomParser {
  /** Parse an HTML string into a Document */
  parse: (html: string) => Document;
}
