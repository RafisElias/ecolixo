import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import Navbar from "./components/Navbar";
import { useAuth } from "./contexts/AuthContext";

const Home = lazy(() => import("./pages/Home"));
const PickupServices = lazy(() => import("./pages/PickupServices"));
const EditPickupService = lazy(() => import("./pages/EditPickupService"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const MapPage = lazy(() => import("./pages/MapPage"));
const NewReport = lazy(() => import("./pages/NewReport"));
const ManagerDashboard = lazy(() => import("./pages/ManagerDashboard"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Journey = lazy(() => import("./pages/Journey"));

function PrivateRoute({
  children,
  managerOnly = false,
}: {
  children: React.ReactNode;
  managerOnly?: boolean;
}) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (managerOnly && user.type !== "manager") return <Navigate to="/map" replace />;
  return children;
}

function PageFallback() {
  return (
    <div className="page" style={{ textAlign: "center", paddingTop: 80 }}>
      <p style={{ color: "var(--text-muted)" }}>Carregando…</p>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <>
      {user && <Navbar />}
      <ErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route
              path="/services/:serviceId/edit"
              element={
                <PrivateRoute>
                  <EditPickupService />
                </PrivateRoute>
              }
            />
            <Route
              path="/services"
              element={
                <PrivateRoute>
                  <PickupServices />
                </PrivateRoute>
              }
            />
            <Route path="/login" element={user ? <Navigate to="/map" /> : <Login />} />
            <Route path="/register" element={user ? <Navigate to="/map" /> : <Register />} />
            <Route
              path="/map"
              element={
                <PrivateRoute>
                  <MapPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/new-report"
              element={
                <PrivateRoute>
                  <NewReport />
                </PrivateRoute>
              }
            />
            <Route
              path="/journey"
              element={
                <PrivateRoute>
                  <Journey />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute managerOnly>
                  <ManagerDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <PrivateRoute managerOnly>
                  <Analytics />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
