import { FastifyReply, FastifyRequest } from 'fastify';
import { findActiveKeyByHash, updateLastUsed } from '../resources/auth/auth.model';
import { hashApiKey } from '../utils/hash';
import { config } from '../config';

export const authPreHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const apiKeyHeader = request.headers['x-api-key'];

  if (!apiKeyHeader || typeof apiKeyHeader !== 'string') {
    return reply.status(401).send({ message: 'Missing x-api-key header' });
  }

  const keyHash = hashApiKey(apiKeyHeader, config.API_KEY_SECRET);
  const keyRecord = await findActiveKeyByHash(keyHash);

  if (!keyRecord) {
    return reply.status(403).send({ message: 'Invalid API key' });
  }

  if (!keyRecord.is_active) {
    return reply.status(403).send({ message: 'API key is inactive' });
  }

  request.org = keyRecord.organization;

  // Best-effort usage tracking; do not fail request if this update fails.
  void updateLastUsed(keyRecord.id).catch(() => {});
};
