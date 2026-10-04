# Domain Glossary

This document defines core domain terminology for the Tamiz codebase. All modules, interfaces, tests, and documentation must use these terms consistently.

## Domain Concepts

### Picker
The visual interface and state machine that lets users inspect, highlight, and select an HTML element on any web page.

### Picker Session
The active lifecycle of an element capture. A session tracks the target element, user exclusions, active output format, and lifecycle state (`IDLE`, `HIGHLIGHTING`, `SELECTED`).

### Exclusion
A child DOM node within the selected element that the user explicitly marks to omit from the exported output.

### Adornment
Visual feedback rendered directly into the host document page (not inside the shadow DOM). Adornment includes the dimming scrim, hover outline, selection boundary, exclusion markers, and crosshair cursor.

### Scrim
A semi-transparent, full-viewport backdrop injected into the host page to dim background content and focus attention on the selected element.

### Converter
The agnostic transformation engine (`@tamiz/html-converter`) that cleans, normalizes, and translates DOM trees or HTML strings into structured text formats.

### Conversion Strategy
A concrete format adapter (such as `markdownStrategy` or `htmlStrategy`) that transforms a cleaned DOM tree into output text.

### Blocker
The script injected into the main execution world (`main-world.ts`) to intercept pointer clicks and keyboard events while the picker is active, preventing accidental page navigation.

### Channel
A typed bidirectional messaging abstraction (`Channel<TSend, TReceive>`) connecting isolated execution contexts (content scripts, service workers, main-world scripts).
