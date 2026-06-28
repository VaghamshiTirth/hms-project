import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import LiveDateTimeCard from "../components/LiveDateTimeCard";
import Sidebar from "../components/Sidebar";
import API from "../services/api";

function getStatusTone(status) {
    if (status === "Completed") return "border border-emerald-400/15 bg-emerald-400/10 text-emerald-200";
    if (status === "Confirmed") return "border border-teal-300/15 bg-teal-300/10 text-teal-100";
    return "border border-amber-300/15 bg-amber-300/10 text-amber-200";
}

function DoctorAppointments() {
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [assignedPatients, setAssignedPatients] = useState([]);
    const [prescriptionForm, setPrescriptionForm] = useState({
        patient: "",
        appointment: "",
        diagnosis: "",
        medicines: "",
        notes: "",
    });
    const [patients, setPatients] = useState([]);
    const [selectedPatientId, setSelectedPatientId] = useState("");
    const [patientSearch, setPatientSearch] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const loadAppointments = useCallback(async () => {
        try {
            const res = await API.get("doctor-dashboard/");
            const data = res.data;
            const activeAppointments = data.appointments.filter(
                (app) => app.status !== "Completed" && app.queue_status !== "completed"
            );
            setAppointments(data.appointments || []);
            setPrescriptions(data.prescriptions || []);
            setPatients(data.patients || []);
            setAssignedPatients(
                data.patients.filter((patient) =>
                    activeAppointments.some((app) => app.patient === patient.id)
                )
            );
        } catch (err) {
            setError(err.response?.data?.error || "Could not load appointments.");
        }
    }, []);

    useEffect(() => {
        const role = localStorage.getItem("role");
        if (role !== "doctor") {
            navigate("/", { replace: true });
            return;
        }
        loadAppointments();
    }, [navigate, loadAppointments]);

    const handleVisitUpdate = async (appointment, updates) => {
        setMessage("");
        setError("");
        try {
            const res = await API.put(`appointments/${appointment.id}/`, {
                status: updates.status || appointment.status,
                queue_status: updates.queue_status || appointment.queue_status,
            });
            setMessage(res.data.message || "Appointment updated.");
            loadAppointments();
        } catch (err) {
            setError(err.response?.data?.error || "Could not update visit.");
        }
    };

    const handleCreatePrescription = async () => {
        setMessage("");
        setError("");
        try {
            const res = await API.post("prescriptions/", prescriptionForm);
            setMessage(res.data.message || "Prescription saved.");
            setPrescriptionForm({
                patient: "",
                appointment: "",
                diagnosis: "",
                medicines: "",
                notes: "",
            });
            loadAppointments();
        } catch (err) {
            setError(err.response?.data?.error || "Could not save prescription.");
        }
    };

    const appointmentOptions = appointments
        .filter((app) => app.status !== "Completed" && app.queue_status !== "completed")
        .map((app) => ({
            value: String(app.id),
            label: `${app.patient_name} | ${app.date} ${app.time_slot || ""}`.trim(),
            patientId: String(app.patient),
        }));

    const selectedPatient = patients.find((p) => String(p.id) === selectedPatientId);
    const patientHistoryPrescriptions = selectedPatientId
        ? prescriptions.filter((p) => String(p.patient) === selectedPatientId)
        : [];
    const patientHistoryAppointments = selectedPatientId
        ? appointments.filter((a) => String(a.patient) === selectedPatientId)
        : [];
    const filteredPatients = patients.filter((p) =>
        p.user_name.toLowerCase().includes(patientSearch.toLowerCase())
    );

    return (
        <div className="dashboard-light min-h-screen bg-[#f6fbff]">
            <Sidebar />

            <main className="min-h-screen p-5 md:ml-64 md:p-8">
                <div className="mx-auto max-w-[1400px]">
                    <LiveDateTimeCard stageLabel="Doctor Appointments" />

                    {error && <p className="mt-6 rounded-2xl bg-rose-500/15 px-4 py-3 text-sm text-rose-200">{error}</p>}
                    {message && <p className="mt-6 rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}

                    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
                        {/* Appointments List */}
                        <div className="rounded-[28px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Appointments</p>
                            <div className="mt-5 space-y-3 max-h-[500px] overflow-y-auto">
                                {appointments.map((appointment) => (
                                    <div key={appointment.id} className="rounded-2xl border border-slate-800 bg-[#0f172a] p-4 text-sm">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{appointment.patient_name}</p>
                                                <p className="mt-0.5 text-slate-400">{appointment.date} | {appointment.time_slot || "No slot"}</p>
                                                <p className="mt-1 uppercase tracking-[0.18em] text-slate-500 text-xs">
                                                    {appointment.visit_stage || appointment.queue_status?.replaceAll("_", " ") || "waiting"}
                                                    {appointment.queue_position ? ` | #${appointment.queue_position}` : ""}
                                                </p>
                                                {appointment.reason && <p className="mt-1 text-slate-500">{appointment.reason}</p>}
                                            </div>
                                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${getStatusTone(appointment.status)}`}>
                                                {appointment.status}
                                            </span>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <button type="button" onClick={() => handleVisitUpdate(appointment, { queue_status: "in_consultation", status: appointment.status === "Pending" ? "Confirmed" : appointment.status })}
                                                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500">
                                                Start Visit
                                            </button>
                                            <button type="button" onClick={() => handleVisitUpdate(appointment, { queue_status: "completed", status: "Completed" })}
                                                className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:border-emerald-400/40">
                                                Complete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {!appointments.length && (
                                    <p className="rounded-2xl border border-dashed border-slate-700 bg-[#0f172a] px-4 py-8 text-center text-sm text-slate-400">
                                        No appointments yet.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Prescription Form */}
                        <div className="rounded-[28px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Write Prescription</p>

                            <div className="mt-5 space-y-3">
                                <select
                                    className="w-full rounded-xl border border-slate-700 bg-[#0f172a] px-4 py-3 text-white outline-none transition focus:border-slate-500"
                                    value={prescriptionForm.patient}
                                    onChange={(e) => setPrescriptionForm((current) => ({ ...current, patient: e.target.value }))}
                                    required
                                >
                                    <option value="">{assignedPatients.length ? "Select patient" : "No active patient"}</option>
                                    {assignedPatients.map((patient) => (
                                        <option key={patient.id} value={patient.id}>{patient.user_name}</option>
                                    ))}
                                </select>

                                <select
                                    className="w-full rounded-xl border border-slate-700 bg-[#0f172a] px-4 py-3 text-white outline-none transition focus:border-slate-500"
                                    value={prescriptionForm.appointment}
                                    onChange={(e) => {
                                        const selected = appointmentOptions.find((item) => item.value === e.target.value);
                                        setPrescriptionForm((current) => ({
                                            ...current,
                                            appointment: e.target.value,
                                            patient: selected?.patientId || current.patient,
                                        }));
                                    }}
                                >
                                    <option value="">{appointmentOptions.length ? "Select appointment" : "No active appointment"}</option>
                                    {appointmentOptions.map((item) => (
                                        <option key={item.value} value={item.value}>{item.label}</option>
                                    ))}
                                </select>

                                <input
                                    className="w-full rounded-xl border border-slate-700 bg-[#0f172a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500"
                                    placeholder="Diagnosis"
                                    value={prescriptionForm.diagnosis}
                                    onChange={(e) => setPrescriptionForm((current) => ({ ...current, diagnosis: e.target.value }))}
                                    required
                                />

                                <textarea
                                    className="min-h-24 w-full rounded-xl border border-slate-700 bg-[#0f172a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500"
                                    placeholder="Medicines"
                                    value={prescriptionForm.medicines}
                                    onChange={(e) => setPrescriptionForm((current) => ({ ...current, medicines: e.target.value }))}
                                    required
                                />

                                <button type="button" onClick={handleCreatePrescription} disabled={!appointmentOptions.length}
                                    className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:opacity-50">
                                    Save
                                </button>
                            </div>
                        </div>

                        {/* Recently Issued */}
                        <div className="rounded-[28px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                                Recently Issued ({prescriptions.length})
                            </p>
                            <div className="mt-4 max-h-[400px] space-y-3 overflow-y-auto">
                                {prescriptions.map((item) => (
                                    <div key={item.id} className="rounded-2xl border border-slate-800 bg-[#0f172a] p-3 text-sm">
                                        <p className="font-semibold text-white">{item.patient_name}</p>
                                        <p className="mt-0.5 text-slate-400">{item.diagnosis}</p>
                                        <p className="text-slate-500">{item.medicines}</p>
                                    </div>
                                ))}
                                {!prescriptions.length && (
                                    <p className="text-center text-sm text-slate-400">No prescriptions yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Patient History */}
                        <div className="rounded-[28px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)] xl:col-span-2">
                            <div className="flex items-center justify-between gap-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Patient History</p>
                                <div className="relative">
                                    <input
                                        className="w-64 rounded-xl border border-slate-700 bg-[#0f172a] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500"
                                        placeholder="Search patient..."
                                        value={patientSearch}
                                        onChange={(e) => { setPatientSearch(e.target.value); setSelectedPatientId(""); }}
                                    />
                                    {patientSearch && !selectedPatientId && (
                                        <div className="absolute right-0 top-full z-10 mt-1 w-64 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-700 bg-[#0f172a] p-2 shadow-xl">
                                            {filteredPatients.map((patient) => (
                                                <button
                                                    key={patient.id}
                                                    type="button"
                                                    onClick={() => { setSelectedPatientId(String(patient.id)); setPatientSearch(patient.user_name); }}
                                                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-white transition hover:bg-slate-700"
                                                >
                                                    {patient.user_name}
                                                </button>
                                            ))}
                                            {!filteredPatients.length && (
                                                <p className="px-3 py-2 text-sm text-slate-400">No patients found.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedPatient ? (
                                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                                    <div>
                                        <p className="mb-3 text-xs uppercase tracking-[0.22em] text-slate-500">Previous Prescriptions ({patientHistoryPrescriptions.length})</p>
                                        <div className="max-h-[300px] space-y-3 overflow-y-auto">
                                            {patientHistoryPrescriptions.map((item) => (
                                                <div key={item.id} className="rounded-2xl border border-slate-800 bg-[#0f172a] p-3 text-sm">
                                                    <p className="font-semibold text-white">
                                                        {item.diagnosis} — {item.medicines}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-slate-500">
                                                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}
                                                    </p>
                                                </div>
                                            ))}
                                            {!patientHistoryPrescriptions.length && (
                                                <p className="text-sm text-slate-400">No previous prescriptions.</p>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="mb-3 text-xs uppercase tracking-[0.22em] text-slate-500">Previous Appointments ({patientHistoryAppointments.length})</p>
                                        <div className="max-h-[300px] space-y-3 overflow-y-auto">
                                            {patientHistoryAppointments.map((item) => (
                                                <div key={item.id} className="rounded-2xl border border-slate-800 bg-[#0f172a] p-3 text-sm">
                                                    <p className="font-semibold text-white">{item.date} | {item.time_slot || "No slot"}</p>
                                                    <p className="mt-0.5 text-slate-400">{item.reason || "No reason"}</p>
                                                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${getStatusTone(item.status)}`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                            ))}
                                            {!patientHistoryAppointments.length && (
                                                <p className="text-sm text-slate-400">No previous appointments.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="mt-5 text-sm text-slate-400">Select a patient above to view their history.</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default DoctorAppointments;
