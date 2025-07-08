// from https://www.prisma.io/docs/guides/turborepo

export { prisma } from './client.js' // prisma instance 
export * from "../generated/client/index.js" // prisma generated types
export { getRedisConnection, closeRedisConnection } from './redis.js'; // redis connection stuff