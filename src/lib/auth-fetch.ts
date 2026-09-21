/**
 * Helper function to make authenticated API calls with JWT token
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
) {
  const token = typeof window !== "undefined" ? localStorage.getItem("rojlo_auth_token") : null;
  
  const headers = new Headers(options.headers || {});
  
  // Add JWT token if available
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  // Ensure Content-Type is set for JSON
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "include", // Include cookies in requests
  });
}
