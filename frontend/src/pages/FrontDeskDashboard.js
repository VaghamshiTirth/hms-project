import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import LiveDateTimeCard from "../components/LiveDateTimeCard";
import Sidebar from "../components/Sidebar";
import API from "../services/api";

const QUEUE_GROUPS = [
    {
        key: "waiting",
        title: "Waiting",
        subtitle: "Not checked in yet",
        accent: "from-amber-400/20 via-amber-300/8 to-transparent",
        badge: "border-amber-300/20 bg-amber-300/10 text-amber-200",
    },
    {
        key: "checked_in",
        title: "Checked In",
        subtitle: "Ready for doctor",
        accent: "from-cyan-400/20 via-cyan-300/8 to-transparent",
        badge: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    },
    {
        key: "in_consultation",
        title: "In Consultation",
        subtitle: "Currently with doctor",
        accent: "from-emerald-400/20 via-emerald-300/8 to-transparent",
        badge: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    },
    {
        key: "completed",
        title: "Completed",
        subtitle: "Visits closed today",
        accent: "from-slate-300/12 via-slate-200/5 to-transparent",
        badge: "border-slate-600 bg-slate-800 text-slate-200",
    },
];

function getStatusTone(status) {
    if (status === "Completed") return "border border-emerald-400/15 bg-emerald-400/10 text-emerald-200";
    if (status === "Confirmed") return "border border-cyan-400/15 bg-cyan-400/10 text-cyan-200";
    return "border border-amber-300/15 bg-amber-300/10 text-amber-200";
}

function getInitials(name = "") {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

function FrontDeskDashboard() {
    const [appointments, setAppointments] = useState([]);
    const [billing, setBilling] = useState([]);
    const [selectedDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const loadData = useCallback(async () => {
        try {
            const [appointmentsRes, billingRes] = await Promise.all([
                API.get("appointments/", { params: { date: selectedDate } }),
                API.get("billing/", { params: { status: "Pending" } }),
            ]);

            setAppointments(appointmentsRes.data);
            setBilling(billingRes.data);
            setError("");
        } catch (err) {
            setError(err.response?.data?.error || "Could not load front-desk dashboard.");
        }
    }, [selectedDate]);

    useEffect(() => {
        const role = localStorage.getItem("role");

        if (role !== "frontdesk") {
            navigate("/", { replace: true });
            return;
        }

        loadData();
    }, [loadData, navigate]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            loadData();
        }, 20000);

        return () => window.clearInterval(intervalId);
    }, [loadData]);

    const filteredAppointments = useMemo(
        () =>
            [...appointments].sort((left, right) => {
                const leftKey = `${left.date} ${left.time_slot || "99:99"} ${String(left.id).padStart(6, "0")}`;
                const rightKey = `${right.date} ${right.time_slot || "99:99"} ${String(right.id).padStart(6, "0")}`;
                return leftKey.localeCompare(rightKey);
            }),
        [appointments]
    );

    const queueBuckets = useMemo(
        () =>
            QUEUE_GROUPS.reduce((result, group) => {
                result[group.key] = filteredAppointments.filter((appointment) => appointment.queue_status === group.key);
                return result;
            }, {}),
        [filteredAppointments]
    );

    const activeAppointments = filteredAppointments.filter((appointment) => !appointment.is_no_show && appointment.queue_status !== "completed");
    const noShowAppointments = filteredAppointments.filter((appointment) => appointment.is_no_show);
    const longWaitAppointments = activeAppointments.filter((appointment) => Number(appointment.estimated_wait_minutes || 0) >= 30);
    const pendingBillsCount = billing.length;

    const handleQueueAction = async (appointment, updates) => {
        setMessage("");
        setError("");

        try {
            const response = await API.put(`appointments/${appointment.id}/`, updates);
            setMessage(response.data.message || "Queue updated.");
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || "Could not update queue.");
        }
    };

    return (
        <div className="min-h-screen bg-[#0b1120]">
            <Sidebar />

            <main className="min-h-screen p-5 md:ml-64 md:p-8">
                <div className="mx-auto max-w-[1600px]">
                    <LiveDateTimeCard stageLabel="Front Desk - Live Date and Time" />

                    {message && <p className="mt-6 rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}
                    {error && <p className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

                    <section className="mt-6 grid gap-5 xl:grid-cols-4">
                        {QUEUE_GROUPS.map((group) => {
                            const groupAppointments = queueBuckets[group.key] || [];

                            return (
                                <div key={group.key} className="overflow-hidden rounded-[28px] border border-slate-800 bg-[#111827] shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                    <div className={`border-b border-slate-800 bg-gradient-to-br ${group.accent} px-5 py-5`}>
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{group.title}</p>
                                                <p className="mt-2 text-sm text-slate-400">{group.subtitle}</p>
                                            </div>
                                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${group.badge}`}>
                                                {groupAppointments.length}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="max-h-[760px] space-y-3 overflow-y-auto px-4 py-4">
                                        {groupAppointments.map((appointment) => (
                                            <div key={appointment.id} className="rounded-[24px] border border-slate-800 bg-[#0f172a] p-4">
                                                {group.key === "completed" ? (
                                                    <div className="space-y-2">
                                                        <p className="text-base font-semibold text-white">{appointment.patient_name}</p>
                                                        <p className="text-sm text-slate-400">{appointment.doctor_name}</p>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-sm font-bold text-white">
                                                            {getInitials(appointment.patient_name)}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <p className="text-base font-semibold text-white">{appointment.patient_name}</p>
                                                                    <p className="mt-1 text-sm text-slate-400">{appointment.doctor_name}</p>
                                                                </div>
                                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${getStatusTone(appointment.status)}`}>
                                                                    {appointment.status}
                                                                </span>
                                                            </div>

                                                            <p className="mt-3 text-sm text-slate-500">
                                                                {appointment.time_slot || "No slot"}
                                                                {appointment.queue_position ? ` | Queue #${appointment.queue_position}` : ""}
                                                                {appointment.estimated_wait_minutes !== null && appointment.estimated_wait_minutes !== undefined ? ` | ETA ${appointment.estimated_wait_minutes} min` : ""}
                                                            </p>

                                                            {appointment.reason && <p className="mt-3 text-sm text-slate-300">Reason: {appointment.reason}</p>}
                                                            {appointment.pre_checkin_notes && <p className="mt-2 text-sm text-cyan-100">Pre-check-in: {appointment.pre_checkin_notes}</p>}
                                                            {appointment.is_no_show && <p className="mt-2 text-sm text-rose-200">Marked no-show</p>}

                                                            <div className="mt-4 flex flex-wrap gap-2">
                                                                {group.key === "waiting" && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleQueueAction(appointment, { queue_status: "checked_in", status: "Confirmed", is_no_show: false })}
                                                                        className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/40"
                                                                    >
                                                                        Check In
                                                                    </button>
                                                                )}
                                                                {group.key === "checked_in" && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleQueueAction(appointment, { queue_status: "in_consultation", status: "Confirmed", is_no_show: false })}
                                                                        className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400/40"
                                                                    >
                                                                        Send to Doctor
                                                                    </button>
                                                                )}
                                                                {group.key === "in_consultation" && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleQueueAction(appointment, { queue_status: "completed", status: "Completed", is_no_show: false })}
                                                                        className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400/40"
                                                                    >
                                                                        Complete Visit
                                                                    </button>
                                                                )}
                                                                {group.key !== "completed" && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleQueueAction(appointment, { queue_status: "waiting", status: "Pending", is_no_show: true })}
                                                                        className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:border-rose-500/60"
                                                                    >
                                                                        Mark No-Show
                                                                    </button>
                                                                )}
                                                                {group.key !== "waiting" && group.key !== "completed" && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleQueueAction(appointment, { queue_status: "waiting", status: "Pending", is_no_show: false })}
                                                                        className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
                                                                    >
                                                                        Back to Waiting
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {!groupAppointments.length && (
                                            <div className="rounded-[24px] border border-dashed border-slate-700 bg-[#0f172a] px-4 py-8 text-sm text-slate-400">
                                                No patients in {group.title.toLowerCase()}.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </section>

                    <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_1fr]">
                        <div className="rounded-[28px] border border-slate-800 bg-[#111827] p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Attention Needed</p>
                                    <h2 className="mt-2 text-2xl font-bold text-white">Alerts</h2>
                                </div>
                                <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">
                                    {longWaitAppointments.length + noShowAppointments.length}
                                </span>
                            </div>

                            <div className="mt-5 space-y-3">
                                {longWaitAppointments.slice(0, 5).map((appointment) => (
                                    <div key={`long-wait-${appointment.id}`} className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                                        <p className="font-semibold text-white">{appointment.patient_name}</p>
                                        <p className="mt-1 text-sm text-slate-300">
                                            Waiting for {appointment.doctor_name} | ETA {appointment.estimated_wait_minutes} min
                                        </p>
                                    </div>
                                ))}
                                {noShowAppointments.slice(0, 5).map((appointment) => (
                                    <div key={`no-show-${appointment.id}`} className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                                        <p className="font-semibold text-white">{appointment.patient_name}</p>
                                        <p className="mt-1 text-sm text-slate-300">
                                            No-show for {appointment.doctor_name} at {appointment.time_slot || "No slot"}
                                        </p>
                                    </div>
                                ))}
                                {!longWaitAppointments.length && !noShowAppointments.length && (
                                    <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0f172a] px-4 py-8 text-sm text-slate-400">
                                        No queue alerts right now.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-[28px] border border-slate-800 bg-[#111827] p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Revenue Hold</p>
                                    <h2 className="mt-2 text-2xl font-bold text-white">Pending billing follow-up</h2>
                                </div>
                                <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-rose-200">
                                    {pendingBillsCount}
                                </span>
                            </div>

                            <div className="mt-5 space-y-3">
                                {billing.slice(0, 6).map((bill) => (
                                    <div key={bill.id} className="rounded-2xl border border-slate-800 bg-[#0f172a] p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="font-semibold text-white">{bill.patient_name}</p>
                                                <p className="mt-1 text-sm text-slate-400">{bill.invoice_number || "Invoice pending"}</p>
                                            </div>
                                            <span className="text-sm font-semibold text-rose-200">Rs. {bill.amount}</span>
                                        </div>
                                    </div>
                                ))}
                                {!billing.length && (
                                    <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0f172a] px-4 py-8 text-sm text-slate-400">
                                        No pending bills right now.
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

export default FrontDeskDashboard;
