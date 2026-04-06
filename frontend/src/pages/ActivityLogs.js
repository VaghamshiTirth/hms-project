import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import API from "../services/api";

const LOG_SECTIONS = [
    { key: "admin", title: "Admin Logs", emptyText: "No admin logs found." },
    { key: "frontdesk", title: "Frontdesk Logs", emptyText: "No frontdesk logs found." },
    { key: "doctor", title: "Doctor Logs", emptyText: "No doctor logs found." },
    { key: "patient", title: "Patient Logs", emptyText: "No patient logs found." },
];

function ActivityLogs() {
    const [logs, setLogs] = useState([]);
    const [search, setSearch] = useState("");
    const [error, setError] = useState("");
    const [activeSection, setActiveSection] = useState("admin");
    const navigate = useNavigate();

    useEffect(() => {
        const role = localStorage.getItem("role");

        if (role !== "admin") {
            navigate("/", { replace: true });
            return;
        }

        const loadLogs = async () => {
            try {
                const response = await API.get("activity-logs/");
                setLogs(response.data);
            } catch (err) {
                setError(err.response?.data?.error || "Could not load activity logs.");
            }
        };

        loadLogs();
    }, [navigate]);

    const filteredLogs = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return logs;
        }

        return logs.filter((item) =>
            [item.actor_name, item.actor_role, item.action, item.entity_type, item.details]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(query))
        );
    }, [logs, search]);

    const logsByRole = useMemo(
        () =>
            LOG_SECTIONS.reduce((grouped, section) => {
                grouped[section.key] = filteredLogs.filter((item) => item.actor_role === section.key);
                return grouped;
            }, {}),
        [filteredLogs]
    );

    const selectedSection = LOG_SECTIONS.find((section) => section.key === activeSection) || LOG_SECTIONS[0];
    const selectedLogs = logsByRole[selectedSection.key] || [];

    const renderLogsTable = (sectionLogs, emptyText) => {
        if (!sectionLogs.length) {
            return (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0f172a] px-4 py-8 text-sm text-slate-400">
                    {emptyText}
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800">
                    <thead>
                        <tr className="text-left text-xs uppercase tracking-[0.24em] text-slate-500">
                            <th className="px-4 py-3 font-semibold">Time</th>
                            <th className="px-4 py-3 font-semibold">Actor</th>
                            <th className="px-4 py-3 font-semibold">Action</th>
                            <th className="px-4 py-3 font-semibold">Entity</th>
                            <th className="px-4 py-3 font-semibold">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {sectionLogs.map((log) => (
                            <tr key={log.id} className="text-sm text-slate-300">
                                <td className="px-4 py-4 align-top">{new Date(log.created_at).toLocaleString()}</td>
                                <td className="px-4 py-4 align-top">{log.actor_name || "System"}</td>
                                <td className="px-4 py-4 align-top">
                                    <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                                        {log.action}
                                    </span>
                                </td>
                                <td className="px-4 py-4 align-top">{log.entity_type}</td>
                                <td className="px-4 py-4 align-top text-slate-400">{log.details || "-"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#0b1120]">
            <Sidebar />

            <main className="min-h-screen p-6 md:ml-64 md:p-8">
                <div className="mx-auto max-w-7xl">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">Admin Audit</p>
                            <h1 className="text-3xl font-bold text-white">Activity Logs</h1>
                            <p className="text-sm text-slate-400">Recent system actions.</p>
                        </div>

                        <input
                            className="w-full max-w-sm rounded-xl border border-slate-700 bg-[#111827] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500"
                            placeholder="Search action, role, details"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {error && <p className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

                    <section className="mt-6 rounded-3xl border border-slate-800 bg-[#111827] p-5 shadow-[0_30px_80px_-52px_rgba(15,23,42,0.9)]">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-white">{selectedSection.title}</h2>
                                <p className="mt-1 text-sm text-slate-400">Select a role to see only that activity detail.</p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {LOG_SECTIONS.map((section) => {
                                    const isActive = section.key === selectedSection.key;

                                    return (
                                        <button
                                            key={section.key}
                                            type="button"
                                            onClick={() => setActiveSection(section.key)}
                                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                                isActive
                                                    ? "bg-cyan-400 text-slate-950"
                                                    : "border border-slate-700 bg-[#0f172a] text-slate-300 hover:border-slate-500"
                                            }`}
                                        >
                                            {section.title}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-3">
                            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                                {selectedLogs.length} entries
                            </span>
                        </div>

                        <div className="mt-5">{renderLogsTable(selectedLogs, selectedSection.emptyText)}</div>
                    </section>

                    {!filteredLogs.length && !error && (
                        <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-[#0f172a] px-4 py-8 text-sm text-slate-400">
                            No logs found.
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default ActivityLogs;
