'use client'

import { createContext, useContext, ReactNode } from 'react'
import useSWR from 'swr'
import type { Channel, StreamInfo } from '@hctv/db'
import { fetcher } from '../services/swr'

const StreamContext = createContext<{
  stream?: StreamInfoResponse;
  isLoading: boolean;
  error?: Error;
}>(undefined!)

export function StreamInfoProvider({ children }: { children: ReactNode }) {
  const { data, error, isLoading } = useSWR<StreamInfoResponse>(
    '/api/stream/info',
    fetcher,
    { refreshInterval: 5000 },
  )

  return (
    <StreamContext.Provider value={{ 
      stream: data, 
      isLoading, 
      error 
    }}>
      {children}
    </StreamContext.Provider>
  )
}

export function useStreams() {
  const context = useContext(StreamContext)
  if (!context) {
    throw new Error('useStream must be used within StreamProvider')
  }
  return context
}

export type StreamInfoResponse = (StreamInfo & { channel: Channel })[]