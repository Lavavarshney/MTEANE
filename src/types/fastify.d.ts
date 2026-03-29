import 'fastify';
import type { Organization } from '../resources/auth/auth.model';

declare module 'fastify' {
  interface FastifyRequest {
    org: Organization;
  }
}
