declare module 'fastify-print-routes' {
  import type { FastifyPluginCallback } from 'fastify';

  const plugin: FastifyPluginCallback;
  export default plugin;
}
