FROM node:lts-alpine AS base

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat git
# Set working directory
WORKDIR /app
# Replace <your-major-version> with the major version installed in your repository. For example:
# RUN yarn global add turbo@^2
RUN yarn global add turbo@^2
COPY . .

# Get the git commit hash before pruning (since .git might be removed)
RUN git rev-parse --short HEAD > /tmp/commit_hash || echo "unknown" > /tmp/commit_hash
 
# Generate a partial monorepo with a pruned lockfile for a target workspace.
# Assuming "web" is the name entered in the project's package.json: { name: "web" }
RUN turbo prune @hctv/web --docker
 
# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat git vips
# Get the commit hash from the builder stage
COPY --from=builder /tmp/commit_hash /tmp/commit_hash
# Read commit hash and set as build arg
ARG COMMIT_HASH_FILE=/tmp/commit_hash
RUN COMMIT_HASH=$(cat /tmp/commit_hash 2>/dev/null || echo "unknown") && \
    echo "COMMIT_HASH=$COMMIT_HASH" > /tmp/build_env
WORKDIR /app

# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
RUN yarn install --frozen-lockfile

COPY --from=builder /app/out/full/ .
RUN --mount=type=secret,id=TURBO_TOKEN --mount=type=secret,id=TURBO_TEAM \
    . /tmp/build_env && \
    export commit=$COMMIT_HASH && \
    TURBO_TOKEN=$(cat /run/secrets/TURBO_TOKEN) TURBO_TEAM=$(cat /run/secrets/TURBO_TEAM) yarn turbo run build --env-mode=loose
 
FROM base AS runner
WORKDIR /app

RUN apk add --no-cache ffmpeg vips

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Get the commit hash from the installer stage and create a startup script
COPY --from=installer /tmp/commit_hash /tmp/commit_hash
RUN COMMIT_VALUE=$(cat /tmp/commit_hash 2>/dev/null || echo "unknown") && \
    echo "#!/bin/sh" > /usr/local/bin/start.sh && \
    echo "export commit=$COMMIT_VALUE" >> /usr/local/bin/start.sh && \
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