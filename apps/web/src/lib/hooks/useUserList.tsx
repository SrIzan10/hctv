
'use client'

import useSWR, { mutate as globalMutate } from 'swr'
import { useCallback, useMemo } from 'react'
import type { StreamInfoResponse } from '@/lib/providers/StreamInfoProvider'
import { fetcher } from '@/lib/services/swr'

// Cache utility functions
const CACHE_KEYS = {
  ALL_CHANNELS: 'stream-info:all',
  OWNED_CHANNELS: 'stream-info:owned',
  LIVE_CHANNELS: 'stream-info:live',
  PERSONAL_CHANNELS: 'stream-info:personal',
} as const

// Error types for better error handling
export interface StreamInfoError extends Error {
  status?: number
  statusText?: string
  info?: any
}

// Create a cache key based on options
function createCacheKey(options: UseUserListOptions): string {
  const params = []
  if (options.owned) params.push('owned')
  if (options.personal) params.push('personal')
  if (options.live) params.push('live')
  if (options.username) params.push(`user-${options.username}`)
  
  return params.length > 0 
    ? `stream-info:${params.join('-')}` 
    : CACHE_KEYS.ALL_CHANNELS
}

// Enhanced fetcher with proper error handling
async function enhancedFetcher(url: string): Promise<StreamInfoResponse> {
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as StreamInfoError
      error.status = response.status
      error.statusText = response.statusText
      
      // Try to get error details from response
      try {
        error.info = await response.json()
      } catch {
        // If response is not JSON, that's fine
      }
      
      throw error
    }
    
    const data = await response.json()
    
    // Validate that response is an array
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format: expected array')
    }
    
    return data
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Unknown error occurred while fetching stream info')
  }
}

export interface UseUserListOptions {
  /** Only fetch channels owned by the current user */
  owned?: boolean
  /** Include personal channels */
  personal?: boolean
  /** Only fetch live channels */
  live?: boolean
  /** Search for a specific user's streaminfo */
  username?: string
  /** Refresh interval in milliseconds */
  refreshInterval?: number
  /** Cache time to live in milliseconds (default: 5 minutes) */
  cacheTTL?: number
  /** Whether to revalidate on focus (default: false) */
  revalidateOnFocus?: boolean
  /** Whether to revalidate on reconnect (default: true) */
  revalidateOnReconnect?: boolean
  /** Whether to dedupe requests (default: true) */
  dedupingInterval?: number
  /** Whether to use background revalidation (default: true) */
  revalidateIfStale?: boolean
  /** Whether to pause fetching (default: false) */
  isPaused?: boolean
  /** Custom error retry count (default: 3) */
  errorRetryCount?: number
  /** Custom error retry interval in milliseconds (default: 5000) */
  errorRetryInterval?: number
  /** Whether to refresh when hidden (default: false) */
  refreshWhenHidden?: boolean
  /** Whether to refresh when offline (default: false) */
  refreshWhenOffline?: boolean
}

export interface UseUserListReturn {
  /** Array of channels/streams */
  channels: StreamInfoResponse
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error?: StreamInfoError
  /** Whether this is the first load */
  isValidating: boolean
  /** Manually refresh the data */
  refresh: () => Promise<StreamInfoResponse | undefined>
  /** Clear the cache for this query */
  clearCache: () => Promise<void>
  /** Prefetch data without triggering rerender */
  prefetch: () => Promise<StreamInfoResponse | undefined>
  /** Total number of channels */
  totalChannels: number
  /** Number of live channels */
  liveChannels: number
  /** Cache key for this query */
  cacheKey: string
  /** Last updated timestamp */
  lastUpdated: Date | null
  /** Whether data is being fetched in background */
  isBackgroundFetching: boolean
}

export function useUserList(options: UseUserListOptions = {}): UseUserListReturn {
  const { 
    owned = false, 
    personal = false, 
    live = false, 
    username,
    refreshInterval = 30000,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    revalidateOnFocus = false,
    revalidateOnReconnect = true,
    dedupingInterval = 2000, // 2 seconds
    revalidateIfStale = true,
    isPaused = false,
    errorRetryCount = 3,
    errorRetryInterval = 5000,
    refreshWhenHidden = false,
    refreshWhenOffline = false,
  } = options

  // Build query parameters
  const params = useMemo(() => {
    const searchParams = new URLSearchParams()
    if (owned) searchParams.set('owned', 'true')
    if (personal) searchParams.set('personal', 'true')
    if (live) searchParams.set('live', 'true')
    if (username) searchParams.set('username', username)
    return searchParams
  }, [owned, personal, live, username])

  const queryString = params.toString()
  const url = `/api/stream/info${queryString ? `?${queryString}` : ''}`
  const cacheKey = createCacheKey(options)

  // SWR configuration with enhanced error handling
  const swrConfig = useMemo(() => ({
    refreshInterval: isPaused ? 0 : refreshInterval,
    revalidateOnFocus,
    revalidateOnReconnect,
    dedupingInterval,
    revalidateIfStale,
    errorRetryCount,
    errorRetryInterval,
    refreshWhenHidden,
    refreshWhenOffline,
    keepPreviousData: true,
    fallbackData: [] as StreamInfoResponse,
    
    // Custom error retry logic
    onErrorRetry: (error: StreamInfoError, key: string, config: any, revalidate: any, { retryCount }: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error.status && error.status >= 400 && error.status < 500) {
        return
      }

      // Don't retry on network errors after max attempts
      if (retryCount >= errorRetryCount) {
        return
      }

      // Exponential backoff with jitter
      const timeout = Math.min(errorRetryInterval * Math.pow(2, retryCount), 30000)
      const jitter = Math.random() * 1000
      
      setTimeout(() => revalidate({ retryCount }), timeout + jitter)
    },

    // Success callback for metrics/logging
    onSuccess: (data: StreamInfoResponse, key: string, config: any) => {
      // Could add analytics/metrics here
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[useUserList] Successfully fetched ${data.length} channels for key: ${key}`)
      }
    },

    // Error callback for logging
    onError: (error: StreamInfoError, key: string, config: any) => {
      // Log errors for monitoring
      console.error(`[useUserList] Error fetching data for key ${key}:`, error)
      
      // Could send to error tracking service here
      if (process.env.NODE_ENV === 'production') {
        // e.g., Sentry.captureException(error)
      }
    },
  }), [
    isPaused,
    refreshInterval, 
    revalidateOnFocus, 
    revalidateOnReconnect, 
    dedupingInterval, 
    revalidateIfStale,
    errorRetryCount,
    errorRetryInterval,
    refreshWhenHidden,
    refreshWhenOffline,
  ])

  const { data, error, isLoading, isValidating, mutate } = useSWR<StreamInfoResponse, StreamInfoError>(
    isPaused ? null : url,
    enhancedFetcher,
    swrConfig
  )

  // Memoized computed values
  const computedValues = useMemo(() => {
    const channels = data || []
    return {
      totalChannels: channels.length,
      liveChannels: channels.filter(stream => stream.isLive).length,
      lastUpdated: channels.length > 0 ? new Date() : null,
    }
  }, [data])

  // Memoized action functions
  const refresh = useCallback(async () => {
    try {
      return await mutate()
    } catch (error) {
      console.error('[useUserList] Error during manual refresh:', error)
      throw error
    }
  }, [mutate])

  const clearCache = useCallback(async () => {
    try {
      await mutate(undefined, { revalidate: false })
      // Also clear from global cache if needed
      await globalMutate(
        key => typeof key === 'string' && key.startsWith('/api/stream/info'),
        undefined,
        { revalidate: false }
      )
    } catch (error) {
      console.error('[useUserList] Error during cache clear:', error)
      throw error
    }
  }, [mutate])

  const prefetch = useCallback(async () => {
    try {
      return await mutate()
    } catch (error) {
      console.error('[useUserList] Error during prefetch:', error)
      throw error
    }
  }, [mutate])

  return {
    channels: data || [],
    isLoading,
    error,
    isValidating,
    refresh,
    clearCache,
    prefetch,
    cacheKey,
    isBackgroundFetching: isValidating && !isLoading,
    ...computedValues,
  }
}

// Convenience hooks for common use cases with optimized caching
export function useAllChannels(refreshInterval?: number): UseUserListReturn {
  return useUserList({ 
    refreshInterval: refreshInterval ?? 60000, // Less frequent updates for all channels
    cacheTTL: 10 * 60 * 1000, // 10 minutes cache
    refreshWhenHidden: false,
    errorRetryCount: 2, // Fewer retries for non-critical data
  })
}

export function useOwnedChannels(refreshInterval?: number): UseUserListReturn {
  return useUserList({ 
    owned: true, 
    refreshInterval: refreshInterval ?? 30000,
    cacheTTL: 5 * 60 * 1000, // 5 minutes cache
    revalidateOnFocus: true, // User's own channels are more important
  })
}

export function useLiveChannels(refreshInterval?: number): UseUserListReturn {
  return useUserList({ 
    live: true, 
    refreshInterval: refreshInterval ?? 10000, // More frequent updates for live channels
    cacheTTL: 30 * 1000, // 30 seconds cache for live data
    revalidateOnFocus: true, // Revalidate when user focuses tab
    refreshWhenHidden: false, // Don't waste resources when hidden
    errorRetryCount: 5, // More retries for critical live data
  })
}

export function usePersonalChannels(refreshInterval?: number): UseUserListReturn {
  return useUserList({ 
    personal: true, 
    refreshInterval: refreshInterval ?? 45000,
    cacheTTL: 7 * 60 * 1000, // 7 minutes cache
    revalidateOnFocus: true,
  })
}

export interface UseUserStreamInfoReturn extends Omit<UseUserListReturn, 'channels'> {
  /** The found stream info for the specific user */
  streamInfo: StreamInfoResponse[0] | null
  /** All matching channels (usually just one) */
  channels: StreamInfoResponse
}

/** 
 * Hook to fetch stream info for a specific user 
 * Returns the first match if multiple channels exist for that user
 */
export function useUserStreamInfo(
  username: string | undefined, 
  refresh = true,
  refreshInterval?: number,
): UseUserStreamInfoReturn {
  const result = useUserList({ 
    username,
    refreshInterval: refresh ? (refreshInterval ?? 15000) : undefined,
    cacheTTL: 2 * 60 * 1000, // 2 minutes cache
    revalidateOnFocus: true,
    isPaused: !username, // Don't fetch if no username provided
    errorRetryCount: 3,
  })

  return {
    ...result,
    streamInfo: result.channels[0] || null,
  }
}

/** 
 * Lazy version that doesn't automatically fetch - useful for on-demand lookups 
 */
export function useUserStreamInfoLazy(refreshInterval?: number) {
  const result = useUserList({ 
    refreshInterval: refreshInterval ?? 15000,
    cacheTTL: 2 * 60 * 1000,
    revalidateOnFocus: true,
    isPaused: true, // Start paused
    errorRetryCount: 3,
  })

  const lookupUser = useCallback(async (username: string) => {
    if (!username) return null
    
    try {
      const response = await enhancedFetcher(`/api/stream/info?username=${encodeURIComponent(username)}`)
      return response[0] || null
    } catch (error) {
      console.error('[useUserStreamInfoLazy] Error looking up user:', error)
      throw error
    }
  }, [])

  return {
    ...result,
    lookupUser,
  }
}

// Cache management utilities with proper error handling
export const channelCacheUtils = {
  /** Clear all channel caches */
  clearAll: async (): Promise<void> => {
    try {
      await Promise.all([
        globalMutate(
          key => typeof key === 'string' && key.includes('/api/stream/info'),
          undefined,
          { revalidate: false }
        ),
        // Clear specific cache keys
        ...Object.values(CACHE_KEYS).map(key => 
          globalMutate(key, undefined, { revalidate: false })
        )
      ])
      
      if (process.env.NODE_ENV === 'development') {
        console.debug('[channelCacheUtils] All caches cleared successfully')
      }
    } catch (error) {
      console.error('[channelCacheUtils] Error clearing caches:', error)
      throw error
    }
  },
  
  /** Invalidate live channels cache (useful when stream status changes) */
  invalidateLive: async (): Promise<void> => {
    try {
      await globalMutate(
        key => typeof key === 'string' && (
          key.includes('/api/stream/info?live=true') ||
          key === CACHE_KEYS.LIVE_CHANNELS
        ),
        undefined,
        { revalidate: true }
      )
      
      if (process.env.NODE_ENV === 'development') {
        console.debug('[channelCacheUtils] Live channels cache invalidated')
      }
    } catch (error) {
      console.error('[channelCacheUtils] Error invalidating live cache:', error)
      throw error
    }
  },

  /** Invalidate specific cache by options */
  invalidateByOptions: async (options: UseUserListOptions): Promise<void> => {
    try {
      const params = new URLSearchParams()
      if (options.owned) params.set('owned', 'true')
      if (options.personal) params.set('personal', 'true')
      if (options.live) params.set('live', 'true')
      if (options.username) params.set('username', options.username)
      
      const queryString = params.toString()
      const url = `/api/stream/info${queryString ? `?${queryString}` : ''}`
      
      await globalMutate(url, undefined, { revalidate: true })
      
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[channelCacheUtils] Cache invalidated for: ${url}`)
      }
    } catch (error) {
      console.error('[channelCacheUtils] Error invalidating specific cache:', error)
      throw error
    }
  },
  
  /** Warm up cache by prefetching common queries */
  warmUp: async (): Promise<void> => {
    try {
      const queries = [
        '/api/stream/info',
        '/api/stream/info?live=true',
        '/api/stream/info?owned=true'
      ]
      
      // Prefetch in parallel but don't fail if some requests fail
      const results = await Promise.allSettled(
        queries.map(url => enhancedFetcher(url))
      )
      
      const failed = results.filter(result => result.status === 'rejected')
      
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[channelCacheUtils] Cache warmed up. ${results.length - failed.length}/${results.length} succeeded`)
      }
      
      if (failed.length > 0) {
        console.warn(`[channelCacheUtils] ${failed.length} cache warm-up requests failed`)
      }
    } catch (error) {
      console.error('[channelCacheUtils] Error during cache warm-up:', error)
      throw error
    }
  },

  /** Get cache statistics for debugging */
  getStats: (): { cacheKeys: string[] } => {
    // This is a simplified version - in a real implementation you might
    // want to integrate with SWR's cache inspector or build custom monitoring
    return {
      cacheKeys: Object.values(CACHE_KEYS)
    }
  }
}