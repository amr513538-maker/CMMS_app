export const API_BASE = "";

export function getAuthToken() {
  return localStorage.getItem("cmms_token");
}

export function setAuthToken(token) {
  if (token) localStorage.setItem("cmms_token", token);
  else localStorage.removeItem("cmms_token");
}

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  
  if (!(options.body instanceof FormData)) {
    headers["content-type"] = headers["content-type"] || "application/json";
  }
  
  const token = getAuthToken();
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  
  if (res.status === 401) {
    setAuthToken(null);
    localStorage.removeItem("cmms_user");
    // Only dispatch an event to log out cleanly, avoiding direct window.location if possible
    window.dispatchEvent(new Event("auth_unauthorized"));
    throw new Error("Unauthorized");
  }
  return res;
}
