import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import type { ReactNode } from "react";

import { AuthProvider } from "./auth/AuthProvider";
import { useAuth } from "./auth/context";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./pages/DashboardPage";
import { LeaguePage } from "./pages/LeaguePage";
import { LoginPage } from "./pages/LoginPage";
import { OrganizationPage } from "./pages/OrganizationPage";
import { RegisterPage } from "./pages/RegisterPage";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="loading">Caricamento…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="loading">Caricamento…</div>;
  }
  if (user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/organizations/:orgId" element={<OrganizationPage />} />
            <Route path="/leagues/:leagueId" element={<LeaguePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
