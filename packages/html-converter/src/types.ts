/** Strategy contract for converting cleaned HTML to a specific format */
export interface ConversionStrategy {
  /** Convert cleaned DOM content to target format */
  convert: (content: Element | Document) => string | Promise<string>;
}

/** Configuration for the HTML converter */
export interface ConverterOptions {
  /** Whether to run the cleaning pipeline before conversion. Defaults to true */
  clean?: boolean;
  /** Output format strategy */
  strategy: ConversionStrategy;
}

/** Isomorphic DOM parser abstraction */
export interface DomParser {
  /** Parse an HTML string into a Document */
  parse: (html: string) => Document;
}
