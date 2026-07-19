import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const statusCode = error.statusCode || 500;

  request.log.error({
    err: error,
    request: {
      method: request.method,
      url: request.url,
    },
  });

  reply.status(statusCode).send({
    success: false,
    error: {
      message: error.message || 'Internal Server Error',
      statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
  });
}
