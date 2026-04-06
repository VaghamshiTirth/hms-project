import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import API from "../services/api";

const OVERVIEW_OPTIONS = [
    { key: "overview", label: "Overview" },
    { key: "monthly", label: "Monthly" },
    { key: "daily", label: "Daily" },
];

function formatDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatMonthInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
}

function shiftDateString(dateString, days) {
    const nextDate = new Date(`${dateString}T00:00:00`);
    nextDate.setDate(nextDate.getDate() + days);
    return formatDateInput(nextDate);
}

function shiftMonthString(monthString, months) {
    const [year, month] = monthString.split("-").map(Number);
    const nextDate = new Date(year, month - 1 + months, 1);
    return formatMonthInput(nextDate);
}

function isWithinScope(dateValue, scope, selectedDay, selectedMonth) {
    if (!dateValue || scope === "overview") {
        return true;
    }

    const candidate = new Date(dateValue);

    if (Number.isNaN(candidate.getTime())) {
        return false;
    }

    if (scope === "daily") {
        return formatDateInput(candidate) === selectedDay;
    }

    return formatMonthInput(candidate) === selectedMonth;
}

function Dashboard() {
    const today = new Date();
    const [summary, setSummary] = useState({
        patients: 0,
        doctors: 0,
        appointments: 0,
        billing_total: 0,
        scope: "overview",
        scope_label: "Overall overview",
    });
    const [appointments, setAppointments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [billing, setBilling] = useState([]);
    const [error, setError] = useState("");
    const [activeOverview, setActiveOverview] = useState("overview");
    const [selectedDay, setSelectedDay] = useState(() => formatDateInput(today));
    const [selectedMonth, setSelectedMonth] = useState(() => formatMonthInput(today));
    const [selectedBillId, setSelectedBillId] = useState(null);
    const [isBillingDetailOpen, setIsBillingDetailOpen] = useState(false);
    const [activeBillingGroup, setActiveBillingGroup] = useState("paid");
    const navigate = useNavigate();

    useEffect(() => {
        const role = localStorage.getItem("role");

        if (role !== "admin") {
            navigate("/", { replace: true });
            return;
        }

        const loadDashboard = async () => {
            try {
                const summaryParams = { scope: activeOverview };

                if (activeOverview === "daily") {
                    summaryParams.date = selectedDay;
                } else if (activeOverview === "monthly") {
                    summaryParams.month = selectedMonth;
                }

                const [summaryRes, appointmentsRes, doctorsRes, billingRes] = await Promise.all([
                    API.get("summary/", { params: summaryParams }),
                    API.get("appointments/"),
                    API.get("doctors/"),
                    API.get("billing/"),
                ]);

                setSummary(summaryRes.data);
                setAppointments(appointmentsRes.data);
                setDoctors(doctorsRes.data);
                setBilling(billingRes.data);
            } catch (err) {
                setError(err.response?.data?.error || "Could not load admin dashboard.");
            }
        };

        loadDashboard();
    }, [activeOverview, navigate, selectedDay, selectedMonth]);

    const scopedAppointments = appointments.filter((item) => isWithinScope(item.date, activeOverview, selectedDay, selectedMonth));
    const scopedBilling = billing.filter((item) => isWithinScope(item.created_at, activeOverview, selectedDay, selectedMonth));
    const paidBilling = scopedBilling.filter((item) => item.status === "Paid");
    const pendingBilling = scopedBilling.filter((item) => item.status === "Pending");
    const paidBills = scopedBilling.filter((item) => item.status === "Paid").length;
    const pendingBills = scopedBilling.filter((item) => item.status === "Pending").length;
    const visibleBilling = activeBillingGroup === "paid" ? paidBilling : pendingBilling;
    const selectedBill = visibleBilling.find((item) => item.id === selectedBillId) || visibleBilling[0] || null;

    const doctorWorkload = doctors
        .map((doctor) => ({
            ...doctor,
            appointmentCount: scopedAppointments.filter((appointment) => appointment.doctor === doctor.id).length,
        }))
        .filter((doctor) => doctor.appointmentCount > 0)
        .sort((a, b) => b.appointmentCount - a.appointmentCount);

    const topDoctor = doctorWorkload[0];

    const cards = [
        { label: "Patient Profiles", value: summary.patients, accent: "text-emerald-300", bar: "from-emerald-400 to-lime-300" },
        { label: "Doctors", value: summary.doctors, accent: "text-teal-200", bar: "from-teal-400 to-cyan-300" },
        { label: "Appointments", value: summary.appointments, accent: "text-sky-300", bar: "from-sky-400 to-blue-300" },
        { label: "Billing Total", value: `Rs. ${summary.billing_total}`, accent: "text-lime-300", bar: "from-lime-300 to-emerald-400" },
    ];

    useEffect(() => {
        if (!visibleBilling.length) {
            setSelectedBillId(null);
            setIsBillingDetailOpen(false);
            return;
        }

        if (!visibleBilling.some((item) => item.id === selectedBillId)) {
            setSelectedBillId(visibleBilling[0].id);
        }
    }, [visibleBilling, selectedBillId]);

    useEffect(() => {
        if (activeBillingGroup === "paid" && !paidBilling.length && pendingBilling.length) {
            setActiveBillingGroup("pending");
            return;
        }

        if (activeBillingGroup === "pending" && !pendingBilling.length && paidBilling.length) {
            setActiveBillingGroup("paid");
        }
    }, [activeBillingGroup, paidBilling.length, pendingBilling.length]);

    return (
        <div className="min-h-screen bg-[#0b1120]">
            <Sidebar />

            <main className="min-h-screen p-6 md:ml-64 md:p-8">
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">Admin Analytics</p>
                    <h1 className="text-3xl font-bold text-white">Oversight Dashboard</h1>
                    <p className="text-sm text-slate-400">Admin overview.</p>
                </div>

                <section className="mt-6 flex flex-col gap-4 rounded-3xl border border-slate-800 bg-[#111827] p-5 shadow-[0_30px_80px_-52px_rgba(15,23,42,0.9)] sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Overview Range</p>
                        <p className="mt-2 text-sm text-slate-300">{summary.scope_label}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {OVERVIEW_OPTIONS.map((option) => {
                            const isActive = activeOverview === option.key;

                            return (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => setActiveOverview(option.key)}
                                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                        isActive
                                            ? "bg-cyan-400 text-slate-950"
                                            : "border border-slate-700 bg-[#0f172a] text-slate-300 hover:border-slate-500"
                                    }`}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {activeOverview !== "overview" && (
                    <section className="mt-4 flex flex-col gap-4 rounded-3xl border border-slate-800 bg-[#111827] p-5 shadow-[0_30px_80px_-52px_rgba(15,23,42,0.9)] lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                                {activeOverview === "daily" ? "Selected Day" : "Selected Month"}
                            </p>
                            <p className="mt-2 text-sm text-slate-300">
                                {activeOverview === "daily" ? selectedDay : selectedMonth}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    activeOverview === "daily"
                                        ? setSelectedDay((current) => shiftDateString(current, -1))
                                        : setSelectedMonth((current) => shiftMonthString(current, -1))
                                }
                                className="rounded-full border border-slate-700 bg-[#0f172a] px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-500"
                            >
                                Previous
                            </button>

                            <input
                                type={activeOverview === "daily" ? "date" : "month"}
                                value={activeOverview === "daily" ? selectedDay : selectedMonth}
                                onChange={(event) =>
                                    activeOverview === "daily"
                                        ? setSelectedDay(event.target.value)
                                        : setSelectedMonth(event.target.value)
                                }
                                className="rounded-2xl border border-slate-700 bg-[#0f172a] px-4 py-3 text-sm text-white outline-none transition focus:border-slate-500"
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    activeOverview === "daily"
                                        ? setSelectedDay((current) => shiftDateString(current, 1))
                                        : setSelectedMonth((current) => shiftMonthString(current, 1))
                                }
                                className="rounded-full border border-slate-700 bg-[#0f172a] px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-500"
                            >
                                Next
                            </button>
                        </div>
                    </section>
                )}

                {error && <p className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

                <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {cards.map((card) => (
                        <div key={card.label} className="rounded-3xl border border-slate-800 bg-[#111827] p-5 shadow-[0_30px_80px_-52px_rgba(15,23,42,0.9)]">
                            <div className={`h-1.5 w-24 rounded-full bg-gradient-to-r ${card.bar}`} />
                            <p className="mt-4 text-sm text-slate-400">{card.label}</p>
                            <p className={`mt-3 text-3xl font-bold ${card.accent}`}>{card.value}</p>
                        </div>
                    ))}
                </section>

                <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                    <div className="rounded-3xl border border-slate-800 bg-[#111827] p-6 shadow-[0_30px_80px_-52px_rgba(15,23,42,0.9)]">
                        <h2 className="text-lg font-semibold text-white">Summary</h2>
                        <div className="mt-4 space-y-3">
                            <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-4">
                                <p className="text-sm text-slate-400">Top Doctor Load</p>
                                <p className="mt-2 text-base font-semibold text-white">
                                    {topDoctor ? `${topDoctor.user_name} with ${topDoctor.appointmentCount} appointments` : "No doctor workload data yet"}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-4">
                                <p className="text-sm text-slate-400">Billing Health</p>
                                <p className="mt-2 text-base font-semibold text-white">
                                    {paidBills} paid bills and {pendingBills} pending bills
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-800 bg-[#111827] p-6 shadow-[0_30px_80px_-52px_rgba(15,23,42,0.9)]">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-lg font-semibold text-white">Doctor Workload</h2>
                            <span className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                                {doctorWorkload.length} doctors
                            </span>
                        </div>

                        <div className="mt-4 space-y-3">
                            {doctorWorkload.map((doctor) => (
                                <div key={doctor.id} className="rounded-2xl border border-slate-800 bg-[#0f172a] p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-white">{doctor.user_name}</p>
                                            <p className="text-sm text-slate-400">{doctor.specialization}</p>
                                        </div>
                                        <span className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                                            {doctor.appointmentCount} appts
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {!doctorWorkload.length && <p className="text-sm text-slate-400">No doctor records available yet.</p>}
                        </div>
                    </div>
                </section>

                <section className="mt-6 rounded-3xl border border-slate-800 bg-[#111827] p-6 shadow-[0_30px_80px_-52px_rgba(15,23,42,0.9)]">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-white">Recent Billing Activity</h2>
                            <p className="mt-1 text-sm text-slate-400">Select a bill to view its details.</p>
                        </div>
                        <span className="rounded-full border border-lime-300/15 bg-lime-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-lime-200">
                            {scopedBilling.length} bills
                        </span>
                    </div>

                    <div className="mt-4">
                        <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-5">
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveBillingGroup("paid")}
                                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                        activeBillingGroup === "paid"
                                            ? "bg-emerald-400 text-slate-950"
                                            : "border border-slate-700 bg-[#111827] text-slate-300 hover:border-slate-500"
                                    }`}
                                >
                                    Paid Bills ({paidBilling.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveBillingGroup("pending")}
                                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                        activeBillingGroup === "pending"
                                            ? "bg-amber-300 text-slate-950"
                                            : "border border-slate-700 bg-[#111827] text-slate-300 hover:border-slate-500"
                                    }`}
                                >
                                    Pending Bills ({pendingBilling.length})
                                </button>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                {visibleBilling.slice(0, 6).map((bill) => {
                                    const isActive = selectedBill?.id === bill.id && isBillingDetailOpen;
                                    const isPaidTab = activeBillingGroup === "paid";

                                    return (
                                        <button
                                            key={bill.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedBillId(bill.id);
                                                setIsBillingDetailOpen(true);
                                            }}
                                            className={`rounded-2xl border p-4 text-left transition ${
                                                isActive
                                                    ? isPaidTab
                                                        ? "border-emerald-400/30 bg-emerald-400/10"
                                                        : "border-amber-300/30 bg-amber-300/10"
                                                    : "border-slate-800 bg-[#111827] hover:border-slate-600"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate font-semibold text-white">{bill.patient_name}</p>
                                                    <p className="mt-1 text-sm text-slate-400">Rs. {bill.amount}</p>
                                                </div>
                                                <span
                                                    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                                                        isPaidTab
                                                            ? "border border-emerald-400/15 bg-emerald-400/10 text-emerald-200"
                                                            : "border border-amber-300/15 bg-amber-300/10 text-amber-200"
                                                    }`}
                                                >
                                                    {bill.status}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                                {!visibleBilling.length && (
                                    <p className="text-sm text-slate-400">
                                        {activeBillingGroup === "paid" ? "No paid bills in this range." : "No pending bills in this range."}
                                    </p>
                                )}
                            </div>

                            {!scopedBilling.length && <p className="mt-4 text-sm text-slate-400">No billing records available for this range yet.</p>}
                        </div>

                    </div>
                </section>
            </main>

            {isBillingDetailOpen && selectedBill && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-4 backdrop-blur-sm sm:items-center sm:p-6">
                    <button
                        type="button"
                        onClick={() => setIsBillingDetailOpen(false)}
                        className="absolute inset-0"
                        aria-label="Close selected bill detail"
                    />

                    <div className="relative w-full max-w-lg rounded-[28px] border border-slate-700 bg-[#0f172a] p-6 shadow-[0_36px_120px_-48px_rgba(15,23,42,0.95)]">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Selected Bill Detail</p>
                                <h3 className="mt-2 text-2xl font-bold text-white">{selectedBill.patient_name}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                                    {selectedBill.status}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsBillingDetailOpen(false)}
                                    className="rounded-full border border-slate-700 bg-[#111827] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-500"
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
                                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Amount</p>
                                <p className="mt-2 text-base font-semibold text-lime-300">Rs. {selectedBill.amount}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
                                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Invoice</p>
                                <p className="mt-2 text-base text-slate-200">{selectedBill.invoice_number || "Invoice pending"}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
                                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Appointment Date</p>
                                <p className="mt-2 text-base text-slate-200">{selectedBill.appointment_date || "Not linked"}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
                                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Time Slot</p>
                                <p className="mt-2 text-base text-slate-200">{selectedBill.appointment_time_slot || "No slot"}</p>
                            </div>
                        </div>

                        <div className="mt-4 rounded-2xl border border-slate-800 bg-[#111827] p-4">
                            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Created</p>
                            <p className="mt-2 text-base text-slate-200">{new Date(selectedBill.created_at).toLocaleString()}</p>
                        </div>

                        <div className="mt-4 rounded-2xl border border-slate-800 bg-[#111827] p-4">
                            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Notes</p>
                            <p className="mt-2 text-base text-slate-200">{selectedBill.notes || "No notes added."}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
