// from https://www.prisma.io/docs/guides/turborepo

export { prisma } from './client.js' // exports instance of prisma 
export * from "../generated/client/index.js" // exports generated types from prisma