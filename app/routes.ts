import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("albums/:id", "routes/albums.$id.tsx"),
] satisfies RouteConfig;
