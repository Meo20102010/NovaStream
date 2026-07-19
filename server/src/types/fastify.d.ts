import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      role: string;
      email: string;
    };
  }

  interface FastifyInstance {
    jwt: {
      sign: (payload: Record<string, any>, options?: Record<string, any>) => string;
      verify: <T = Record<string, any>>(token: string) => T;
    };
  }
}
