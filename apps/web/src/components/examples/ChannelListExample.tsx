// Example component demonstrating production-ready useUserList hook
// filepath: /home/srizan/Documents/Development/hclive/apps/web/src/components/examples/ChannelListExample.tsx

'use client'

import React, { useState, useCallback } from 'react'
import { useUserList, useLiveChannels, channelCacheUtils, type StreamInfoError } from '@/lib/hooks/useUserList'

// Error display component
function ErrorDisplay({ error, onRetry }: { error: StreamInfoError; onRetry: () => void }) {
  const getErrorMessage = (error: StreamInfoError) => {
    if (error.status === 401) {
      return 'Authentication required. Please log in.'
    }
    if (error.status === 403) {
      return 'Access denied. You don\'t have permission to view this content.'
    }
    if (error.status && error.status >= 500) {
      return 'Server error. Please try again later.'
    }
    return error.message || 'An unknown error occurred.'
  }

  const shouldShowRetry = error.status !== 401 && error.status !== 403

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-red-800 font-medium">Error Loading Channels</h3>
          <p className="text-red-600 text-sm mt-1">{getErrorMessage(error)}</p>
          {error.status && (
            <p className="text-red-500 text-xs mt-1">Status: {error.status}</p>
          )}
        </div>
        {shouldShowRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}

// Loading skeleton component
function ChannelSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-200 h-4 rounded mb-2"></div>
      <div className="bg-gray-200 h-3 rounded w-3/4 mb-2"></div>
      <div className="bg-gray-200 h-3 rounded w-1/2"></div>
    </div>
  )
}

// Individual channel card component
function ChannelCard({ channel }: { channel: any }) {
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900">{channel.username}</h3>
        {channel.isLive && (
          <span className="px-2 py-1 text-xs bg-red-500 text-white rounded-full">
            LIVE
          </span>
        )}
      </div>
      <p className="text-gray-600 text-sm mb-2">{channel.title}</p>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{channel.category}</span>
        {channel.isLive && (
          <span>{channel.viewers} viewers</span>
        )}
      </div>
    </div>
  )
}

// Main channel list component with comprehensive error handling and loading states
export function ChannelListExample() {
  const [filter, setFilter] = useState<'all' | 'live' | 'owned'>('all')

  // Use different hooks based on filter
  const allChannelsResult = useUserList({
    refreshInterval: 60000,
    revalidateOnFocus: true,
    isPaused: filter !== 'all'
  })

  const liveChannelsResult = useLiveChannels()
  const ownedChannelsResult = useUserList({ 
    owned: true,
    isPaused: filter !== 'owned'
  })

  // Select the appropriate result based on filter
  const result = filter === 'live' 
    ? liveChannelsResult 
    : filter === 'owned' 
    ? ownedChannelsResult 
    : allChannelsResult

  const {
    channels,
    isLoading,
    error,
    isValidating,
    isBackgroundFetching,
    totalChannels,
    liveChannels,
    lastUpdated,
    refresh,
    clearCache
  } = result

  // Cache management handlers
  const handleClearCache = useCallback(async () => {
    try {
      await clearCache()
      console.log('Cache cleared successfully')
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }, [clearCache])

  const handleInvalidateLive = useCallback(async () => {
    try {
      await channelCacheUtils.invalidateLive()
      console.log('Live channels cache invalidated')
    } catch (error) {
      console.error('Failed to invalidate live cache:', error)
    }
  }, [])

  const handleWarmUpCache = useCallback(async () => {
    try {
      await channelCacheUtils.warmUp()
      console.log('Cache warmed up successfully')
    } catch (error) {
      console.error('Failed to warm up cache:', error)
    }
  }, [])

  // Render loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Loading Channels...</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ChannelSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return <ErrorDisplay error={error} onRetry={refresh} />
  }

  return (
    <div className="space-y-4">
      {/* Header with stats and controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            Channels 
            {isBackgroundFetching && (
              <span className="ml-2 text-blue-500 animate-spin">🔄</span>
            )}
          </h2>
          <div className="text-sm text-gray-600 mt-1">
            {totalChannels} total • {liveChannels} live
            {lastUpdated && (
              <span className="ml-2">
                • Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={refresh}
            disabled={isValidating}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isValidating ? 'Refreshing...' : 'Refresh'}
          </button>
          
          <button
            onClick={handleClearCache}
            className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Clear Cache
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b">
        {[
          { key: 'all', label: 'All Channels' },
          { key: 'live', label: 'Live' },
          { key: 'owned', label: 'My Channels' }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Cache management tools (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-50 p-3 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Cache Management (Dev Tools)
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleInvalidateLive}
              className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Invalidate Live
            </button>
            <button
              onClick={handleWarmUpCache}
              className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
            >
              Warm Up Cache
            </button>
          </div>
        </div>
      )}

      {/* Channel grid */}
      {channels.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p>No channels found.</p>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="mt-2 text-blue-600 hover:text-blue-700"
            >
              View all channels
            </button>
          )}
        </div>
      )}

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <details className="bg-gray-50 p-3 rounded-lg">
          <summary className="text-sm font-medium text-gray-700 cursor-pointer">
            Debug Information
          </summary>
          <pre className="mt-2 text-xs text-gray-600 overflow-auto">
            {JSON.stringify({
              filter,
              totalChannels,
              liveChannels,
              isLoading,
              isValidating,
              isBackgroundFetching,
              cacheKey: result.cacheKey,
              lastUpdated: lastUpdated?.toISOString(),
              hasError: !!error
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}

export default ChannelListExample
