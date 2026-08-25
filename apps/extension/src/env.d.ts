/// <reference types="wxt" />
/// <reference types="wxt/browser" />
/// <reference types="vite/client" />
/// <reference path="../.wxt/types/globals.d.ts" />

declare module "*.css" {}

declare module "*.svg" {
  const src: string;
  export default src;
}

declare module "*.svg?raw" {
  const content: string;
  export default content;
}

declare module "*.svg?component" {
  const Icon: (props: Record<string, unknown>) => unknown;
  export default Icon;
}
