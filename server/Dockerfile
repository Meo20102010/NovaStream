# Build server
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
COPY server/prisma ./prisma
RUN npm ci
COPY server/ .
RUN npx prisma generate
RUN npm run build

# Build client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build

# Production server
FROM node:20-alpine AS server
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/prisma ./prisma
COPY --from=server-builder /app/server/package.json ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/index.js"]

# Production client
FROM node:20-alpine AS client
WORKDIR /app
COPY --from=client-builder /app/client/.next ./.next
COPY --from=client-builder /app/client/node_modules ./node_modules
COPY --from=client-builder /app/client/package.json ./
COPY --from=client-builder /app/client/public ./public
COPY --from=client-builder /app/client/next.config.js ./
ENV NODE_ENV=production
EXPOSE 3001
CMD ["npm", "start"]
