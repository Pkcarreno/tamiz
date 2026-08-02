import { getContentNodes, isStructuralElement, NODE_TYPE } from "../dom";
import type { ConversionStrategy } from "../types";

/**
 * Regex of characters that have special meaning in CommonMark.
 * Applied to raw text nodes so user content is never accidentally
 * interpreted as Markdown syntax. The period (`.`) is deliberately
 * omitted — it is only a list marker at line start and is common
 * in prose. The slash (`/`) is not a Markdown character.
 *
 * Note: `-` is NOT escaped here — it is only special at line start
 * (list markers, thematic breaks) or in emphasis, not mid-word.
 */
const MARKDOWN_ESCAPE_PATTERN = /[\\`*_{}[\]()#+!|>]/g;

/** Block-level HTML tags that produce line breaks in Markdown */
const BLOCK_TAGS: ReadonlySet<string> = new Set([
  "article",
  "aside",
  "blockquote",
  "div",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "td",
  "th",
  "tr",
  "ul",
]);

/** Regex to extract language from code class attribute (e.g., "language-javascript") */
const LANGUAGE_CLASS_PATTERN = /language-(\w+)/;

/** Escape Markdown special characters inside a text node */
function escapeMarkdown(text: string): string {
  return text.replace(MARKDOWN_ESCAPE_PATTERN, "\\$&");
}

/**
 * Render the inline content of an element as Markdown.
 *
 * Walks children in inline mode — no extra newlines between siblings.
 * Handles `<a>`, `<strong>`, `<em>`, `<code>`, `<img>`, and text nodes.
 */
function renderInline(node: Node): string {
  if (node.nodeType === NODE_TYPE.TEXT) {
    return escapeMarkdown(node.textContent ?? "");
  }

  if (node.nodeType !== NODE_TYPE.ELEMENT) {
    return "";
  }

  const element = node as Element;
  const tag = element.tagName.toLowerCase();

  switch (tag) {
    case "a": {
      const href = element.getAttribute("href");
      const text = renderInlineChildren(element);
      return href ? `[${text}](${href})` : text;
    }

    case "strong":
    case "b":
      return `**${renderInlineChildren(element)}**`;

    case "em":
    case "i":
    case "u":
      return `*${renderInlineChildren(element)}*`;

    case "code":
      // Inline code is never parsed as Markdown
      return `\`${element.textContent ?? ""}\``;

    case "img": {
      const src = element.getAttribute("src") ?? "";
      const alt = element.getAttribute("alt") ?? "";
      return `![${alt}](${src})`;
    }

    case "br":
      return "\n";
    default:
      // Unknown / generic inline elements — process children
      return renderInlineChildren(element);
  }
}

/** Concatenate inline-rendered children of an element,
 * skipping linkedom's auto-generated structural tags. */
function renderInlineChildren(element: Element): string {
  return Array.from(element.childNodes)
    .filter((child) => !isStructuralElement(child))
    .map((child) => renderInline(child))
    .join("");
}

/**
 * Render a list (ordered or unordered) including nested sub-lists.
 *
 * Nested lists are indented by two spaces on every line so that
 * Markdown renderers display them at the correct level.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: list rendering is inherently complex
function renderList(element: Element, ordered: boolean): string {
  const items = Array.from(element.children).filter(
    (child) => child.tagName.toLowerCase() === "li"
  );

  if (items.length === 0) {
    return "";
  }

  const lines: string[] = [];

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const marker = ordered ? `${i + 1}. ` : "- ";

    // Separate inline text from nested block-level content
    const inlineParts: string[] = [];
    const nestedBlocks: string[] = [];

    for (const child of Array.from(item.childNodes)) {
      if (isStructuralElement(child)) {
        continue;
      }
      if (child.nodeType === NODE_TYPE.ELEMENT) {
        const childTag = (child as Element).tagName.toLowerCase();

        if (childTag === "ul" || childTag === "ol") {
          const nested = renderList(child as Element, childTag === "ol");
          if (nested.trim()) {
            nestedBlocks.push(nested);
          }
        } else if (BLOCK_TAGS.has(childTag)) {
          const blockResult = renderBlock(child as Element);
          if (blockResult.trim()) {
            inlineParts.push(blockResult.trim());
          }
        } else {
          const inline = renderInline(child);
          if (inline.trim()) {
            inlineParts.push(inline.trim());
          }
        }
      } else if (child.nodeType === NODE_TYPE.TEXT) {
        const text = (child.textContent ?? "").trim();
        if (text) {
          inlineParts.push(escapeMarkdown(text));
        }
      }
    }

    const content = inlineParts.join(" ");
    lines.push(`${marker}${content}`);

    // Nested lists are indented two spaces per level
    for (const nestedBlock of nestedBlocks) {
      for (const line of nestedBlock.split("\n")) {
        if (line.trim()) {
          lines.push(`  ${line}`);
        }
      }
    }
  }

  return `${lines.join("\n")}\n\n`;
}

/**
 * Convert an HTML `<table>` element into a GitHub-Flavoured Markdown table.
 *
 * The first row is treated as the header. Pipes inside cell text are
 * escaped so the table structure is never broken.
 */
function renderTable(element: Element): string {
  const rows = Array.from(element.querySelectorAll("tr"));

  if (rows.length === 0) {
    return "";
  }

  const tableData: string[][] = [];

  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll("th, td"));
    const cellTexts = cells.map((cell) =>
      (cell.textContent ?? "").trim().replace(/\|/g, "\\|")
    );
    if (cellTexts.length > 0) {
      tableData.push(cellTexts);
    }
  }

  if (tableData.length === 0) {
    return "";
  }

  const lines: string[] = [
    `| ${tableData[0].join(" | ")} |`,
    `| ${tableData[0].map(() => "---").join(" | ")} |`,
  ];

  for (let i = 1; i < tableData.length; i += 1) {
    lines.push(`| ${tableData[i].join(" | ")} |`);
  }

  return `${lines.join("\n")}\n\n`;
}

/**
 * Render an element as block-level Markdown.
 *
 * Each call returns a string terminated by two newlines so that blocks
 * join cleanly without extra spacing logic at the call site.
 */
function renderBlock(node: Node): string {
  if (node.nodeType === NODE_TYPE.TEXT) {
    const text = (node.textContent ?? "").trim();
    return text ? `${escapeMarkdown(text)}\n\n` : "";
  }

  if (node.nodeType !== NODE_TYPE.ELEMENT) {
    return "";
  }

  const element = node as Element;
  const tag = element.tagName.toLowerCase();

  switch (tag) {
    case "h1":
      return `# ${renderInlineChildren(element)}\n\n`;

    case "h2":
      return `## ${renderInlineChildren(element)}\n\n`;

    case "h3":
      return `### ${renderInlineChildren(element)}\n\n`;

    case "h4":
      return `#### ${renderInlineChildren(element)}\n\n`;

    case "h5":
      return `##### ${renderInlineChildren(element)}\n\n`;

    case "h6":
      return `###### ${renderInlineChildren(element)}\n\n`;

    case "p":
      return `${renderInlineChildren(element)}\n\n`;

    case "pre": {
      // <pre> may contain <code class="language-xxx">
      const code = element.querySelector("code");
      const langClass = code?.getAttribute("class") ?? "";
      const langMatch = langClass.match(LANGUAGE_CLASS_PATTERN);
      const lang = langMatch ? langMatch[1] : "";
      const codeText = code
        ? (code.textContent ?? "")
        : (element.textContent ?? "");
      return `\`\`\`${lang}\n${codeText}\n\`\`\`\n\n`;
    }

    case "blockquote":
      return `> ${renderInlineChildren(element).trim()}\n\n`;

    case "hr":
      return "---\n\n";

    case "ul":
      return renderList(element, false);

    case "ol":
      return renderList(element, true);

    case "table":
      return renderTable(element);

    case "img": {
      const src = element.getAttribute("src") ?? "";
      const alt = element.getAttribute("alt") ?? "";
      return `![${alt}](${src})\n\n`;
    }

    case "li":
    case "td":
    case "th":
    case "tr":
    case "thead":
    case "tbody":
      // List items / table cells are handled by their parent renderer
      return "";
    default:
      // Process children so nested structure is preserved
      return renderChildren(element);
  }
}

/**
 * Render all children of an element, dispatching each child to
 * block-level or inline rendering based on its tag name.
 *
 * Block tags (p, div, h1–h6, …) produce their own Markdown blocks;
 * inline tags (a, strong, em, code, …) and bare text nodes are
 * rendered inline and separated from siblings by blank lines.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: block/inline dispatch is inherently complex
function renderChildren(element: Element): string {
  const parts: string[] = [];

  for (const child of Array.from(element.childNodes)) {
    if (isStructuralElement(child)) {
      continue;
    }
    if (child.nodeType === NODE_TYPE.TEXT) {
      const text = (child.textContent ?? "").trim();
      if (text) {
        parts.push(`${escapeMarkdown(text)}\n\n`);
      }
    } else if (child.nodeType === NODE_TYPE.ELEMENT) {
      const tag = (child as Element).tagName.toLowerCase();
      if (BLOCK_TAGS.has(tag)) {
        const blockResult = renderBlock(child as Element);
        if (blockResult.trim()) {
          parts.push(blockResult);
        }
      } else {
        // Inline element appearing at block level
        const inlineResult = renderInline(child);
        if (inlineResult.trim()) {
          parts.push(`${inlineResult}\n\n`);
        }
      }
    }
  }

  return parts.join("");
}

/**
 * Markdown conversion strategy.
 *
 * Traverses the cleaned DOM tree and emits CommonMark-compatible
 * Markdown with proper nesting for lists, code blocks, and tables.
 *
 * @public
 */
export const markdownStrategy: ConversionStrategy = {
  convert(content: Element | Document): string {
    const nodes = getContentNodes(content);
    if (nodes.length === 0) {
      return "";
    }

    let output = "";
    for (const node of nodes) {
      output += renderBlock(node);
    }

    // Single trailing newline — Markdown renderers don't need more
    return `${output.trimEnd()}\n`;
  },
};
