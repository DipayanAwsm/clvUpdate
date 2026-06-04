const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

const buildUrl = (path: string): string => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(buildUrl(path), init);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`${init?.method || 'GET'} ${path} failed (${response.status})${body ? `: ${body}` : ''}`);
  }
  return response.json() as Promise<T>;
};

export const apiClient = {
  baseUrl: API_BASE_URL,
  get<T>(path: string): Promise<T> {
    return request<T>(path);
  },
  post<T>(path: string, payload: unknown): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }
};
