import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import API, { buildApiUrl, clearSession } from "../services/api";

function getStatusTone(status) {
    if (status === "Completed" || status === "Paid") return "border border-emerald-400/15 bg-emerald-400/10 text-emerald-200";
    if (status === "Confirmed") return "border border-cyan-400/15 bg-cyan-400/10 text-cyan-100";
    return "border border-amber-300/15 bg-amber-300/10 text-amber-200";
}

function toTitleCase(value) {
    return String(value || "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function AttendantDashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [selectedPatientId, setSelectedPatientId] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [familyForm, setFamilyForm] = useState({
        name: "",
        age: "",
        history: "",
        relation: "other",
    });
    const navigate = useNavigate();

    const handleLogout = () => {
        clearSession();
        navigate("/", { replace: true });
    };

    const loadDashboard = async () => {
        try {
            const response = await API.get("attendant-dashboard/");
            const patients = response.data.patients || [];
            setDashboard(response.data);
            setSelectedPatientId((current) => {
                if (!patients.length) {
                    return "";
                }
                if (current && patients.some((patient) => String(patient.id) === current)) {
                    return current;
                }
                return String(patients[0].id);
            });
        } catch (err) {
            setError(err.response?.data?.error || "Could not load attendant dashboard.");
        }
    };

    useEffect(() => {
        const role = localStorage.getItem("role");
        const userId = localStorage.getItem("userId");
        if (role !== "attendant" || !userId) {
            navigate("/", { replace: true });
            return;
        }

        loadDashboard();
    }, [navigate]);

    const handleCreateFamilyPatient = async (event) => {
        event.preventDefault();
        setMessage("");
        setError("");

        try {
            const response = await API.post("attendant-family-members/", familyForm);
            setMessage(response.data.message || "Family patient added.");
            setFamilyForm({
                name: "",
                age: "",
                history: "",
                relation: "other",
            });
            await loadDashboard();
        } catch (err) {
            setError(err.response?.data?.error || "Could not add family patient.");
        }
    };

    const openInvoice = (billId) => {
        const userId = localStorage.getItem("userId");
        window.open(buildApiUrl(`billing/${billId}/invoice/?user_id=${userId}`), "_blank", "noopener,noreferrer");
    };

    if (!dashboard) {
        return <div className="min-h-screen bg-[#0b1120] px-4 py-10 text-white">{error && <p className="mx-auto max-w-6xl rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}</div>;
    }

    const selectedPatient = dashboard.patients.find((patient) => String(patient.id) === selectedPatientId) || dashboard.patients[0];
    const patientAppointments = dashboard.appointments.filter((item) => item.patient === selectedPatient?.id);
    const patientBills = dashboard.billing.filter((item) => item.patient === selectedPatient?.id);
    const patientPrescriptions = dashboard.prescriptions.filter((item) => item.patient === selectedPatient?.id);
    const patientRecords = dashboard.medical_records.filter((item) => item.patient === selectedPatient?.id);
    const relationshipMap = new Map(dashboard.links.map((link) => [link.patient, link.relation]));
    const cards = [
        { label: "Linked Patients", value: dashboard.patients.length },
        { label: "Appointments", value: patientAppointments.length },
        { label: "Bills", value: patientBills.length },
        { label: "Records", value: patientRecords.length },
    ];

    return (
        <div className="min-h-screen bg-[#0b1120] px-4 py-10 text-white">
            <div className="mx-auto max-w-6xl">
                <section className="overflow-hidden rounded-[34px] border border-slate-800 bg-[#111827] shadow-[0_36px_80px_-45px_rgba(15,23,42,0.55)]">
                    <div className="grid gap-8 px-7 py-7 lg:grid-cols-[1.12fr_0.88fr] lg:px-8">
                        <div>
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.34em] text-slate-300">Family Portal</p>
                                    <h1 className="mt-3 text-4xl font-black text-white">Attendant Dashboard</h1>
                                </div>
                                <button onClick={handleLogout} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Logout</button>
                            </div>
                            <div className="mt-7 rounded-[30px] border border-slate-700 bg-[#0f172a] p-6">
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Attendant</p>
                                <h2 className="mt-4 text-3xl font-black">{dashboard.attendant.name}</h2>
                                <p className="mt-2 text-sm text-slate-400">{dashboard.attendant.mobile_number || dashboard.attendant.email}</p>
                                <p className="mt-4 text-sm text-slate-300">Manage linked family members from one account and add dependents without a new mobile number.</p>
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                            <div className="rounded-3xl border border-slate-800 bg-[#0f172a] p-5">
                                <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Selected Family Member</p>
                                <p className="mt-3 text-lg font-bold text-white">{selectedPatient?.user_name || "No linked patient"}</p>
                                <p className="mt-2 text-sm text-slate-400">{selectedPatient ? toTitleCase(relationshipMap.get(selectedPatient.id) || "family access") : "Ask front desk to link a patient."}</p>
                            </div>
                            <div className="rounded-3xl border border-slate-800 bg-[#0f172a] p-5">
                                <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Portal</p>
                                <p className="mt-3 text-sm leading-6 text-slate-300">See visits, bills, prescriptions, and records for linked patients.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {error && <p className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
                {message && <p className="mt-6 rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}

                <section className="mt-6 rounded-[30px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Family Members</p>
                            <h3 className="mt-2 text-2xl font-bold text-white">Linked patients</h3>
                        </div>
                        <select className="rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition focus:border-slate-500" value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)}>
                            {dashboard.patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.user_name}</option>)}
                        </select>
                    </div>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {cards.map((card) => (
                            <div key={card.label} className="rounded-[24px] border border-slate-800 bg-[#0f172a] p-5">
                                <p className="text-sm font-medium text-slate-400">{card.label}</p>
                                <p className="mt-3 text-3xl font-black text-white">{card.value}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mt-6 rounded-[30px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Add Family Member</p>
                            <h3 className="mt-2 text-2xl font-bold text-white">Create patient without new mobile</h3>
                        </div>
                        <span className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
                            Family account
                        </span>
                    </div>
                    <form onSubmit={handleCreateFamilyPatient} className="mt-6 grid gap-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <input className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500" placeholder="Patient name" value={familyForm.name} onChange={(e) => setFamilyForm((current) => ({ ...current, name: e.target.value }))} required />
                            <input className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500" type="number" min="0" placeholder="Age" value={familyForm.age} onChange={(e) => setFamilyForm((current) => ({ ...current, age: e.target.value }))} required />
                        </div>
                        <select className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition focus:border-slate-500" value={familyForm.relation} onChange={(e) => setFamilyForm((current) => ({ ...current, relation: e.target.value }))}>
                            <option value="other">Other</option>
                            <option value="father">Father</option>
                            <option value="mother">Mother</option>
                            <option value="son">Son</option>
                            <option value="daughter">Daughter</option>
                            <option value="brother">Brother</option>
                            <option value="sister">Sister</option>
                        </select>
                        <textarea className="min-h-24 w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500" placeholder="Medical history" value={familyForm.history} onChange={(e) => setFamilyForm((current) => ({ ...current, history: e.target.value }))} />
                        <div className="flex items-center justify-between gap-4">
                            <p className="text-sm text-slate-400">No separate mobile number needed. This patient will stay under {dashboard.attendant.mobile_number || "the family"} account login.</p>
                            <button type="submit" className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white">Add Family Patient</button>
                        </div>
                    </form>
                </section>

                {!!selectedPatient && (
                    <>
                        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
                            <div className="rounded-[30px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Profile</p>
                                <h3 className="mt-2 text-2xl font-bold text-white">{selectedPatient.user_name}</h3>
                                <p className="mt-2 text-sm text-slate-400">{selectedPatient.user_mobile || `Uses family login: ${dashboard.attendant.mobile_number || dashboard.attendant.email}`}</p>
                                <p className="mt-4 text-sm leading-6 text-slate-300">{selectedPatient.history || "No history added yet."}</p>
                            </div>
                            <div className="rounded-[30px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Relationship</p>
                                <h3 className="mt-2 text-2xl font-bold text-white">{toTitleCase(relationshipMap.get(selectedPatient.id) || "family member")}</h3>
                                <p className="mt-4 text-sm leading-6 text-slate-300">Linked by front desk to support booking, billing, and care follow-up.</p>
                            </div>
                        </section>

                        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
                            <div className="rounded-[30px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Appointments</p>
                                        <h3 className="mt-2 text-2xl font-bold text-white">Visit history</h3>
                                    </div>
                                    <span className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">{patientAppointments.length} visits</span>
                                </div>
                                <div className="mt-6 space-y-3">
                                    {patientAppointments.map((appointment) => (
                                        <div key={appointment.id} className="rounded-3xl border border-slate-800 bg-[#0f172a] p-4">
                                            <p className="text-base font-semibold text-white">{appointment.doctor_name}</p>
                                            <p className="mt-1 text-sm text-slate-400">{appointment.date} | {appointment.time_slot || "No slot"}</p>
                                            <p className="mt-2 text-sm text-slate-500">{appointment.visit_stage}</p>
                                            <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${getStatusTone(appointment.status)}`}>{appointment.status}</span>
                                        </div>
                                    ))}
                                    {!patientAppointments.length && <div className="rounded-3xl border border-dashed border-slate-700 bg-[#0f172a] px-4 py-8 text-sm text-slate-400">No appointments yet.</div>}
                                </div>
                            </div>

                            <div className="rounded-[30px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Billing</p>
                                        <h3 className="mt-2 text-2xl font-bold text-white">Invoices</h3>
                                    </div>
                                    <span className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">{patientBills.length} bills</span>
                                </div>
                                <div className="mt-6 space-y-3">
                                    {patientBills.map((bill) => (
                                        <div key={bill.id} className="rounded-3xl border border-slate-800 bg-[#0f172a] p-4">
                                            <p className="text-base font-semibold text-white">Rs. {bill.amount}</p>
                                            <p className="mt-1 text-sm text-slate-400">{bill.invoice_number || "No invoice number"}</p>
                                            <p className="mt-1 text-sm text-slate-500">{bill.notes || "No notes"}</p>
                                            <button type="button" onClick={() => openInvoice(bill.id)} className="mt-4 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">Open Invoice</button>
                                        </div>
                                    ))}
                                    {!patientBills.length && <div className="rounded-3xl border border-dashed border-slate-700 bg-[#0f172a] px-4 py-8 text-sm text-slate-400">No bills yet.</div>}
                                </div>
                            </div>
                        </section>

                        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
                            <div className="rounded-[30px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Prescriptions</p>
                                <h3 className="mt-2 text-2xl font-bold text-white">Doctor notes</h3>
                                <div className="mt-6 space-y-3">
                                    {patientPrescriptions.map((item) => (
                                        <div key={item.id} className="rounded-3xl border border-slate-800 bg-[#0f172a] p-4">
                                            <p className="text-base font-semibold text-white">{item.doctor_name}</p>
                                            <p className="mt-1 text-sm text-slate-400">{item.diagnosis}</p>
                                            <p className="mt-2 text-sm text-slate-500">{item.medicines}</p>
                                        </div>
                                    ))}
                                    {!patientPrescriptions.length && <div className="rounded-3xl border border-dashed border-slate-700 bg-[#0f172a] px-4 py-8 text-sm text-slate-400">No prescriptions yet.</div>}
                                </div>
                            </div>

                            <div className="rounded-[30px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Records</p>
                                <h3 className="mt-2 text-2xl font-bold text-white">Medical files</h3>
                                <div className="mt-6 space-y-3">
                                    {patientRecords.map((item) => (
                                        <div key={item.id} className="rounded-3xl border border-slate-800 bg-[#0f172a] p-4">
                                            <p className="text-base font-semibold text-white">{item.title}</p>
                                            {item.record_file ? <a href={item.record_file} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-slate-300 underline">Open file</a> : <p className="mt-2 text-sm text-slate-500">No file attached</p>}
                                        </div>
                                    ))}
                                    {!patientRecords.length && <div className="rounded-3xl border border-dashed border-slate-700 bg-[#0f172a] px-4 py-8 text-sm text-slate-400">No records yet.</div>}
                                </div>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}

export default AttendantDashboard;
