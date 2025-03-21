type FetcherArgs = Parameters<typeof fetch>;

export const fetcher = (...args: FetcherArgs): Promise<any> => fetch(...args).then(res => res.json());