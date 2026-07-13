import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import LiveDateTimeCard from "../components/LiveDateTimeCard";
import Sidebar from "../components/Sidebar";
import API, { buildApiUrl } from "../services/api";

function getStatusTone(status) {
    if (status === "Paid") return "border border-emerald-400/15 bg-emerald-400/10 text-emerald-200";
    return "border border-amber-300/15 bg-amber-300/10 text-amber-200";
}


function Billing() {
    const [activeMode, setActiveMode] = useState("create");
    const [patients, setPatients] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [bills, setBills] = useState([]);
    const [allBills, setAllBills] = useState([]);
    const [editingBillId, setEditingBillId] = useState(null);
    const [filters, setFilters] = useState({ patient_user_id: "", status: "", payment_method: "" });
    const [form, setForm] = useState({ patient: "", appointment: "", amount: "", status: "Paid", payment_method: "Cash", notes: "", card_name: "", card_number: "", card_expiry: "", card_cvv: "", upi_id: "" });
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const loadData = useCallback(async () => {
        try {
            const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
            const [patientsRes, appointmentsRes, billsRes, allBillsRes] = await Promise.all([
                API.get("patients/"),
                API.get("appointments/"),
                API.get("billing/", { params }),
                API.get("billing/"),
            ]);
            setPatients(patientsRes.data);
            setAppointments(appointmentsRes.data);
            setBills(billsRes.data);
            setAllBills(allBillsRes.data);
        } catch (err) {
            setError(err.response?.data?.error || "Could not load billing data.");
        }
    }, [filters]);

    useEffect(() => {
        const role = localStorage.getItem("role");
        if (role !== "frontdesk") {
            navigate("/", { replace: true });
            return;
        }

        loadData();
    }, [loadData, navigate]);

    const resetForm = () => {
        setEditingBillId(null);
        setForm({ patient: "", appointment: "", amount: "", status: "Paid", payment_method: "Cash", notes: "", card_name: "", card_number: "", card_expiry: "", card_cvv: "", upi_id: "" });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage("");
        setError("");

        try {
            if (editingBillId) {
                const res = await API.put(`billing/${editingBillId}/`, form);
                setMessage(res.data.message || "Bill updated.");
            } else {
                const res = await API.post("billing/", form);
                setMessage(res.data.message || "Bill generated.");
            }

            resetForm();
            setActiveMode("history");
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || (editingBillId ? "Could not update bill." : "Could not generate bill."));
        }
    };

    const handleEdit = (bill) => {
        setEditingBillId(bill.id);
        setForm({ patient: String(bill.patient), appointment: String(bill.appointment || ""), amount: String(bill.amount), status: bill.status, payment_method: bill.payment_method || "Cash", notes: bill.notes || "", card_name: bill.card_name || "", card_number: bill.card_number || "", card_expiry: bill.card_expiry || "", card_cvv: bill.card_cvv || "", upi_id: bill.upi_id || "" });
        setActiveMode("create");
        setMessage("");
        setError("");
    };

    const handleDelete = async (billId) => {
        if (!window.confirm("Delete this bill?")) return;

        setMessage("");
        setError("");

        try {
            const res = await API.delete(`billing/${billId}/`);
            setMessage(res.data.message || "Bill deleted.");
            if (editingBillId === billId) resetForm();
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || "Could not delete bill.");
        }
    };

    const openInvoice = (billId) => {
        const userId = localStorage.getItem("userId");
        window.open(buildApiUrl(`billing/${billId}/invoice/?user_id=${userId}`), "_blank", "noopener,noreferrer");
    };

    const patientOptions = useMemo(
        () =>
            patients.map((patient) => ({
                value: String(patient.id),
                label: `${patient.user_name} (${patient.user_mobile || patient.user_email || "No contact"})`,
                userId: String(patient.user),
            })),
        [patients]
    );
    const billReadyAppointments = useMemo(
        () => appointments.filter((appointment) => !appointment.is_no_show),
        [appointments]
    );
    const billedAppointmentIds = useMemo(() => new Set(allBills.map((bill) => String(bill.appointment)).filter(Boolean)), [allBills]);
    const billedPatientIds = useMemo(() => new Set(allBills.map((bill) => String(bill.patient)).filter(Boolean)), [allBills]);
    const billableAppointments = useMemo(
        () =>
            billReadyAppointments
                .filter((appointment) => !billedAppointmentIds.has(String(appointment.id)) && !billedPatientIds.has(String(appointment.patient)))
                .map((appointment) => ({
                    value: String(appointment.id),
                    patientId: String(appointment.patient),
                    label: `${appointment.patient_name} | ${appointment.date} ${appointment.time_slot || ""}`.trim(),
                })),
        [billReadyAppointments, billedAppointmentIds, billedPatientIds]
    );
    return (
        <div className="dashboard-light min-h-screen bg-[#f6fbff]">
            <Sidebar />

            <main className="p-5 md:ml-64 md:p-8">
                <div className="mx-auto max-w-7xl">
                    <LiveDateTimeCard stageLabel="Stage 4 - Billing Desk" />

                    <section className="mt-6 rounded-[24px] border border-slate-800 bg-[#0f172a] p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                        <div className="grid gap-3 md:grid-cols-2">
                            <button type="button" onClick={() => setActiveMode("create")} className={`rounded-2xl border px-4 py-4 text-left transition ${activeMode === "create" ? "border-cyan-400/40 bg-cyan-400/10 text-white" : "border-slate-800 bg-[#111827] text-slate-300 hover:border-slate-700 hover:bg-[#162033]"}`}>
                                <p className="text-base font-semibold">Create Bill</p>
                                <p className="mt-1 text-sm text-slate-400">Generate or edit one billing entry.</p>
                            </button>
                            <button type="button" onClick={() => setActiveMode("history")} className={`rounded-2xl border px-4 py-4 text-left transition ${activeMode === "history" ? "border-cyan-400/40 bg-cyan-400/10 text-white" : "border-slate-800 bg-[#111827] text-slate-300 hover:border-slate-700 hover:bg-[#162033]"}`}>
                                <p className="text-base font-semibold">Invoice History</p>
                                <p className="mt-1 text-sm text-slate-400">Filter, print, and manage existing invoices.</p>
                            </button>
                        </div>
                    </section>

                    <div className="mt-6 space-y-6">
                        {activeMode === "create" && (
                                <form onSubmit={handleSubmit} className="rounded-[24px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Billing Form</p>
                                            <h2 className="mt-2 text-2xl font-bold text-white">{editingBillId ? "Edit bill" : "Generate bill"}</h2>
                                        </div>
                                        {editingBillId && <button type="button" onClick={resetForm} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">Cancel edit</button>}
                                    </div>

                                    <div className="mt-6 grid gap-4">
                                        <select
                                            className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]"
                                            value={form.appointment}
                                            onChange={(e) => {
                                                const selectedAppointment = billableAppointments.find((appointment) => appointment.value === e.target.value);
                                                setForm((current) => ({
                                                    ...current,
                                                    appointment: e.target.value,
                                                    patient: selectedAppointment?.patientId || current.patient,
                                                }));
                                            }}
                                            required
                                            disabled={editingBillId}
                                        >
                                            <option value="">{editingBillId ? "Appointment locked for edit" : billableAppointments.length ? "Select appointment" : "No patient available for billing"}</option>
                                            {billableAppointments.map((appointment) => <option key={appointment.value} value={appointment.value}>{appointment.label}</option>)}
                                        </select>
                                        <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" value={form.patient} onChange={(e) => setForm((current) => ({ ...current, patient: e.target.value }))} required disabled>
                                            <option value="">Patient auto-selected</option>
                                            {patientOptions.map((patient) => <option key={patient.value} value={patient.value}>{patient.label}</option>)}
                                        </select>
                                        <input className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]" placeholder="Amount" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))} required />
                                        <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" value={form.payment_method} onChange={(e) => setForm((current) => ({ ...current, payment_method: e.target.value }))}>
                                            <option value="Cash">Cash</option>
                                            <option value="Card">Card</option>
                                            <option value="UPI">UPI</option>
                                        </select>
                                        <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}>
                                            <option value="Paid">Paid</option>
                                            <option value="Pending">Pending</option>
                                        </select>
                                        <textarea className="min-h-28 w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]" placeholder="Billing notes" value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} />
                                    </div>

                                    {form.payment_method === "Card" && (
                                        <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Card Details</p>
                                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                                <input className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]" placeholder="Cardholder name" autoComplete="off" value={form.card_name || ""} onChange={(e) => setForm((current) => ({ ...current, card_name: e.target.value }))} />
                                                <input className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]" placeholder="Card number" autoComplete="off" maxLength="16" value={form.card_number || ""} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 16); setForm((current) => ({ ...current, card_number: v })); }} />
                                                <input className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]" placeholder="Expiry (MM/YY)" autoComplete="off" maxLength="5" value={form.card_expiry || ""} onChange={(e) => { let v = e.target.value.replace(/[^0-9]/g, "").slice(0, 4); if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2); setForm((current) => ({ ...current, card_expiry: v })); }} />
                                                <input className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]" placeholder="CVV" type="password" autoComplete="off" maxLength="3" value={form.card_cvv || ""} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 3); setForm((current) => ({ ...current, card_cvv: v })); }} />
                                            </div>
                                        </div>
                                    )}

                                    {form.payment_method === "UPI" && (
                                        <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">UPI Details</p>
                                            <input className="mt-4 w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500 focus:bg-[#0d2235]" placeholder="UPI ID (e.g. name@upi)" autoComplete="off" value={form.upi_id || ""} onChange={(e) => setForm((current) => ({ ...current, upi_id: e.target.value }))} />
                                        </div>
                                    )}

                                    {message && <p className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}
                                    {error && <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

                                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                                        <p className="text-sm text-slate-400">{editingBillId ? "Edit existing bill details only." : "Billing message goes to patient mobile."}</p>
                                        <button type="submit" disabled={!editingBillId && !billableAppointments.length} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200">{editingBillId ? "Update Bill" : "Generate Bill"}</button>
                                    </div>
                                </form>
                            )}

                            {activeMode === "history" && (
                                <div className="rounded-[24px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Invoice History</p>
                                            <h2 className="mt-2 text-2xl font-bold text-white">Filter and review invoices</h2>
                                        </div>
                                        <button type="button" onClick={() => setFilters({ patient_user_id: "", status: "", payment_method: "" })} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">
                                            Reset
                                        </button>
                                    </div>

                                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                                        <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" value={filters.patient_user_id} onChange={(e) => setFilters((current) => ({ ...current, patient_user_id: e.target.value }))}>
                                            <option value="">All patients</option>
                                            {patientOptions.map((patient) => <option key={patient.value} value={patient.userId}>{patient.label}</option>)}
                                        </select>
                                        <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" value={filters.payment_method} onChange={(e) => setFilters((current) => ({ ...current, payment_method: e.target.value }))}>
                                            <option value="">All payment</option>
                                            <option value="Cash">Cash</option>
                                            <option value="Card">Card</option>
                                            <option value="UPI">UPI</option>
                                        </select>
                                        <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:bg-[#0d2235]" value={filters.status} onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))}>
                                            <option value="">All status</option>
                                            <option value="Paid">Paid</option>
                                            <option value="Pending">Pending</option>
                                        </select>
                                    </div>

                                    <div className="mt-6 space-y-3">
                                        {bills.map((bill) => (
                                            <div key={bill.id} className="rounded-2xl border border-slate-800 bg-[#0f172a] p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-base font-semibold text-white">{bill.patient_name}</p>
                                                        <p className="mt-1 text-sm text-slate-400">Invoice: {bill.invoice_number || "-"}</p>
                                                        <p className="mt-1 text-sm text-slate-400">Visit: {bill.appointment_date || "-"} {bill.appointment_time_slot || ""}</p>
                                                        <p className="mt-1 text-sm text-slate-400">Amount: Rs. {bill.amount}</p>
                                                        <p className="mt-1 text-sm text-slate-500">Payment: {bill.payment_method || "-"}</p>
                                                        <p className="mt-1 text-sm text-slate-500">{bill.notes || "No notes"}</p>
                                                    </div>
                                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${getStatusTone(bill.status)}`}>{bill.status}</span>
                                                </div>

                                                <div className="mt-4 flex flex-wrap gap-3">
                                                    <button type="button" onClick={() => openInvoice(bill.id)} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">Open Invoice</button>
                                                    <button type="button" onClick={() => handleEdit(bill)} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">Edit</button>
                                                    <button type="button" onClick={() => handleDelete(bill.id)} className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:border-rose-500/60">Delete</button>
                                                </div>
                                            </div>
                                        ))}
                                        {!bills.length && <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0f172a] px-4 py-7 text-sm text-slate-400">No bills found.</div>}
                                    </div>
                                </div>
                            )}
                        </div>
                </div>
            </main>
        </div>
    );
}

export default Billing;

