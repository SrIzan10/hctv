# useUserList Hook - Production Documentation

note by @SrIzan10: this was made by claude 4 sonnet to speed up development. i'm really lazy to make
a good hook that is production ready, plus it's going to be used in lots of places.

## Overview

The `useUserList` hook provides a robust, production-ready interface for fetching and managing stream information data. Built on top of SWR, it includes comprehensive error handling, caching strategies, and performance optimizations.

## Features

### ✅ Production-Ready Enhancements

- **Enhanced Error Handling**: Custom error types, retry logic, and proper error boundaries
- **Type Safety**: Comprehensive TypeScript interfaces and type guards
- **Performance Optimization**: Memoized values, efficient re-renders, and smart caching
- **Robust Retry Logic**: Exponential backoff with jitter, configurable retry strategies
- **Background Fetching**: Non-blocking updates with loading state management
- **Cache Management**: Global cache utilities with invalidation strategies
- **Memory Optimization**: Proper cleanup and memoization patterns
- **Development Tools**: Debug logging and development-specific features

### 🚀 Key Improvements Over Original

1. **Error Handling**: 
   - Custom `StreamInfoError` type with status codes
   - Smart retry logic that doesn't retry 4xx errors
   - Exponential backoff with jitter to prevent thundering herd

2. **Performance**: 
   - Memoized computed values to prevent unnecessary re-renders
   - Callback memoization for stable function references
   - Efficient parameter serialization

3. **Reliability**:
   - Proper fallback data handling
   - Network-aware fetching options
   - Configurable pause/resume functionality

4. **Developer Experience**:
   - Comprehensive TypeScript types
   - Debug logging in development
   - Clear error messages and documentation

## API Reference

### Main Hook

```typescript
function useUserList(options?: UseUserListOptions): UseUserListReturn
```

### Options Interface

```typescript
interface UseUserListOptions {
  // Data filtering
  owned?: boolean                    // Only fetch user's owned channels
  personal?: boolean                 // Include personal channels
  live?: boolean                    // Only fetch live channels
  
  // Caching & Performance
  refreshInterval?: number          // Auto-refresh interval (ms)
  cacheTTL?: number                // Cache time-to-live (ms)
  dedupingInterval?: number        // Request deduplication window (ms)
  
  // Revalidation Behavior
  revalidateOnFocus?: boolean      // Revalidate when window gains focus
  revalidateOnReconnect?: boolean  // Revalidate when network reconnects
  revalidateIfStale?: boolean      // Background revalidation of stale data
  refreshWhenHidden?: boolean      // Continue refreshing when tab hidden
  refreshWhenOffline?: boolean     // Continue refreshing when offline
  
  // Error Handling
  errorRetryCount?: number         // Number of retry attempts
  errorRetryInterval?: number      // Base retry interval (ms)
  
  // Control
  isPaused?: boolean              // Pause all fetching
}
```

### Return Interface

```typescript
interface UseUserListReturn {
  // Data
  channels: StreamInfoResponse     // Array of stream info objects
  totalChannels: number           // Total number of channels
  liveChannels: number           // Number of currently live channels
  lastUpdated: Date | null       // Last successful update timestamp
  
  // Loading States
  isLoading: boolean             // Initial loading state
  isValidating: boolean          // Validation/revalidation in progress
  isBackgroundFetching: boolean  // Background update in progress
  
  // Error Handling
  error?: StreamInfoError        // Current error state
  
  // Actions
  refresh: () => Promise<StreamInfoResponse | undefined>  // Manual refresh
  clearCache: () => Promise<void>                        // Clear cache
  prefetch: () => Promise<StreamInfoResponse | undefined> // Prefetch data
  
  // Metadata
  cacheKey: string               // Cache key for this query
}
```

## Usage Examples

### Basic Usage

```typescript
import { useUserList } from '@/lib/hooks/useUserList'

function ChannelList() {
  const { 
    channels, 
    isLoading, 
    error, 
    totalChannels,
    refresh 
  } = useUserList()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h2>Channels ({totalChannels})</h2>
      <button onClick={refresh}>Refresh</button>
      {channels.map(channel => (
        <ChannelCard key={channel.id} channel={channel} />
      ))}
    </div>
  )
}
```

### Live Channels with Custom Configuration

```typescript
function LiveChannels() {
  const { 
    channels, 
    liveChannels,
    isBackgroundFetching,
    error 
  } = useUserList({
    live: true,
    refreshInterval: 5000,        // Refresh every 5 seconds
    revalidateOnFocus: true,      // Refresh when user returns to tab
    errorRetryCount: 5,           // Retry failed requests 5 times
    refreshWhenHidden: false      // Stop refreshing when tab is hidden
  })

  return (
    <div>
      <h2>
        Live Channels ({liveChannels})
        {isBackgroundFetching && <span>🔄</span>}
      </h2>
      {error && (
        <div className="error">
          Failed to load live channels: {error.message}
          {error.status && ` (${error.status})`}
        </div>
      )}
      {channels.map(channel => (
        <LiveChannelCard key={channel.id} channel={channel} />
      ))}
    </div>
  )
}
```

### Convenience Hooks

```typescript
// Optimized for different use cases
const { channels } = useAllChannels()        // All channels, less frequent updates
const { channels } = useOwnedChannels()      // User's channels, focus-aware
const { channels } = useLiveChannels()       // Live channels, frequent updates
const { channels } = usePersonalChannels()  // Personal channels
```

### Cache Management

```typescript
import { channelCacheUtils } from '@/lib/hooks/useUserList'

// Clear all channel caches
await channelCacheUtils.clearAll()

// Invalidate live channels when stream status changes
await channelCacheUtils.invalidateLive()

// Invalidate specific cache
await channelCacheUtils.invalidateByOptions({ live: true, owned: true })

// Warm up cache on app start
await channelCacheUtils.warmUp()

// Get cache statistics for debugging
const stats = channelCacheUtils.getStats()
```

## Error Handling

The hook provides sophisticated error handling with custom error types:

```typescript
interface StreamInfoError extends Error {
  status?: number      // HTTP status code
  statusText?: string  // HTTP status text
  info?: any          // Additional error details
}
```

### Error Scenarios

1. **Network Errors**: Automatic retry with exponential backoff
2. **HTTP 4xx Errors**: No retry (client errors)
3. **HTTP 5xx Errors**: Retry with backoff
4. **Parsing Errors**: Immediate failure with clear error message

### Custom Error Handling

```typescript
const { error, refresh } = useUserList()

useEffect(() => {
  if (error) {
    if (error.status === 401) {
      // Handle authentication errors
      redirectToLogin()
    } else if (error.status && error.status >= 500) {
      // Handle server errors
      showNotification('Server error, please try again later')
    } else {
      // Handle other errors
      console.error('Unexpected error:', error)
    }
  }
}, [error])
```

## Performance Considerations

### Caching Strategy

- **All Channels**: 10-minute cache, 60-second refresh
- **Owned Channels**: 5-minute cache, 30-second refresh  
- **Live Channels**: 30-second cache, 10-second refresh
- **Personal Channels**: 7-minute cache, 45-second refresh

### Memory Optimization

- Memoized computed values prevent unnecessary re-renders
- Callback functions are memoized for stable references
- Automatic cleanup when component unmounts

### Network Optimization

- Request deduplication prevents duplicate API calls
- Background revalidation keeps data fresh without blocking UI
- Smart retry logic prevents unnecessary network load

## Monitoring & Debugging

### Development Mode

```typescript
// Enable debug logging
console.debug('[useUserList] Successfully fetched 5 channels for key: stream-info:live')
console.error('[useUserList] Error fetching data for key stream-info:all:', error)
```

### Production Monitoring

The hook includes hooks for adding production monitoring:

```typescript
// In onError callback
if (process.env.NODE_ENV === 'production') {
  // Send to error tracking service
  Sentry.captureException(error)
  
  // Send custom metrics
  analytics.track('stream_fetch_error', {
    url: key,
    error: error.message,
    status: error.status
  })
}
```

## Migration from Original Hook

### Breaking Changes

1. **Return Type**: Now returns `UseUserListReturn` interface instead of object
2. **Error Type**: Errors are now `StreamInfoError` instead of generic `Error`
3. **Cache Keys**: Updated cache key format for better organization

### Migration Steps

1. Update import statements if using TypeScript
2. Update error handling to use new `StreamInfoError` type
3. Replace any direct cache key usage with new format
4. Update any custom retry logic to use new options

### Before

```typescript
const { channels, error, refresh } = useUserList({ live: true })

// Error handling
if (error) {
  console.error('Error:', error)
}
```

### After

```typescript
const { channels, error, refresh } = useUserList({ live: true })

// Enhanced error handling
if (error) {
  console.error('Error:', error.message)
  if (error.status) {
    console.error('Status:', error.status)
  }
}
```

## Best Practices

### 1. Use Appropriate Convenience Hooks

```typescript
// ✅ Good - Use specific hooks for better defaults
const { channels } = useLiveChannels()

// ❌ Avoid - Manual configuration when convenience hook exists  
const { channels } = useUserList({ 
  live: true, 
  refreshInterval: 10000,
  cacheTTL: 30000,
  revalidateOnFocus: true 
})
```

### 2. Handle Loading States Properly

```typescript
// ✅ Good - Distinguish between initial load and background updates
const { isLoading, isBackgroundFetching, channels } = useUserList()

if (isLoading) {
  return <FullPageLoader />
}

return (
  <div>
    {isBackgroundFetching && <RefreshIndicator />}
    <ChannelList channels={channels} />
  </div>
)
```

### 3. Implement Proper Error Boundaries

```typescript
// ✅ Good - Comprehensive error handling
function ChannelListWithErrorBoundary() {
  const { channels, error, refresh, isLoading } = useUserList()

  if (error) {
    return (
      <ErrorState 
        error={error}
        onRetry={refresh}
        showRetry={error.status !== 401}
      />
    )
  }

  return <ChannelList channels={channels} isLoading={isLoading} />
}
```

### 4. Use Cache Management Appropriately

```typescript
// ✅ Good - Clear caches when user logs out
function useLogout() {
  const logout = async () => {
    await authService.logout()
    await channelCacheUtils.clearAll()
    router.push('/login')
  }
  
  return logout
}
```

## Testing

### Unit Testing

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useUserList } from '@/lib/hooks/useUserList'

describe('useUserList', () => {
  it('fetches channels successfully', async () => {
    const { result } = renderHook(() => useUserList())
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    
    expect(result.current.channels).toHaveLength(5)
    expect(result.current.error).toBeUndefined()
  })

  it('handles errors gracefully', async () => {
    // Mock fetch to return error
    fetchMock.mockRejectOnce(new Error('Network error'))
    
    const { result } = renderHook(() => useUserList())
    
    await waitFor(() => {
      expect(result.current.error).toBeDefined()
    })
    
    expect(result.current.error?.message).toBe('Network error')
  })
})
```

### Integration Testing

```typescript
describe('useUserList integration', () => {
  it('refreshes data when stream goes live', async () => {
    const { result } = renderHook(() => useLiveChannels())
    
    // Simulate stream going live
    await act(async () => {
      await channelCacheUtils.invalidateLive()
    })
    
    await waitFor(() => {
      expect(result.current.liveChannels).toBeGreaterThan(0)
    })
  })
})
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**: Check if components are properly memoized
2. **Too Many Requests**: Verify deduplication settings and refresh intervals
3. **Stale Data**: Check cache TTL and revalidation settings
4. **Authentication Errors**: Implement proper 401 error handling

### Debug Checklist

- [ ] Check network tab for actual API calls
- [ ] Verify cache keys are unique per query combination
- [ ] Ensure proper error boundaries are in place
- [ ] Check refresh intervals are appropriate for use case
- [ ] Verify retry logic is working as expected

## Conclusion

This production-ready implementation of `useUserList` provides a robust foundation for managing stream information data in your application. It includes comprehensive error handling, performance optimizations, and developer-friendly features while maintaining backward compatibility with existing code.

The hook is designed to scale with your application's needs and provides the flexibility to handle various use cases while maintaining optimal performance and user experience.
