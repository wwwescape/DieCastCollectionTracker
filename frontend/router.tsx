import { createBrowserRouter, Navigate, useParams } from "react-router-dom";
import AppShell from "./AppShell";
import PublicShell from "./PublicShell";
import AddCarPage from "./components/AddCarPage";
import AddSetPage from "./components/AddSetPage";
import CarList from "./components/CarList";
import EditCarPage from "./components/EditCarPage";
import EditSetPage from "./components/EditSetPage";
import SetList from "./components/SetList";
import CatalogCastingPage from "./pages/CatalogCastingPage";
import CatalogSetPage from "./pages/CatalogSetPage";
import CollectionPage from "./pages/CollectionPage";
import DashboardPage from "./pages/DashboardPage";
import Login from "./pages/Login";
import LookupsPage from "./pages/LookupsPage";
import ManufacturerPage from "./pages/ManufacturerPage";
import ManufacturersPage from "./pages/ManufacturersPage";
import PublicCollectionPage from "./pages/PublicCollectionPage";
import SettingsPage from "./pages/SettingsPage";
import ProtectedLayout from "./routes/ProtectedLayout";

// Pre-1.3 car edit links (/cars/:id/edit) now live under /collection.
const LegacyCarEditRedirect = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/collection/cars/${id}/edit`} replace />;
};

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    // Outside ProtectedLayout on purpose: no sign-in here, access is gated by the unlisted
    // token in the path instead (see backend app/api/routes/public.py).
    element: <PublicShell />,
    children: [
      { path: "/public/:token/cars", element: <PublicCollectionPage kind="cars" /> },
      { path: "/public/:token/sets", element: <PublicCollectionPage kind="sets" /> },
    ],
  },
  {
    element: <ProtectedLayout />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/collection", element: <CollectionPage /> },
          { path: "/collection/cars", element: <CarList /> },
          { path: "/collection/cars/add", element: <AddCarPage /> },
          { path: "/collection/cars/add/catalog", element: <CatalogCastingPage /> },
          { path: "/collection/cars/:id/edit", element: <EditCarPage /> },
          { path: "/collection/sets", element: <SetList /> },
          { path: "/collection/sets/add", element: <AddSetPage /> },
          { path: "/collection/sets/add/catalog", element: <CatalogSetPage /> },
          { path: "/collection/sets/:id/edit", element: <EditSetPage /> },
          { path: "/collection/manufacturers", element: <ManufacturersPage /> },
          { path: "/collection/manufacturers/:id", element: <ManufacturerPage /> },
          { path: "/settings", element: <SettingsPage /> },
          { path: "/settings/lookups", element: <LookupsPage /> },
          { path: "/dashboard", element: <Navigate to="/" replace /> },
          { path: "/manage", element: <Navigate to="/settings/lookups" replace /> },
          { path: "/cars/:id/edit", element: <LegacyCarEditRedirect /> },
          { path: "/cars/*", element: <Navigate to="/collection/cars" replace /> },
        ],
      },
    ],
  },
]);

export default router;
