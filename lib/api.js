async function request(method, url, body, { admin = false } = {}) {
  const headers = {};
  if (admin) headers["X-Requested-With"] = "VineAdmin";
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const response = await fetch(url, { method, headers, body: payload, credentials: "same-origin" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "Something went wrong. Please try again.");
    error.status = response.status;
    throw error;
  }
  return data;
}

export const api = {
  get: (url) => request("GET", url),
  post: (url, body) => request("POST", url, body),
};

export const adminApi = {
  get: (url) => request("GET", `/api/admin${url}`, undefined, { admin: true }),
  post: (url, body) => request("POST", `/api/admin${url}`, body, { admin: true }),
  put: (url, body) => request("PUT", `/api/admin${url}`, body, { admin: true }),
  patch: (url, body) => request("PATCH", `/api/admin${url}`, body, { admin: true }),
  delete: (url) => request("DELETE", `/api/admin${url}`, undefined, { admin: true }),
  upload: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request("POST", "/api/admin/upload", form, { admin: true });
  },
  login: (password) => request("POST", "/api/auth/login", { password }),
  logout: () => request("POST", "/api/auth/logout", {}),
  me: () => request("GET", "/api/auth/me"),
  changePassword: (body) => request("POST", "/api/admin/password", body, { admin: true }),
};
