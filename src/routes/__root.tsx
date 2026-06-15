import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import appCss from "../styles.css?url";
import { StoreProvider } from "@/lib/wireframe/store";
import { Shell } from "@/components/wireframe/Shell";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="p-8 text-sm">View not found in the wireframe.</div>
  );
}

function ErrorComponent({ error }: { error: Error }) {
  console.error(error);
  return <div className="p-8 text-sm text-rose-700">Render error: {error.message}</div>;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Hollowtree Admin · Wireframe" },
      { name: "description", content: "Throwaway wireframe of the Hollowtree enrollment admin panel." },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <Shell />
        <Toaster />
      </StoreProvider>
    </QueryClientProvider>
  );
}

// Shell renders <Outlet />; export a passthrough so file-based child routes mount.
export function _Outlet() { return <Outlet />; }
