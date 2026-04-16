import { http, HttpResponse } from "msw";

export const handlers = [
  http.post("*/canva/setup", () =>
    HttpResponse.json({ sessionToken: `mock-session-${Date.now()}` })
  ),

  http.post("*/canva/generate", () =>
    HttpResponse.json({ canvaLink: "https://www.canva.com/design/mock-design-id/view" })
  ),
];
