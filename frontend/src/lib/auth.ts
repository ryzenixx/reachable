// Auth is handled via httpOnly cookies set by the API.
// This file only exports clearAuthToken for the org deletion flow.

export function clearAuthToken(): void {
  // No-op — cookie is invalidated server-side on logout/deletion
}
