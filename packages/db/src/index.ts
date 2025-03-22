// from https://www.prisma.io/docs/guides/turborepo

export { prisma } from './client.js' // exports instance of prisma 
export * from "../generated/client/default.js" // exports generated types from prisma