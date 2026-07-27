import { Link, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/context";

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      <header className="app-header">
        <Link to="/" className="brand">
          Fanta<span>Friend</span>
        </Link>
        <div className="row">
          {user && <span className="muted">{user.name}</span>}
          <button className="ghost sm" onClick={handleLogout}>
            Esci
          </button>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
