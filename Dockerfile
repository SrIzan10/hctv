FROM oven/bun:alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install

# Copy app files
COPY . .

# Build app
RUN bun run build

# Stage 2: Production
FROM oven/bun:alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lockb ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# Install production dependencies only
RUN apk add --no-cache openssl
RUN bun pm cache rm && bun run prepare

# Remove unnecessary files
RUN rm -rf /app/.git \
    /app/.next/cache \
    /app/README.md

EXPOSE 3000

CMD ["bun", "start"]