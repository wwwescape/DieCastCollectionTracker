import type { ComponentType } from "react";
import { createBrowserRouter, Navigate, useLocation, useParams } from "react-router-dom";
import AppShell from "./AppShell";
import PublicShell from "./PublicShell";
import Login from "./pages/Login";
import OverviewPage from "./pages/OverviewPage";
import ProtectedLayout from "./routes/ProtectedLayout";

// Every page but the sign-in and the Overview loads as its own file the first time it's
// opened, so the first visit downloads only what it shows. The service worker then
// precaches the rest for later visits and offline use.
const page =
  <P extends object>(load: () => Promise<{ default: ComponentType<P> }>, props?: P) =>
  async () => {
    const { default: Page } = await load();
    return { element: <Page {...(props as P)} /> };
  };

// Pre-1.3 car edit links (/cars/:id/edit) now live under /collection/vehicles.
const LegacyCarEditRedirect = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/collection/vehicles/${id}/edit`} replace />;
};

// /collection/cars/... (v1.3.0) → the same page under /collection/vehicles/...
export const LegacyCollectionCarsRedirect = () => {
  const { pathname, search } = useLocation();
  return (
    <Navigate to={pathname.replace("/collection/cars", "/collection/vehicles") + search} replace />
  );
};

export const LegacyPublicCarsRedirect = () => {
  const { token } = useParams<{ token: string }>();
  return <Navigate to={`/public/${token}/vehicles`} replace />;
};

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    // Outside ProtectedLayout on purpose: no sign-in here, access is gated by the unlisted
    // token in the path instead (see backend app/api/routes/public.py).
    element: <PublicShell />,
    children: [
      {
        path: "/public/:token/vehicles",
        lazy: page(() => import("./pages/PublicCollectionPage"), { kind: "vehicles" }),
      },
      // v1.3.0 share links pointed at /cars.
      { path: "/public/:token/cars", element: <LegacyPublicCarsRedirect /> },
      {
        path: "/public/:token/sets",
        lazy: page(() => import("./pages/PublicCollectionPage"), { kind: "sets" }),
      },
    ],
  },
  {
    element: <ProtectedLayout />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <OverviewPage /> },
          { path: "/collection", element: <Navigate to="/" replace /> },
          { path: "/collection/vehicles", lazy: page(() => import("./components/CarList")) },
          { path: "/collection/vehicles/add", lazy: page(() => import("./components/AddCarPage")) },
          {
            path: "/collection/vehicles/add/catalog",
            lazy: page(() => import("./pages/CatalogCastingPage")),
          },
          {
            path: "/collection/vehicles/add/pack",
            lazy: page(() => import("./pages/CatalogPackPage")),
          },
          { path: "/collection/vehicles/:id", lazy: page(() => import("./pages/VehiclePage")) },
          {
            path: "/collection/vehicles/:id/edit",
            lazy: page(() => import("./components/EditCarPage")),
          },
          { path: "/collection/sets", lazy: page(() => import("./components/SetList")) },
          { path: "/collection/sets/add", lazy: page(() => import("./components/AddSetPage")) },
          {
            path: "/collection/sets/add/catalog",
            lazy: page(() => import("./pages/CatalogSetPage")),
          },
          { path: "/collection/sets/:id", lazy: page(() => import("./pages/SetPage")) },
          {
            path: "/collection/sets/:id/edit",
            lazy: page(() => import("./components/EditSetPage")),
          },
          {
            path: "/collection/manufacturers",
            lazy: page(() => import("./pages/ManufacturersPage")),
          },
          {
            path: "/collection/manufacturers/:id",
            lazy: page(() => import("./pages/ManufacturerPage")),
          },
          { path: "/collection/series", lazy: page(() => import("./pages/SeriesListPage")) },
          { path: "/collection/series/:id", lazy: page(() => import("./pages/SeriesPage")) },
          { path: "/insights", lazy: page(() => import("./pages/InsightsPage")) },
          { path: "/settings", lazy: page(() => import("./pages/SettingsPage")) },
          { path: "/settings/lookups", lazy: page(() => import("./pages/LookupsPage")) },
          { path: "/about", lazy: page(() => import("./pages/AboutPage")) },
          { path: "/dashboard", element: <Navigate to="/" replace /> },
          { path: "/manage", element: <Navigate to="/settings/lookups" replace /> },
          { path: "/cars/:id/edit", element: <LegacyCarEditRedirect /> },
          { path: "/cars/*", element: <Navigate to="/collection/vehicles" replace /> },
          // v1.3.0 kept cars at /collection/cars.
          { path: "/collection/cars/*", element: <LegacyCollectionCarsRedirect /> },
        ],
      },
    ],
  },
]);

export default router;
