// Skipped per Export CSV prompt: this route is a redirect, not a list view.
import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/rate-config")({ component: Redirect });

function Redirect() {
  return (
    <div>
      <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-3 text-sm text-amber-900">
        Rate config has moved to individual organization pages.
      </div>
      <Navigate to="/organizations" />
    </div>
  );
}
