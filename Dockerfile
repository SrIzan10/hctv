# Stage 1: Building the code
FROM node:lts-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy app files
COPY . .

# Build app
RUN yarn build

# Stage 2: Production
FROM node:lts-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/yarn.lock ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma

# Install production dependencies only
RUN apk add --no-cache openssl
RUN yarn install --frozen-lockfile --production && \
    yarn cache clean

# Remove unnecessary files
RUN rm -rf /app/.git \
    /app/.next/cache \
    /app/README.md

EXPOSE 3000

CMD ["yarn", "start"]