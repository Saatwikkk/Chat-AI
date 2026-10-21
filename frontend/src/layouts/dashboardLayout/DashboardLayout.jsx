import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import "./dashboardLayout.css";
import ChatList from "../../components/chatList/ChatList";

const DashboardLayout = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu whenever the user navigates.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  if (!isLoaded) return <div className="pageStatus">Loading…</div>;

  if (!isSignedIn) {
    const redirect = encodeURIComponent(location.pathname);
    return <Navigate to={`/sign-in?redirect_url=${redirect}`} replace />;
  }

  return (
    <div className={`dashboardLayout ${menuOpen ? "menuOpen" : ""}`}>
      <button
        className="menuToggle"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
      >
        <i className={`fa-solid ${menuOpen ? "fa-xmark" : "fa-bars"}`} />
      </button>
      <aside className="menu">
        <ChatList />
      </aside>
      {menuOpen && <div className="backdrop" onClick={() => setMenuOpen(false)} />}
      <div className="content">
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;
