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
    const isDoctor = role === "doctor";
    const theme = {
        shell: "dashboard-light-sidebar bg-[linear-gradient(180deg,#f9fdff_0%,#f3fbff_45%,#eefaf5_100%)]",
        glow: "bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.1),_transparent_42%)]",
        orb: "bg-emerald-200/40",
        badge: "border-emerald-200 bg-white/90 text-emerald-700",
        dot: "bg-emerald-500",
        active: "border-emerald-200 bg-white text-slate-950 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.22)]",
        idle: "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-white/80 hover:text-slate-950",
        panel: "border-slate-200 bg-white/80",
        button: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
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
            : isDoctor
            ? [
                  { to: "/doctor-dashboard", label: "Dashboard", hint: "Clinical" },
                  { to: "/doctor-appointments", label: "Appointments", hint: "Visits" },
                  { to: "/doctor-admissions", label: "Admissions", hint: "Admit" },
              ]
            : [
                  { to: "/dashboard", label: "Dashboard", hint: "Admin" },
                  { to: "/admin-ids", label: "Manage IDs", hint: "Access" },
                  { to: "/activity-logs", label: "Logs", hint: "Audit" },
              ];

    const handleLogout = () => {
        setIsOpen(false);
        clearSession();
        navigate("/");
    };

    const title = role === "frontdesk" ? "Front Desk" : isDoctor ? "Doctor" : "Admin Panel";
    const closeDrawer = () => setIsOpen(false);
    const sidebarWidth = "w-60";

    const renderNavLinks = (navList) =>
        navList.map((link) => {
            return (
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
                            <p className={`text-sm font-semibold ${isActive ? "text-slate-950" : "text-slate-700"}`}>{link.label}</p>
                            <span className={`text-[10px] uppercase tracking-[0.2em] ${isActive ? "text-emerald-600" : "text-slate-400"}`}>{link.hint}</span>
                        </div>
                    )}
                </NavLink>
            );
        });

    if (isNativeApp) {
        return (
            <>
                <div className="h-20 md:hidden" aria-hidden="true" />

                <button
                    type="button"
                    onClick={() => setIsOpen((current) => !current)}
                    className="fixed left-4 top-4 z-50 inline-flex h-12 w-12 items-center justify-center rounded-[18px] border border-slate-200 bg-white text-slate-900 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.25)] backdrop-blur"
                    aria-label={isOpen ? "Close menu" : "Open menu"}
                >
                    <span className="pointer-events-none absolute inset-[1px] rounded-[17px] border border-emerald-100" />
                    <span className="flex flex-col gap-1.5">
                        <span className="block h-0.5 w-5 rounded-full bg-slate-900" />
                        <span className="block h-0.5 w-4 rounded-full bg-emerald-500" />
                        <span className="block h-0.5 w-5 rounded-full bg-slate-900" />
                    </span>
                </button>

                {isOpen && <button type="button" onClick={closeDrawer} className="fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-[1px]" aria-label="Close sidebar overlay" />}

                <aside
                    className={`fixed left-0 top-0 z-50 flex h-screen ${sidebarWidth} flex-col overflow-hidden text-white ${theme.shell} transition-transform duration-300 ${
                        isOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                >
                    <div className={`absolute inset-0 ${theme.glow}`} />
                    <div className={`absolute -right-16 top-28 h-48 w-48 rounded-full blur-3xl ${theme.orb}`} />

                    <div className="relative flex h-full flex-col px-4 py-5 pt-14">
                        <div>
                            <p className="text-xs uppercase tracking-[0.4em] text-emerald-600">Hospital</p>
                            <h2 className="mt-2 text-[1.65rem] font-bold text-slate-950">{title}</h2>
                            <div className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${theme.badge}`}>
                                <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                                {isFrontDesk ? "Front Desk" : isDoctor ? "Doctor" : "Admin"}
                            </div>
                        </div>

                        <nav className="mt-6 flex-1 space-y-2 overflow-y-auto">
                            {renderNavLinks(navGroups)}
                        </nav>

                        <div className={`rounded-xl border p-3 ${theme.panel}`}>
                            <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Role</p>
                            <p className="mt-2 text-sm font-semibold text-slate-950">{title}</p>
                            {isFrontDesk && <p className="mt-1 text-[11px] text-slate-500">Patients, bookings, bills</p>}
                        </div>

                        <button
                            onClick={handleLogout}
                            className={`mt-3 rounded-xl border px-4 py-2.5 text-left text-sm font-semibold transition ${theme.button}`}
                        >
                            Logout
                        </button>
                    </div>
                </aside>
            </>
        );
    }

    return (
        <aside className={`fixed left-0 top-0 flex h-screen ${sidebarWidth} flex-col overflow-hidden text-white ${theme.shell}`}>
            <div className={`absolute inset-0 ${theme.glow}`} />
            <div className={`absolute -right-16 top-28 h-48 w-48 rounded-full blur-3xl ${theme.orb}`} />

            <div className="relative flex h-full flex-col px-4 py-5">
                <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-emerald-600">Hospital</p>
                    <h2 className="mt-2 text-[1.65rem] font-bold text-slate-950">{title}</h2>
                    <div className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${theme.badge}`}>
                        <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                        {isFrontDesk ? "Front Desk" : isDoctor ? "Doctor" : "Admin"}
                    </div>
                </div>

                <nav className="mt-6 flex-1 space-y-2 overflow-y-auto">
                    {renderNavLinks(navGroups)}
                </nav>

                <div className={`rounded-xl border p-3 ${theme.panel}`}>
                    <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Role</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{title}</p>
                    {isFrontDesk && <p className="mt-1 text-[11px] text-slate-500">Patients, bookings, bills</p>}
                </div>

                <button
                    onClick={handleLogout}
                    className={`mt-3 rounded-xl border px-4 py-2.5 text-left text-sm font-semibold transition ${theme.button}`}
                >
                    Logout
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
