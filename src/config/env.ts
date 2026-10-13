const fallbackApiUrl = 'http://localhost:5204';

export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL?.trim() || fallbackApiUrl,
} as const;
