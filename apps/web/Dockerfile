FROM node:lts-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
# Set working directory
WORKDIR /app
RUN pnpm add -g turbo@^2
COPY . .

# Get the git commit hash before pruning (since .git might be removed)
RUN git rev-parse --short HEAD > /tmp/commit_hash || echo "unknown" > /tmp/commit_hash
 
# Generate a partial monorepo with a pruned lockfile for a target workspace.
# Assuming "web" is the name entered in the project's package.json: { name: "web" }
RUN turbo prune @hctv/web --docker
 
# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    libvips-dev \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
# Get the commit hash from the builder stage
COPY --from=builder /tmp/commit_hash /tmp/commit_hash
WORKDIR /app

# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .
RUN --mount=type=secret,id=TURBO_TOKEN --mount=type=secret,id=TURBO_TEAM --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    COMMIT=$(cat /tmp/commit_hash 2>/dev/null || echo "unknown") && \
    TURBO_TOKEN=$(cat /run/secrets/TURBO_TOKEN) TURBO_TEAM=$(cat /run/secrets/TURBO_TEAM) \
    SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN) \
    commit=$COMMIT yarn turbo run build --env-mode=loose
 
FROM base AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libvips42 \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

# Copy Prisma files for migrations
COPY --from=installer --chown=nextjs:nodejs /app/packages/db/prisma ./packages/db/prisma
COPY --from=installer --chown=nextjs:nodejs /app/packages/db/generated ./packages/db/generated
COPY --from=installer --chown=nextjs:nodejs /app/packages/db/package.json ./packages/db/package.json
COPY --from=installer --chown=nextjs:nodejs /app/node_modules ./node_modules

COPY --from=installer /tmp/commit_hash /tmp/commit_hash
RUN COMMIT_VALUE=$(cat /tmp/commit_hash 2>/dev/null || echo "unknown") && \
    echo "#!/bin/sh" > /usr/local/bin/start.sh && \
    echo "set -e" >> /usr/local/bin/start.sh && \
    echo "echo 'Running database migrations...'" >> /usr/local/bin/start.sh && \
    echo "pnpm prisma migrate deploy --schema=/app/packages/db/prisma/schema.prisma" >> /usr/local/bin/start.sh && \
    echo "cd /app" >> /usr/local/bin/start.sh && \
    echo "export commit=$COMMIT_VALUE" >> /usr/local/bin/start.sh && \
    echo "echo 'Starting Next.js application...'" >> /usr/local/bin/start.sh && \
    echo "exec node apps/web/server.js" >> /usr/local/bin/start.sh && \
    chmod +x /usr/local/bin/start.sh

USER nextjs
 
# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --chown=nextjs:nodejs apps/web/emojis.json .
 
CMD ["/usr/local/bin/start.sh"]