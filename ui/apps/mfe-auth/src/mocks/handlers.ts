import { http, HttpResponse } from "msw";

// Use path-only patterns so handlers match regardless of base URL or port
const mockUser = {
  id: "dev-user-001",
  email: "alex@agency.com",
  createdAt: "2026-01-01T00:00:00Z",
};

export const handlers = [
  // POST /auth/login
  http.post("*/auth/login", async ({ request }) => {
    const body = await request.json() as { email?: string; password?: string };
    if (body.password && body.password.length < 8) {
      return HttpResponse.json(
        { errorCode: "AUTH_INVALID_CREDENTIALS", message: "Invalid email or password" },
        { status: 401 }
      );
    }
    return HttpResponse.json({ user: { ...mockUser, email: body.email ?? mockUser.email } });
  }),

  // POST /auth/register
  http.post("*/auth/register", async ({ request }) => {
    const body = await request.json() as { email?: string };
    return HttpResponse.json({ user: { ...mockUser, email: body.email ?? mockUser.email } }, { status: 201 });
  }),

  // POST /auth/logout
  http.post("*/auth/logout", () => new HttpResponse(null, { status: 204 })),

  // POST /auth/password-reset/request
  http.post("*/auth/password-reset/request", () => new HttpResponse(null, { status: 204 })),

  // POST /auth/password-reset/confirm
  http.post("*/auth/password-reset/confirm", () => new HttpResponse(null, { status: 204 })),

  // GET /auth/me
  http.get("*/auth/me", () => HttpResponse.json(mockUser)),
];
