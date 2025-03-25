FROM node:lts-alpine AS base

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
# Set working directory
WORKDIR /app
RUN yarn global add turbo@^2
COPY . .
 
# Generate a partial monorepo with a pruned lockfile for the db package
RUN turbo prune @hctv/db --docker
 
FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app
 
# First install the dependencies
COPY --from=builder /app/out/json/ .
RUN yarn install --frozen-lockfile

COPY --from=builder /app/out/full/ .
RUN --mount=type=secret,id=TURBO_TOKEN --mount=type=secret,id=TURBO_TEAM TURBO_TOKEN=$(cat /run/secrets/TURBO_TOKEN) TURBO_TEAM=$(cat /run/secrets/TURBO_TEAM) yarn turbo run build --filter=@hctv/db
 
FROM base AS runner
WORKDIR /app
 
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 prisma
USER prisma
 
COPY --from=installer --chown=prisma:nodejs /app/packages ./packages
COPY --from=installer --chown=prisma:nodejs /app/node_modules ./node_modules
COPY --from=installer --chown=prisma:nodejs /app/package.json ./package.json

# Set environment variables for database connection
ENV NODE_ENV=production

# Set the working directory to the db package
WORKDIR /app/packages/db

# Run Prisma migrations as the entrypoint
ENTRYPOINT ["npx", "prisma", "migrate", "deploy"]