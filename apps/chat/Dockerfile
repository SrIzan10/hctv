FROM node:lts-alpine AS base

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN yarn global add turbo@^2
COPY . .

RUN turbo prune @hctv/chat --docker
 
FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app
 
# First install the dependencies
COPY --from=builder /app/out/json/ .
RUN yarn install --frozen-lockfile

COPY --from=builder /app/out/full/ .
RUN --mount=type=secret,id=TURBO_TOKEN --mount=type=secret,id=TURBO_TEAM TURBO_TOKEN=$(cat /run/secrets/TURBO_TOKEN) TURBO_TEAM=$(cat /run/secrets/TURBO_TEAM) yarn turbo run build
 
FROM base AS runner
WORKDIR /app

RUN apk add --no-cache curl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodeapp
USER nodeapp
 
COPY --from=installer --chown=nodeapp:nodejs /app/apps ./apps
COPY --from=installer --chown=nodeapp:nodejs /app/packages ./packages
COPY --from=installer --chown=nodeapp:nodejs /app/node_modules ./node_modules
COPY --from=installer --chown=nodeapp:nodejs /app/package.json ./package.json

ENV NODE_ENV=production

WORKDIR /app/apps/chat

EXPOSE 8000

ENTRYPOINT ["node", "dist/index.js"]