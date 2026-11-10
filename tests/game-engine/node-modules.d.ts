declare module "node:fs" {
  export function mkdirSync(path: string, options?: { recursive?: boolean }): string | undefined;
  export function writeFileSync(path: string, data: string): void;
}

declare module "node:path" {
  export function dirname(path: string): string;
  export function join(...paths: string[]): string;
}

declare module "node:url" {
  export function fileURLToPath(url: string | URL): string;
}
