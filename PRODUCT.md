# Product

## Platform

Web.

## Users

Writers, researchers, developers, and knowledge workers use this extension. They extract web content for documentation, reading, or AI tools.

## Product Purpose

Tamiz gets clean, readable content from web pages. The extension name comes from the Spanish word for a fine sieve. The extension filters out ads, navigation menus, and unnecessary data. The user selects an HTML element. The extension converts the element to markdown or clean HTML.

## Positioning

The visual element picker is the core feature. The picker gives the user precise control over the content they capture. The extension converts the selected content into clean text. This process is fast and easy.

## Operating Context

- The browser extension runs in Chrome and Firefox.
- The user starts the picker with a context menu, the extension icon, or a keyboard shortcut.
- A picker overlay shows on the current page.
- The user moves the mouse to highlight an element.
- The user clicks the element to select it.
- A floating action bar shows options to copy, download, and change the output format.
- The extension sends the output to the clipboard or downloads a file.
- The extension works on all web pages (`<all_urls>`).

## Capabilities and Constraints

- Element picker: The UI highlights elements on hover and selects them on click. The state machine moves from IDLE to HIGHLIGHTING to SELECTED.
- Format output: The `@tamiz/html-converter` package converts the content.
- Copy to clipboard: The primary action copies text with one click.
- Download as file: The secondary action downloads a `.md` or `.html` file.
- Shadow DOM isolation: The picker UI does not change the host page styles.
- Cross-browser support: The build system exports Manifest V3 for Chrome and Manifest V2 for Firefox.
- Data privacy: All data processing occurs locally. The extension makes no network requests.
- Permissions: The extension uses `activeTab`, `contextMenus`, `scripting`, and `downloads`.

## Brand Commitments

- Name: Tamiz is a sieve that removes noise and keeps the signal.
- Voice: The tone is direct, technical, and professional.
- Visual direction: The interface uses a clean, modern aesthetic similar to macOS native applications.
- Logo: The icon (`src/assets/icon.svg`) shows a sieve that lets fine particles pass through.

## Product Principles

1. Signal over noise: The design must reduce cognitive load and show the important content.
2. Zero friction: The steps from activation to copy must be short.
3. Local-first: The extension does not send data to the internet.
4. Precision control: The user chooses the exact content to capture.
5. Native feel: The extension looks like a standard part of the browser.

## Accessibility and Inclusion

- Keyboard navigation: The extension treats keyboard control as a core priority. The user can operate the full picker flow with the keyboard.
- Screen readers: The floating bar must have ARIA labels.
- Visual contrast: The highlight box must have high contrast.
- Standard compliance: The extension targets the WCAG 2.1 AA standard.
