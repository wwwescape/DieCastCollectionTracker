import { createBrowserRouter } from "react-router-dom";
import AppShell from "./AppShell";
import AddCarPage from "./components/AddCarPage";
import CarList from "./components/CarList";
import EditCarPage from "./components/EditCarPage";
import DashboardPage from "./pages/DashboardPage";
import Login from "./pages/Login";
import ManagePage from "./pages/ManagePage";
import ProtectedLayout from "./routes/ProtectedLayout";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    element: <ProtectedLayout />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <CarList /> },
          { path: "/cars/add", element: <AddCarPage /> },
          { path: "/cars/:id/edit", element: <EditCarPage /> },
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/manage", element: <ManagePage /> },
        ],
      },
    ],
  },
]);

export default router;
