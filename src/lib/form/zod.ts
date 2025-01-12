import { z } from 'zod'

export const accountSchema = z.object({
    username: z.string().min(3, { message: 'Mininum 3 characters' }).max(31, { message: 'Maximum 31 characters' }).regex(/^[a-z0-9_-]+$/, { message: 'Only characters from a-z, 0-9, underscores and dashes' }),
    password: z.string().min(6, { message: 'Minimum 6 characters' }).max(255, { message: 'Maximum 255 characters' }),
})