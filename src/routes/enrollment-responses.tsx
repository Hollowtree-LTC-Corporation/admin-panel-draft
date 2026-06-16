import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/enrollment-responses")({
  beforeLoad: () => {
    throw redirect({ to: "/si-applications" });
  },
  component: () => null,
});
