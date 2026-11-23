import { Outlet, useLocation, useNavigate } from "react-router-dom";
import BottomNav from "./BottomNav";
import { useApp } from "../lib/store";

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

export default function Layout() {
  const { profile, theme, toggleTheme } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isProfile = location.pathname === "/profile";
  const initials = profile.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "A";

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[480px] flex-col bg-white dark:bg-[#0c0a09] text-[#18181B] dark:text-[#f1f5f9] transition-colors">
      {/* Global header — always visible on every Layout page */}
      {!isHome && (
        <header className="flex shrink-0 items-center justify-between px-[21px] pb-1 pt-[18px]">
          <div className="text-[22px] font-black tracking-[-1px] text-[#18181B] dark:text-white flex items-center gap-1.5">
            <span>ፍሬ</span><span className="text-[#FF7F02]">.</span>
            <span className="text-xs font-bold text-[#FF7F02] tracking-normal">Firie</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Dark Mode toggle button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="grid h-[34px] w-[34px] place-items-center rounded-full bg-orange-50 dark:bg-zinc-800 text-[#FF7F02] dark:text-amber-300 transition-colors"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            {/* Settings gear — always shown */}
            <button
              onClick={() => navigate("/profile")}
              aria-label="Settings"
              className={`grid h-[34px] w-[34px] place-items-center rounded-full transition-colors ${
                isProfile
                  ? "bg-[#FF7F02] text-white shadow-xs"
                  : "bg-orange-50 dark:bg-zinc-800 text-[#FF7F02] dark:text-[#FF7F02] hover:bg-orange-100"
              }`}
            >
              <SettingsIcon />
            </button>

            {/* Avatar initials */}
            {!isProfile && (
              <button
                onClick={() => navigate("/profile")}
                aria-label="Open profile"
                className="grid h-[34px] w-[34px] place-items-center rounded-full bg-[#e5ebf3] dark:bg-[#1e293b] text-[11px] font-bold text-[#27466c] dark:text-[#dce5f2]"
              >
                {initials}
              </button>
            )}
          </div>
        </header>
      )}
      <main className="min-h-0 flex-1 px-[21px] pb-[88px] pt-3">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
