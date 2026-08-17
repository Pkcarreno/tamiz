# Architecture of Tamiz

## Monorepo Structure

The project uses a monorepo structure.
The structure separates the code into the `apps/` directory and the `packages/` directory.
The `apps/` directory holds the applications.
The `packages/` directory holds the shared libraries and the utilities.
The applications use these shared libraries.
Turborepo manages the build tasks, the type checks, and the tests across all workspaces.
Turborepo caches the task outputs.

## Package: @tamiz/html-converter

This package lives in the `packages/html-converter/` directory.
This package takes an HTML element and cleans it.
The package outputs markdown or clean HTML.
The package uses pure TypeScript.
The package uses tsdown to bundle the code.
The library does not depend on a browser or a framework.
The code runs in any JavaScript runtime.
The package exports multiple entry points.
These entry points include root, `./dom`, `./cleaner`, `./strategies/html`, and `./strategies/markdown`.
The code uses a strategy pattern for the output formats.
Each format acts as a separate strategy.

## App: @tamiz/extension

This application lives in the `apps/extension/` directory.
This application is the main browser extension.
This application provides the user interface to select and extract the web content.
The application uses the WXT framework, SolidJS, and Tailwind CSS v4.
The extension targets the Chrome browser and the Firefox browser.
The WXT framework exports Manifest Version 3 for Chrome and Manifest Version 2 for Firefox.
Do not force Manifest Version 3 on Firefox.
This workspace uses the `@tamiz/html-converter` package to convert the content.
The WXT framework uses the `background.ts` entry point for the background script.
The framework uses the `content.ts` entry point for the content script.
The content script contains the picker user interface.
A shadow DOM isolates the picker user interface from the host page styles.

## Cross-browser Strategy

The WXT framework manages the manifest version differences between browsers.
The architecture supports different approaches for the same feature in different browsers.
This design helps the codebase to scale.
This design prevents one browser constraint from causing a problem in another browser.

## Future Plans

A future website will use the `@tamiz/html-converter` package.
This website will show the conversion process without an extension.
This goal explains why the converter is a distinct package.

## Tests

Vitest runs the tests for all workspaces.
Developers put the test files next to the source files.
These test files have a `.test` suffix.

## Build Tools

The root workspace uses Turborepo to manage the tasks.
The root workspace uses Bun as the runtime and the package manager.
The `@tamiz/html-converter` workspace uses tsdown to bundle the library.
The `@tamiz/extension` workspace uses the WXT framework to build the extension.
The WXT framework uses Vite internally.

## Dependency Diagram

app: @tamiz/extension -> package: @tamiz/html-converter
app: future website -> package: @tamiz/html-converter
