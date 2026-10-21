import { useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { API_URL } from "./config";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const readErrorMessage = async (res) => {
  try {
    const data = await res.json();
    if (data?.error) return data.error;
  } catch {
    // Not a JSON error body.
  }
  return "Something went wrong. Please try again.";
};

/**
 * Returns a `request(path, options)` function that calls the backend with the
 * signed-in user's Clerk session token. `body` is sent as JSON, or as-is
 * when it's a File/Blob. It throws `ApiError` for non-2xx responses and
 * returns parsed JSON, or the raw `Response` with `raw: true` (streaming).
 */
export const useApi = () => {
  const { getToken } = useAuth();

  return useCallback(
    async (path, { method = "GET", body, signal, raw = false } = {}) => {
      const token = await getToken();
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const isFile = body instanceof Blob;
      if (isFile) headers["Content-Type"] = body.type;
      else if (body !== undefined) headers["Content-Type"] = "application/json";

      let res;
      try {
        res = await fetch(`${API_URL}${path}`, {
          method,
          headers,
          signal,
          body: isFile || body === undefined ? body : JSON.stringify(body),
        });
      } catch (err) {
        if (err.name === "AbortError") throw err;
        throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
      }

      if (!res.ok) throw new ApiError(res.status, await readErrorMessage(res));
      if (raw) return res;
      if (res.status === 204) return null;
      return res.json();
    },
    [getToken]
  );
};
