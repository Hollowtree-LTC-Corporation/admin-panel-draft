import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/rate-cells")({ component: Redirect });

function Redirect() {
  return (
    <div>
      <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-3 text-sm text-amber-900">
        Rate cells have moved to individual organization pages, nested under each benefit class.
      </div>
      <Navigate to="/organizations" />
    </div>
  );
}
