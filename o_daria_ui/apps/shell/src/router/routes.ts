export interface RouteConfig {
  path: string;
  remote: string;
  isPublic: boolean;
}

export const routes: RouteConfig[] = [
  {
    path: "/auth/*",
    remote: "mfe_auth/Module",
    isPublic: true,
  },
  {
    path: "/projects/*",
    remote: "mfe_projects/Module",
    isPublic: false,
  },
];
