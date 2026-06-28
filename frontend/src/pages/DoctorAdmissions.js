import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import LiveDateTimeCard from "../components/LiveDateTimeCard";
import Sidebar from "../components/Sidebar";
import API from "../services/api";

function getCurrentDateTimeLocal() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function formatDateTimeLabel(value) {
    if (!value) return "Not set";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString(undefined, {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function DoctorAdmissions() {
    const navigate = useNavigate();
    const [dashboard, setDashboard] = useState(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [editingAdmissionId, setEditingAdmissionId] = useState(null);
    const [expandedAdmissions, setExpandedAdmissions] = useState({});
    const [admissionForm, setAdmissionForm] = useState({
        patient: "",
        appointment: "",
        room_number: "",
        room_type: "non_ac",
        admission_reason: "",
        care_notes: "",
        medicine_notes: "",
        status: "admitted",
        admitted_at: getCurrentDateTimeLocal(),
        discharged_at: "",
    });

    const loadDashboard = useCallback(async () => {
        try {
            const res = await API.get("doctor-dashboard/");
            setDashboard(res.data);
        } catch (err) {
            setError(err.response?.data?.error || "Could not load data.");
        }
    }, []);

    useEffect(() => {
        const role = localStorage.getItem("role");
        if (role !== "doctor") {
            navigate("/", { replace: true });
            return;
        }
        loadDashboard();
    }, [navigate, loadDashboard]);

    const resetAdmissionForm = () => {
        setEditingAdmissionId(null);
        setAdmissionForm({
            patient: "",
            appointment: "",
            room_number: "",
            room_type: "non_ac",
            admission_reason: "",
            care_notes: "",
            medicine_notes: "",
            status: "admitted",
            admitted_at: getCurrentDateTimeLocal(),
            discharged_at: "",
        });
    };

    const handleAdmissionSubmit = async (event) => {
        event.preventDefault();
        setMessage("");
        setError("");
        try {
            const response = editingAdmissionId
                ? await API.put(`admissions/${editingAdmissionId}/`, admissionForm)
                : await API.post("admissions/", admissionForm);
            setMessage(response.data.message || (editingAdmissionId ? "Admission updated." : "Patient admitted successfully."));
            resetAdmissionForm();
            loadDashboard();
        } catch (err) {
            setError(err.response?.data?.error || "Could not save admission.");
        }
    };

    const startAdmissionEdit = (admission) => {
        setEditingAdmissionId(admission.id);
        setAdmissionForm({
            patient: String(admission.patient),
            appointment: admission.appointment ? String(admission.appointment) : "",
            room_number: admission.room_number || "",
            room_type: admission.room_type || "non_ac",
            admission_reason: admission.admission_reason || "",
            care_notes: admission.care_notes || "",
            medicine_notes: admission.medicine_notes || "",
            status: admission.status || "admitted",
            admitted_at: admission.admitted_at ? String(admission.admitted_at).slice(0, 16) : getCurrentDateTimeLocal(),
            discharged_at: admission.discharged_at ? String(admission.discharged_at).slice(0, 16) : "",
        });
    };

    const toggleAdmissionDetails = (admissionId) => {
        setExpandedAdmissions((current) => ({
            ...current,
            [admissionId]: !current[admissionId],
        }));
    };

    if (!dashboard) {
        return (
            <div className="dashboard-light min-h-screen bg-[#f6fbff]">
                <Sidebar />
                <main className="min-h-screen p-5 md:ml-64 md:p-8">
                    <LiveDateTimeCard stageLabel="Doctor Admissions" />
                    {error && <p className="mt-6 rounded-2xl bg-rose-500/15 px-4 py-3 text-sm text-rose-200">{error}</p>}
                </main>
            </div>
        );
    }

    const admissions = dashboard.admissions || [];
    const activeAdmissions = admissions.filter((admission) => admission.status === "admitted");
    const appointments = dashboard.appointments || [];
    const activeAppointments = appointments.filter(
        (app) => app.status !== "Completed" && app.queue_status !== "completed"
    );
    const patients = dashboard.patients || [];
    const assignedPatients = patients.filter((patient) =>
        activeAppointments.some((app) => app.patient === patient.id)
    );
    const appointmentOptions = activeAppointments.map((app) => ({
        value: String(app.id),
        label: `${app.patient_name} | ${app.date} ${app.time_slot || ""}`.trim(),
        patientId: String(app.patient),
    }));

    return (
        <div className="dashboard-light min-h-screen bg-[#f6fbff]">
            <Sidebar />
            <main className="min-h-screen p-5 md:ml-64 md:p-8">
                <div className="mx-auto max-w-[1400px]">
                    <LiveDateTimeCard stageLabel="Doctor Admissions" />

                    {error && <p className="mt-6 rounded-2xl bg-rose-500/15 px-4 py-3 text-sm text-rose-200">{error}</p>}
                    {message && <p className="mt-6 rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}

                    <section className="mt-6 space-y-6">
                        <div className="overflow-hidden rounded-[28px] border border-slate-800 bg-[#111827] shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                            <div className="border-b border-slate-800 bg-gradient-to-br from-cyan-400/20 via-cyan-300/8 to-transparent px-6 py-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                                            {editingAdmissionId ? "Edit Admission" : "New Admission"}
                                        </p>
                                        <p className="mt-2 text-sm text-slate-400">
                                            {editingAdmissionId ? "Update admitted patient" : "Admit a new patient"}
                                        </p>
                                    </div>
                                    {editingAdmissionId && (
                                        <button type="button" onClick={resetAdmissionForm}
                                            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">
                                            Cancel edit
                                        </button>
                                    )}
                                </div>
                            </div>

                            <form onSubmit={handleAdmissionSubmit} className="p-6">
                                <div className="space-y-3">
                                    <select
                                        className="w-full rounded-xl border border-slate-700 bg-[#0f172a] px-4 py-3 text-white outline-none transition focus:border-slate-500"
                                        value={admissionForm.patient}
                                        onChange={(e) => setAdmissionForm((current) => ({ ...current, patient: e.target.value }))}
                                        required
                                    >
                                        <option value="">{assignedPatients.length ? "Select patient" : "No active patient"}</option>
                                        {assignedPatients.map((patient) => (
                                            <option key={patient.id} value={patient.id}>{patient.user_name}</option>
                                        ))}
                                    </select>

                                    <select
                                        className="w-full rounded-xl border border-slate-700 bg-[#0f172a] px-4 py-3 text-white outline-none transition focus:border-slate-500"
                                        value={admissionForm.appointment}
                                        onChange={(e) => {
                                            const selected = appointmentOptions.find((item) => item.value === e.target.value);
                                            setAdmissionForm((current) => ({
                                                ...current,
                                                appointment: e.target.value,
                                                patient: selected?.patientId || current.patient,
                                            }));
                                        }}
                                    >
                                        <option value="">{appointmentOptions.length ? "Select related appointment" : "No active appointment"}</option>
                                        {appointmentOptions.map((item) => (
                                            <option key={item.value} value={item.value}>{item.label}</option>
                                        ))}
                                    </select>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        <input
                                            className="w-full rounded-xl border border-slate-700 bg-[#0f172a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500"
                                            placeholder="Room number"
                                            value={admissionForm.room_number}
                                            onChange={(e) => setAdmissionForm((current) => ({ ...current, room_number: e.target.value }))}
                                        />
                                        <select
                                            className="w-full rounded-xl border border-slate-700 bg-[#0f172a] px-4 py-3 text-white outline-none transition focus:border-slate-500"
                                            value={admissionForm.room_type}
                                            onChange={(e) => setAdmissionForm((current) => ({ ...current, room_type: e.target.value }))}
                                        >
                                            <option value="non_ac">Non AC</option>
                                            <option value="ac">AC</option>
                                        </select>
                                    </div>

                                    <textarea
                                        className="min-h-20 w-full rounded-xl border border-slate-700 bg-[#0f172a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500"
                                        placeholder="Admission reason"
                                        value={admissionForm.admission_reason}
                                        onChange={(e) => setAdmissionForm((current) => ({ ...current, admission_reason: e.target.value }))}
                                    />
                                    <textarea
                                        className="min-h-20 w-full rounded-xl border border-slate-700 bg-[#0f172a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500"
                                        placeholder="Care notes"
                                        value={admissionForm.care_notes}
                                        onChange={(e) => setAdmissionForm((current) => ({ ...current, care_notes: e.target.value }))}
                                    />
                                    <textarea
                                        className="min-h-20 w-full rounded-xl border border-slate-700 bg-[#0f172a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500"
                                        placeholder="Injection / bottle / medicines during admission"
                                        value={admissionForm.medicine_notes}
                                        onChange={(e) => setAdmissionForm((current) => ({ ...current, medicine_notes: e.target.value }))}
                                    />

                                    <select
                                        className="w-full rounded-xl border border-slate-700 bg-[#0f172a] px-4 py-3 text-white outline-none transition focus:border-slate-500"
                                        value={admissionForm.status}
                                        onChange={(e) => setAdmissionForm((current) => ({ ...current, status: e.target.value }))}
                                    >
                                        <option value="admitted">Admitted</option>
                                        <option value="discharged">Discharged</option>
                                    </select>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div>
                                            <p className="mb-1 text-xs uppercase tracking-[0.22em] text-slate-500">Admit Date & Time</p>
                                            <input
                                                className="w-full rounded-xl border border-slate-700 bg-[#0f172a] px-4 py-3 text-white outline-none transition focus:border-slate-500"
                                                type="datetime-local"
                                                value={admissionForm.admitted_at}
                                                onChange={(e) => setAdmissionForm((current) => ({ ...current, admitted_at: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <p className="mb-1 text-xs uppercase tracking-[0.22em] text-slate-500">Discharge Date & Time</p>
                                            <input
                                                className="w-full rounded-xl border border-slate-700 bg-[#0f172a] px-4 py-3 text-white outline-none transition focus:border-slate-500"
                                                type="datetime-local"
                                                value={admissionForm.discharged_at}
                                                onChange={(e) => setAdmissionForm((current) => ({ ...current, discharged_at: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-end gap-4">
                                    <button type="submit" className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white">
                                        {editingAdmissionId ? "Update Admission" : "Admit Patient"}
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="overflow-hidden rounded-[28px] border border-slate-800 bg-[#111827] shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                            <div className="border-b border-slate-800 bg-gradient-to-br from-emerald-400/20 via-emerald-300/8 to-transparent px-6 py-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Admission List</p>
                                        <p className="mt-1 text-sm text-slate-400">Currently admitted patients</p>
                                    </div>
                                    <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">
                                        {activeAdmissions.length} total
                                    </span>
                                </div>
                            </div>
                            <div className="max-h-[500px] space-y-3 overflow-y-auto p-6">
                                {activeAdmissions.map((admission) => (
                                    <div key={admission.id} className="rounded-[24px] border border-slate-800 bg-[#0f172a] p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-base font-semibold text-white">{admission.patient_name}</p>
                                                <p className="mt-1 text-sm text-slate-400">
                                                    Room {admission.room_number || "Not assigned"} | {admission.room_type === "ac" ? "AC" : "Non AC"}
                                                </p>
                                                <p className="mt-2 text-sm text-slate-500">Admit: {formatDateTimeLabel(admission.admitted_at)}</p>
                                                <p className="mt-1 text-sm text-slate-500">Discharge: {formatDateTimeLabel(admission.discharged_at)}</p>
                                            </div>
                                            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${admission.status === "admitted" ? "border border-rose-400/20 bg-rose-400/10 text-rose-200" : "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200"}`}>
                                                {admission.status}
                                            </span>
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <button type="button" onClick={() => startAdmissionEdit(admission)}
                                                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">
                                                Edit
                                            </button>
                                            <button type="button" onClick={() => toggleAdmissionDetails(admission.id)}
                                                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">
                                                {expandedAdmissions[admission.id] ? "Hide Details" : "Show Details"}
                                            </button>
                                        </div>
                                        {expandedAdmissions[admission.id] && (
                                            <div className="mt-4 rounded-2xl border border-slate-800 bg-[#111827] p-4">
                                                <p className="text-sm text-slate-300">Reason: {admission.admission_reason || "No admission reason added."}</p>
                                                <p className="mt-2 text-sm text-slate-400">Care Notes: {admission.care_notes || "No care notes added."}</p>
                                                <p className="mt-2 text-sm text-slate-400">Medicine Notes: {admission.medicine_notes || "No medicine notes added."}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {!activeAdmissions.length && (
                                    <div className="rounded-[24px] border border-dashed border-slate-700 bg-[#0f172a] px-4 py-8 text-sm text-slate-400">
                                        No admitted patients yet.
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

export default DoctorAdmissions;
