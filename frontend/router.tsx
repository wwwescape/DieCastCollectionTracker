import { createBrowserRouter, Navigate, useLocation, useParams } from "react-router-dom";
import AppShell from "./AppShell";
import PublicShell from "./PublicShell";
import AddCarPage from "./components/AddCarPage";
import AddSetPage from "./components/AddSetPage";
import CarList from "./components/CarList";
import EditCarPage from "./components/EditCarPage";
import EditSetPage from "./components/EditSetPage";
import SetList from "./components/SetList";
import AboutPage from "./pages/AboutPage";
import CatalogCastingPage from "./pages/CatalogCastingPage";
import CatalogPackPage from "./pages/CatalogPackPage";
import CatalogSetPage from "./pages/CatalogSetPage";
import InsightsPage from "./pages/InsightsPage";
import Login from "./pages/Login";
import LookupsPage from "./pages/LookupsPage";
import OverviewPage from "./pages/OverviewPage";
import ManufacturerPage from "./pages/ManufacturerPage";
import ManufacturersPage from "./pages/ManufacturersPage";
import PublicCollectionPage from "./pages/PublicCollectionPage";
import SeriesListPage from "./pages/SeriesListPage";
import SeriesPage from "./pages/SeriesPage";
import SetPage from "./pages/SetPage";
import SettingsPage from "./pages/SettingsPage";
import VehiclePage from "./pages/VehiclePage";
import ProtectedLayout from "./routes/ProtectedLayout";

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
      { path: "/public/:token/vehicles", element: <PublicCollectionPage kind="vehicles" /> },
      // v1.3.0 share links pointed at /cars.
      { path: "/public/:token/cars", element: <LegacyPublicCarsRedirect /> },
      { path: "/public/:token/sets", element: <PublicCollectionPage kind="sets" /> },
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
          { path: "/collection/vehicles", element: <CarList /> },
          { path: "/collection/vehicles/add", element: <AddCarPage /> },
          { path: "/collection/vehicles/add/catalog", element: <CatalogCastingPage /> },
          { path: "/collection/vehicles/add/pack", element: <CatalogPackPage /> },
          { path: "/collection/vehicles/:id", element: <VehiclePage /> },
          { path: "/collection/vehicles/:id/edit", element: <EditCarPage /> },
          { path: "/collection/sets", element: <SetList /> },
          { path: "/collection/sets/add", element: <AddSetPage /> },
          { path: "/collection/sets/add/catalog", element: <CatalogSetPage /> },
          { path: "/collection/sets/:id", element: <SetPage /> },
          { path: "/collection/sets/:id/edit", element: <EditSetPage /> },
          { path: "/collection/manufacturers", element: <ManufacturersPage /> },
          { path: "/collection/manufacturers/:id", element: <ManufacturerPage /> },
          { path: "/collection/series", element: <SeriesListPage /> },
          { path: "/collection/series/:id", element: <SeriesPage /> },
          { path: "/insights", element: <InsightsPage /> },
          { path: "/settings", element: <SettingsPage /> },
          { path: "/settings/lookups", element: <LookupsPage /> },
          { path: "/about", element: <AboutPage /> },
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
