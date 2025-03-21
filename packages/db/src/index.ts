// from https://www.prisma.io/docs/guides/turborepo

import { prisma } from './client'

export { prisma } from './client' // exports instance of prisma 
export * from "../generated/client" // exports generated types from prisma
export default prisma;