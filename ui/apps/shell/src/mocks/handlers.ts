import { http, HttpResponse, passthrough } from "msw";
import type { Project } from "@app/api-client";

const mockUser = { id: "dev-user-001", email: "alex@agency.com", createdAt: "2026-01-01T00:00:00Z" };

let projects: Project[] = [];
let nextId = 1;


export const handlers = [
  // ── Auth ──────────────────────────────────────────────────────────────────
  http.post("*/auth/login", async ({ request }) => {
    const body = await request.json() as { email?: string };
    return HttpResponse.json({ user: { ...mockUser, email: body.email ?? mockUser.email } });
  }),
  http.post("*/auth/register", async ({ request }) => {
    const body = await request.json() as { email?: string };
    return HttpResponse.json({ user: { ...mockUser, email: body.email ?? mockUser.email } }, { status: 201 });
  }),
  http.post("*/auth/logout", () => new HttpResponse(null, { status: 204 })),
  http.post("*/auth/password-reset/request", () => new HttpResponse(null, { status: 204 })),
  http.post("*/auth/password-reset/confirm", () => new HttpResponse(null, { status: 204 })),
  http.get("*/auth/me", () => HttpResponse.json(mockUser)),

  // ── Projects — create ─────────────────────────────────────────────────────
  // http.post("*/projects", async ({ request }) => {
  //   const body = await request.json() as { brand: string; brand_input: string };
  //   const id = `project-${nextId++}`;
  //   const now = new Date().toISOString();
  //   const project: Project = {
  //     id,
  //     name: body.brand ?? "",
  //     brand_input: body.brand_input ?? "",
  //     status: "DRAFT",
  //     ownerId: mockUser.id,
  //     createdAt: now,
  //     updatedAt: now,
  //   };
  //   projects.push(project);
  //   return HttpResponse.json(project, { status: 201 });
  // }),

  // ── Reports — start analysis (multipart, async) ───────────────────────────
  // http.post("*/reports", () => {
  //   const reportId = `report-${nextId++}`;
  //   return HttpResponse.json({ report_id: reportId }, { status: 202 });
  // }),

  // ── Projects (local store — list / get / delete) ──────────────────────────
  // http.get("*/projects", () => HttpResponse.json(projects)),

  // http.get("*/projects/:id", ({ params }) => {
  //   const project = projects.find(p => p.id === params.id);
  //   if (!project) return new HttpResponse(null, { status: 404 });
  //   return HttpResponse.json(project);
  // }),

  // http.delete("*/projects/:id", ({ params }) => {
  //   projects = projects.filter(p => p.id !== params.id);
  //   return new HttpResponse(null, { status: 204 });
  // }),

  // ── Reports — pass through to real API (no mock) ─────────────────────────
  http.get("*/projects/:projectId/reports", () => passthrough()),
  http.get("*/reports/:reportId", () => passthrough()),

  // ── Canva ─────────────────────────────────────────────────────────────────
  http.post("*/canva/setup", () =>
    HttpResponse.json({ sessionToken: `mock-session-${Date.now()}` })
  ),

  http.post("*/canva/generate", () =>
    HttpResponse.json({ canvaLink: "https://www.canva.com/design/mock-design-id/view" })
  ),
];
