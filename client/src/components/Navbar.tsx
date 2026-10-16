import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogoutIcon } from "./Icons";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      <Link to="/" className="flex items-center gap-2 font-semibold text-slate-800">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-600 text-white">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <rect x="4" y="4" width="4.5" height="16" rx="1.5" />
            <rect x="10" y="4" width="4.5" height="10" rx="1.5" />
            <rect x="16" y="4" width="4" height="13" rx="1.5" />
          </svg>
        </span>
        Kanban
      </Link>
      <div className="flex items-center gap-3">
        {user && <span className="hidden text-sm text-slate-600 sm:inline">{user.name}</span>}
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <LogoutIcon className="h-4 w-4" />
          Log out
        </button>
      </div>
    </header>
  );
}
