# src

The server. Nothing here reads the environment or opens a port except `main.ts`.

```text
main.ts        entry point: configuration, container, HTTP server and graceful stop
container.ts   composition root: creates every part and hands it what it needs
module-routes.ts the routes of every module, built from the container's parts, in mounting order
app.ts         the Hono application: middleware every request crosses, then the modules
config.ts      reads and validates the environment
logger.ts      JSON logger, one object per line
http/          request plumbing shared by every module (see http/README.md)
platform/      database, clock and session secret (see platform/README.md)
modules/       one folder per feature, each with its routes (see modules/README.md)
```

## Rules

- Parts are created by factories (`createX(dependencies)`) and receive their dependencies;
  only `container.ts` calls the factories, and `module-routes.ts` builds the routes from them.
- Anything that reaches outside the process (PayPal, the network, time, randomness) is passed
  in, so tests replace it through `Overrides`.
- Imports carry their `.ts` extension; types are imported with `import type`.
