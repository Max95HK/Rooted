/* Third-party modules */
import { createFileRoute } from "@tanstack/react-router";

/* Pages */
import Home from "@/pages/home";

export const Route = createFileRoute("/")({
  component: Home,
});
