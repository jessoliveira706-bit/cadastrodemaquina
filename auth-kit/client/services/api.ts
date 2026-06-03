const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

let STORAGE_KEY = "auth_user";

export function setApiStorageKey(key: string) {
  STORAGE_KEY = key;
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as { token?: string };
    return u.token ?? null;
  } catch {
    return null;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handle<T>(res);
}

async function requestForm<T>(method: string, path: string, form: FormData): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  return handle<T>(res);
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = res.statusText;
    try {
      const json = JSON.parse(text) as { error?: string; message?: string };
      message = json.error ?? json.message ?? text;
    } catch {
      message = text || res.statusText;
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get:      <T>(path: string)                    => request<T>("GET",    path),
  post:     <T>(path: string, body: unknown)     => request<T>("POST",   path, body),
  patch:    <T>(path: string, body: unknown)     => request<T>("PATCH",  path, body),
  del:      <T>(path: string)                    => request<T>("DELETE", path),
  put:      <T>(path: string, body: unknown)     => request<T>("PUT",    path, body),
  postForm: <T>(path: string, form: FormData)    => requestForm<T>("POST", path, form),
};
