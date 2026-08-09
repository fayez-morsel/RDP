/** Minimal local development bindings. Production supplies the concrete Cloudflare types. */
type D1Database = any;
type Fetcher = { fetch(input: Request): Promise<Response> };

declare module "cloudflare:workers" {
  export const env: { DB?: D1Database };
}
