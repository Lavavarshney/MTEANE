import 'fastify';
import type { Organization } from '../db/queries/orgs';

declare module 'fastify' {
  interface FastifyRequest {
    org: Organization;
  }
}
