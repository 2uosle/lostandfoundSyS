type RateLimitOptions = {
  interval: number; // Time window in ms
  uniqueTokenPerInterval: number; // Max unique IPs/tokens
};

type TokenData = {
  count: number;
  resetTime: number;
};

export default function rateLimit(options: RateLimitOptions) {
  const tokenCache = new Map<string, TokenData>();

  // Cleanup expired entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [token, data] of tokenCache.entries()) {
      if (now > data.resetTime) {
        tokenCache.delete(token);
      }
    }
  }, options.interval);

  return {
    check: (limit: number, token: string): Promise<void> =>
      new Promise<void>((resolve, reject) => {
        const now = Date.now();
        const tokenData = tokenCache.get(token);

        if (!tokenData || now > tokenData.resetTime) {
          // First request or window expired
          tokenCache.set(token, {
            count: 1,
            resetTime: now + options.interval,
          });
          
          // Limit cache size
          if (tokenCache.size > options.uniqueTokenPerInterval) {
            const firstKey = tokenCache.keys().next().value;
            if (firstKey) tokenCache.delete(firstKey);
          }
          
          return resolve();
        }

        tokenData.count += 1;
        const isRateLimited = tokenData.count > limit;

        return isRateLimited ? reject() : resolve();
      }),
  };
}
