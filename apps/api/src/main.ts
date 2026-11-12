import { serve } from '@hono/node-server';

import { loadConfig } from './config.ts';
import { createContainer } from './container.ts';
import { createLogger } from './logger.ts';

const config = loadConfig(process.env);
const logger = createLogger(config.logLevel);
const container = await createContainer(config, logger);

const server = serve(
  { fetch: container.app.fetch, hostname: config.host, port: config.port },
  (address) => {
    logger.info('listening', {
      host: address.address,
      port: address.port,
      paypal:
        Object.keys(config.payments.merchants).length > 0
          ? config.payments.environment
          : 'not configured',
    });
  },
);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    logger.info('stopping', { signal });
    server.close(() => {
      container.close();
      process.exit(0);
    });
  });
}
