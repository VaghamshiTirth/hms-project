import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

import { clearSession } from "../services/api";

function Sidebar() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const role = localStorage.getItem("role");
    const isNativeApp = Capacitor.isNativePlatform();
    const isFrontDesk = role === "frontdesk";
    const theme = isFrontDesk
        ? {
              shell: "bg-[#0b1120]",
              glow: "bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.08),_transparent_42%)]",
              orb: "bg-slate-300/5",
              badge: "border-slate-700 bg-slate-800/70 text-slate-200",
              dot: "bg-slate-300",
              active: "border-slate-600 bg-[#182131] text-white shadow-[0_20px_40px_-32px_rgba(15,23,42,0.55)]",
              idle: "border-transparent bg-white/0 text-slate-200 hover:border-slate-800 hover:bg-[#0a1b29]",
              panel: "border-slate-800/80 bg-white/[0.04]",
              button: "border-slate-700 bg-[#0a1b29] hover:border-slate-500 hover:bg-[#0d2233]",
          }
        : {
              shell: "bg-[#0b1120]",
              glow: "bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.08),_transparent_44%)]",
              orb: "bg-slate-300/5",
              badge: "border-slate-700 bg-slate-800/70 text-slate-200",
              dot: "bg-slate-300",
              active: "border-slate-600 bg-[#182131] text-white shadow-[0_20px_40px_-32px_rgba(15,23,42,0.55)]",
              idle: "border-transparent bg-white/0 text-slate-200 hover:border-slate-800 hover:bg-slate-900/80",
              panel: "border-slate-800 bg-white/5",
              button: "border-slate-700 bg-slate-900/70 hover:border-slate-500 hover:bg-slate-800",
          };

    const navGroups =
        isFrontDesk
            ? [
                  { to: "/frontdesk-dashboard", label: "Dashboard", hint: "Home" },
                  { to: "/patients", label: "Patient Intake", hint: "Stage 1" },
                  { to: "/appointments", label: "Scheduling", hint: "Stage 2" },
                  { to: "/admission-desk", label: "Admission Desk", hint: "Stage 3" },
                  { to: "/billing", label: "Billing Desk", hint: "Stage 4" },
              ]
            : [
                  { to: "/dashboard", label: "Dashboard", hint: "Admin" },
                  { to: "/activity-logs", label: "Logs", hint: "Audit" },
              ];

    const handleLogout = () => {
        setIsOpen(false);
        clearSession();
        navigate("/");
    };

    const title = role === "frontdesk" ? "Front Desk" : "Admin Panel";
    const closeDrawer = () => setIsOpen(false);

    if (isNativeApp) {
        return (
            <>
                <div className="h-20 md:hidden" aria-hidden="true" />

                <button
                    type="button"
                    onClick={() => setIsOpen((current) => !current)}
                    className="fixed left-4 top-4 z-50 inline-flex h-12 w-12 items-center justify-center rounded-[18px] border border-cyan-300/15 bg-[linear-gradient(180deg,rgba(19,31,53,0.96),rgba(10,18,35,0.96))] text-white shadow-[0_18px_40px_-24px_rgba(8,15,35,0.95)] backdrop-blur"
                    aria-label={isOpen ? "Close menu" : "Open menu"}
                >
                    <span className="pointer-events-none absolute inset-[1px] rounded-[17px] border border-white/5" />
                    <span className="flex flex-col gap-1.5">
                        <span className="block h-0.5 w-5 rounded-full bg-slate-100" />
                        <span className="block h-0.5 w-4 rounded-full bg-cyan-200" />
                        <span className="block h-0.5 w-5 rounded-full bg-slate-100" />
                    </span>
                </button>

                {isOpen && <button type="button" onClick={closeDrawer} className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[1px]" aria-label="Close sidebar overlay" />}

                <aside
                    className={`fixed left-0 top-0 z-50 flex h-screen w-60 flex-col overflow-hidden text-white ${theme.shell} transition-transform duration-300 ${
                        isOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                >
                    <div className={`absolute inset-0 ${theme.glow}`} />
                    <div className={`absolute -right-16 top-28 h-48 w-48 rounded-full blur-3xl ${theme.orb}`} />

                    <div className="relative flex h-full flex-col px-4 py-5 pt-14">
                        <div>
                            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Hospital</p>
                            <h2 className="mt-2 text-[1.65rem] font-bold text-white">{title}</h2>
                            <div className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${theme.badge}`}>
                                <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                                {isFrontDesk ? "Front Desk" : "Admin"}
                            </div>
                        </div>

                        <nav className="mt-6 flex-1 space-y-2">
                            {navGroups.map((link) => (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    onClick={closeDrawer}
                                    className={({ isActive }) =>
                                        `block rounded-xl border px-3 py-2.5 transition ${
                                            isActive
                                                ? theme.active
                                                : theme.idle
                                        }`
                                    }
                                >
                                    {({ isActive }) => (
                                        <div className="flex items-center justify-between gap-3">
                                            <p className={`text-sm font-semibold ${isActive ? "text-white" : "text-white"}`}>{link.label}</p>
                                            <span className={`text-[10px] uppercase tracking-[0.2em] ${isActive ? "text-cyan-200" : "text-slate-500"}`}>{link.hint}</span>
                                        </div>
                                    )}
                                </NavLink>
                            ))}
                        </nav>

                        <div className={`rounded-xl border p-3 ${theme.panel}`}>
                            <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Role</p>
                            <p className="mt-2 text-sm font-semibold text-white">{title}</p>
                            {isFrontDesk && <p className="mt-1 text-[11px] text-slate-500">Patients, bookings, bills</p>}
                        </div>

                        <button
                            onClick={handleLogout}
                            className={`mt-3 rounded-xl border px-4 py-2.5 text-left text-sm font-semibold text-slate-100 transition ${theme.button}`}
                        >
                            Logout
                        </button>
                    </div>
                </aside>
            </>
        );
    }

    return (
        <aside className={`fixed left-0 top-0 flex h-screen w-60 flex-col overflow-hidden text-white ${theme.shell}`}>
            <div className={`absolute inset-0 ${theme.glow}`} />
            <div className={`absolute -right-16 top-28 h-48 w-48 rounded-full blur-3xl ${theme.orb}`} />

            <div className="relative flex h-full flex-col px-4 py-5">
                <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Hospital</p>
                    <h2 className="mt-2 text-[1.65rem] font-bold text-white">{title}</h2>
                    <div className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${theme.badge}`}>
                        <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                        {isFrontDesk ? "Front Desk" : "Admin"}
                    </div>
                </div>

                <nav className="mt-6 flex-1 space-y-2">
                    {navGroups.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            onClick={closeDrawer}
                            className={({ isActive }) =>
                                `block rounded-xl border px-3 py-2.5 transition ${
                                    isActive
                                        ? theme.active
                                        : theme.idle
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <div className="flex items-center justify-between gap-3">
                                    <p className={`text-sm font-semibold ${isActive ? "text-white" : "text-white"}`}>{link.label}</p>
                                    <span className={`text-[10px] uppercase tracking-[0.2em] ${isActive ? "text-cyan-200" : "text-slate-500"}`}>{link.hint}</span>
                                </div>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className={`rounded-xl border p-3 ${theme.panel}`}>
                    <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Role</p>
                    <p className="mt-2 text-sm font-semibold text-white">{title}</p>
                    {isFrontDesk && <p className="mt-1 text-[11px] text-slate-500">Patients, bookings, bills</p>}
                </div>

                <button
                    onClick={handleLogout}
                    className={`mt-3 rounded-xl border px-4 py-2.5 text-left text-sm font-semibold text-slate-100 transition ${theme.button}`}
                >
                    Logout
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
