import { createLoader, parseAsString } from 'nuqs/server'

export const searchParams = {
  tab: parseAsString.withDefault('general'),
}

export const loadSearchParams = createLoader(searchParams)