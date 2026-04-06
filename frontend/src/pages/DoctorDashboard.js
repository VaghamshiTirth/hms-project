import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import LiveDateTimeCard from "../components/LiveDateTimeCard";
import API, { clearSession } from "../services/api";

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

function getStatusTone(status) {
    if (status === "Completed") {
        return "border border-emerald-400/15 bg-emerald-400/10 text-emerald-200";
    }

    if (status === "Confirmed") {
        return "border border-teal-300/15 bg-teal-300/10 text-teal-100";
    }

    return "border border-amber-300/15 bg-amber-300/10 text-amber-200";
}

function DoctorDashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [editingAdmissionId, setEditingAdmissionId] = useState(null);
    const [expandedAdmissions, setExpandedAdmissions] = useState({});
    const [prescriptionForm, setPrescriptionForm] = useState({
        patient: "",
        appointment: "",
        diagnosis: "",
        medicines: "",
        notes: "",
        follow_up_date: "",
    });
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
    const navigate = useNavigate();

    const handleLogout = () => {
        clearSession();
        navigate("/", { replace: true });
    };

    const loadDashboard = async () => {
        try {
            const dashboardRes = await API.get("doctor-dashboard/");
            setDashboard(dashboardRes.data);
        } catch (err) {
            setError(err.response?.data?.error || "Could not load doctor dashboard.");
        }
    };

    useEffect(() => {
        const role = localStorage.getItem("role");
        const userId = localStorage.getItem("userId");

        if (role !== "doctor" || !userId) {
            navigate("/", { replace: true });
            return;
        }

        loadDashboard();
    }, [navigate]);

    const handleCreatePrescription = async (event) => {
        event.preventDefault();
        setMessage("");
        setError("");

        try {
            const response = await API.post("prescriptions/", prescriptionForm);
            setMessage(response.data.message || "Prescription saved.");
            setPrescriptionForm({
                patient: "",
                appointment: "",
                diagnosis: "",
                medicines: "",
                notes: "",
                follow_up_date: "",
            });
            loadDashboard();
        } catch (err) {
            setError(err.response?.data?.error || "Could not save prescription.");
        }
    };

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

    const handleVisitUpdate = async (appointment, updates) => {
        setMessage("");
        setError("");

        try {
            const response = await API.put(`appointments/${appointment.id}/`, {
                status: updates.status || appointment.status,
                queue_status: updates.queue_status || appointment.queue_status,
            });
            setMessage(response.data.message || "Appointment updated.");
            loadDashboard();
        } catch (err) {
            setError(err.response?.data?.error || "Could not update visit.");
        }
    };

    if (!dashboard) {
        return (
            <div className="min-h-screen bg-[#0b1120] px-4 py-10 text-white">
                <div className="mx-auto max-w-6xl">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-cyan-300">Doctor Portal</p>
                            <h1 className="mt-3 text-4xl font-black text-white">Clinical Dashboard</h1>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                        >
                            Logout
                        </button>
                    </div>
                    {error && <p className="mt-6 rounded-2xl bg-rose-500/15 px-4 py-3 text-sm text-rose-200">{error}</p>}
                </div>
            </div>
        );
    }

    const appointments = dashboard.appointments;
    const prescriptions = dashboard.prescriptions || [];
    const admissions = dashboard.admissions || [];
    const activeAppointments = appointments.filter((appointment) => appointment.status !== "Completed" && appointment.queue_status !== "completed");
    const activeAdmissions = admissions.filter((admission) => admission.status === "admitted");
    const assignedPatients = dashboard.patients.filter((patient) => activeAppointments.some((appointment) => appointment.patient === patient.id));
    const completedAppointments = appointments.filter((appointment) => appointment.status === "Completed").length;
    const pendingAppointments = appointments.filter((appointment) => appointment.queue_status === "waiting" && appointment.status !== "Completed" && !appointment.is_no_show).length;
    const doctorEmail = dashboard.doctor.user_email || dashboard.doctor.user_mobile || "No contact available";
    const nextAppointment = activeAppointments[0] || appointments[0];

    const metricCards = [
        { label: "Pending Appointment", value: pendingAppointments },
        { label: "Today's Visits", value: completedAppointments },
        { label: "Admitted", value: activeAdmissions.length },
    ];

    const appointmentOptions = activeAppointments.map((appointment) => ({
        value: String(appointment.id),
        label: `${appointment.patient_name} | ${appointment.date} ${appointment.time_slot || ""}`.trim(),
        patientId: String(appointment.patient),
    }));

    return (
        <div className="min-h-screen bg-[#0b1120] px-4 py-10 text-white">
            <div className="mx-auto max-w-6xl">
                <LiveDateTimeCard stageLabel="Doctor Dashboard - Live Date and Time" />

                <section className="mt-8 overflow-hidden rounded-[34px] border border-slate-800 bg-[#111827] shadow-[0_40px_90px_-50px_rgba(15,23,42,0.55)]">
                    <div className="grid gap-8 px-7 py-7 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
                        <div className="relative">
                            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.34em] text-slate-300">Doctor Portal</p>
                                    <h1 className="mt-3 text-4xl font-black text-white">Clinical Dashboard</h1>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                                >
                                    Logout
                                </button>
                            </div>

                            <div className="relative mt-7 rounded-[28px] border border-slate-700 bg-[#0f172a] p-6 text-white">
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Doctor</p>
                                <h2 className="mt-4 text-3xl font-black">{dashboard.doctor.user_name}</h2>
                                <p className="mt-2 text-base text-slate-200">{dashboard.doctor.specialization}</p>
                                <p className="mt-1 text-sm text-slate-400">{doctorEmail}</p>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                                <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Next Visit</p>
                                <p className="mt-3 text-lg font-bold text-white">
                                    {nextAppointment ? `${nextAppointment.patient_name} on ${nextAppointment.date}` : "No visit assigned"}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {error && <p className="mt-6 rounded-2xl bg-rose-500/15 px-4 py-3 text-sm text-rose-200">{error}</p>}
                {message && <p className="mt-6 rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}

                <section className="mt-6 grid gap-4 md:grid-cols-3">
                    {metricCards.map((card) => (
                        <div key={card.label} className="rounded-[30px] border border-slate-800 bg-[#111827] px-6 py-5 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.8)]">
                            <div className="flex items-center justify-between gap-4">
                                <p className="text-sm font-medium text-slate-300">{card.label}</p>
                                <p className="text-3xl font-black text-white">{card.value}</p>
                            </div>
                        </div>
                    ))}
                </section>

                <section className="mt-6">
                    <form onSubmit={handleCreatePrescription} className="rounded-[30px] border border-slate-800 bg-[#111827] p-6 text-white shadow-[0_26px_60px_-40px_rgba(15,23,42,0.65)]">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Prescription</p>
                                <h3 className="mt-2 text-2xl font-bold">Write notes</h3>
                            </div>
                            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">
                                Doctor only
                            </span>
                        </div>

                        <div className="mt-6 grid gap-4">
                            <select
                                className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition focus:border-slate-500"
                                value={prescriptionForm.patient}
                                onChange={(e) => setPrescriptionForm((current) => ({ ...current, patient: e.target.value }))}
                                required
                            >
                                <option value="">{assignedPatients.length ? "Select patient" : "No active patient"}</option>
                                {assignedPatients.map((patient) => (
                                    <option key={patient.id} value={patient.id}>
                                        {patient.user_name}
                                    </option>
                                ))}
                            </select>

                            <select
                                className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition focus:border-slate-500"
                                value={prescriptionForm.appointment}
                                onChange={(e) => {
                                    const selectedOption = appointmentOptions.find((item) => item.value === e.target.value);
                                    setPrescriptionForm((current) => ({
                                        ...current,
                                        appointment: e.target.value,
                                        patient: selectedOption?.patientId || current.patient,
                                    }));
                                }}
                            >
                                <option value="">{appointmentOptions.length ? "Select appointment" : "No active appointment"}</option>
                                {appointmentOptions.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>

                            <input
                                className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500"
                                placeholder="Diagnosis"
                                value={prescriptionForm.diagnosis}
                                onChange={(e) => setPrescriptionForm((current) => ({ ...current, diagnosis: e.target.value }))}
                                required
                            />

                            <textarea
                                className="min-h-24 w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500"
                                placeholder="Medicines"
                                value={prescriptionForm.medicines}
                                onChange={(e) => setPrescriptionForm((current) => ({ ...current, medicines: e.target.value }))}
                                required
                            />

                            <textarea
                                className="min-h-24 w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500"
                                placeholder="Doctor notes"
                                value={prescriptionForm.notes}
                                onChange={(e) => setPrescriptionForm((current) => ({ ...current, notes: e.target.value }))}
                            />

                            <input
                                className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition focus:border-slate-500"
                                type="date"
                                value={prescriptionForm.follow_up_date}
                                onChange={(e) => setPrescriptionForm((current) => ({ ...current, follow_up_date: e.target.value }))}
                            />
                        </div>

                        <div className="mt-6 flex items-center justify-between gap-4">
                            <p className="text-sm text-slate-400">Prescription appears in patient portal.</p>
                            <button
                                type="submit"
                                disabled={!appointmentOptions.length}
                                className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white"
                            >
                                Save Prescription
                            </button>
                        </div>
                    </form>
                </section>

                <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
                    <form onSubmit={handleAdmissionSubmit} className="rounded-[30px] border border-slate-800 bg-[#111827] p-6 text-white shadow-[0_26px_60px_-40px_rgba(15,23,42,0.65)]">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Admission</p>
                                <h3 className="mt-2 text-2xl font-bold">{editingAdmissionId ? "Update admitted patient" : "Admit patient"}</h3>
                            </div>
                            {editingAdmissionId && (
                                <button type="button" onClick={resetAdmissionForm} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">
                                    Cancel edit
                                </button>
                            )}
                        </div>

                        <div className="mt-6 grid gap-4">
                            <select
                                className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition focus:border-slate-500"
                                value={admissionForm.patient}
                                onChange={(e) => setAdmissionForm((current) => ({ ...current, patient: e.target.value }))}
                                required
                            >
                                <option value="">{assignedPatients.length ? "Select patient" : "No active patient"}</option>
                                {assignedPatients.map((patient) => (
                                    <option key={patient.id} value={patient.id}>
                                        {patient.user_name}
                                    </option>
                                ))}
                            </select>

                            <select
                                className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition focus:border-slate-500"
                                value={admissionForm.appointment}
                                onChange={(e) => {
                                    const selectedOption = appointmentOptions.find((item) => item.value === e.target.value);
                                    setAdmissionForm((current) => ({
                                        ...current,
                                        appointment: e.target.value,
                                        patient: selectedOption?.patientId || current.patient,
                                    }));
                                }}
                            >
                                <option value="">{appointmentOptions.length ? "Select related appointment" : "No active appointment"}</option>
                                {appointmentOptions.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>

                            <div className="grid gap-4 md:grid-cols-2">
                                <input
                                    className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500"
                                    placeholder="Room number"
                                    value={admissionForm.room_number}
                                    onChange={(e) => setAdmissionForm((current) => ({ ...current, room_number: e.target.value }))}
                                />
                                <select
                                    className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition focus:border-slate-500"
                                    value={admissionForm.room_type}
                                    onChange={(e) => setAdmissionForm((current) => ({ ...current, room_type: e.target.value }))}
                                >
                                    <option value="non_ac">Non AC</option>
                                    <option value="ac">AC</option>
                                </select>
                            </div>

                            <textarea
                                className="min-h-24 w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500"
                                placeholder="Admission reason"
                                value={admissionForm.admission_reason}
                                onChange={(e) => setAdmissionForm((current) => ({ ...current, admission_reason: e.target.value }))}
                            />
                            <textarea
                                className="min-h-24 w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500"
                                placeholder="Care notes"
                                value={admissionForm.care_notes}
                                onChange={(e) => setAdmissionForm((current) => ({ ...current, care_notes: e.target.value }))}
                            />
                            <textarea
                                className="min-h-24 w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500"
                                placeholder="Injection / bottle / medicines during admission"
                                value={admissionForm.medicine_notes}
                                onChange={(e) => setAdmissionForm((current) => ({ ...current, medicine_notes: e.target.value }))}
                            />
                            <select
                                className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition focus:border-slate-500"
                                value={admissionForm.status}
                                onChange={(e) => setAdmissionForm((current) => ({ ...current, status: e.target.value }))}
                            >
                                <option value="admitted">Admitted</option>
                                <option value="discharged">Discharged</option>
                            </select>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <p className="mb-2 text-xs uppercase tracking-[0.22em] text-slate-500">Admit Date & Time</p>
                                    <input
                                        className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition focus:border-slate-500"
                                        type="datetime-local"
                                        value={admissionForm.admitted_at}
                                        onChange={(e) => setAdmissionForm((current) => ({ ...current, admitted_at: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <p className="mb-2 text-xs uppercase tracking-[0.22em] text-slate-500">Discharge Date & Time</p>
                                    <input
                                        className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition focus:border-slate-500"
                                        type="datetime-local"
                                        value={admissionForm.discharged_at}
                                        onChange={(e) => setAdmissionForm((current) => ({ ...current, discharged_at: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between gap-4">
                            <p className="text-sm text-slate-400">Doctor se admit start hoga, front-desk room aur medicine details baad me bhi update kar sakta hai.</p>
                            <button type="submit" className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white">
                                {editingAdmissionId ? "Update Admission" : "Admit Patient"}
                            </button>
                        </div>
                    </form>

                    <div className="rounded-[30px] border border-slate-800 bg-[#111827] p-6 text-white shadow-[0_26px_60px_-40px_rgba(15,23,42,0.65)]">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Admission List</p>
                                <h3 className="mt-2 text-2xl font-bold">Admitted patients</h3>
                            </div>
                            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">
                                {activeAdmissions.length} total
                            </span>
                        </div>

                        <div className="mt-6 space-y-3">
                            {activeAdmissions.map((admission) => (
                                <div key={admission.id} className="rounded-3xl border border-slate-800 bg-[#0f172a] p-4">
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
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        <button type="button" onClick={() => startAdmissionEdit(admission)} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">
                                            Edit
                                        </button>
                                        <button type="button" onClick={() => toggleAdmissionDetails(admission.id)} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">
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
                            {!activeAdmissions.length && <div className="rounded-3xl border border-dashed border-slate-700 bg-[#0f172a] px-4 py-8 text-sm text-slate-400">No admitted patients yet.</div>}
                        </div>
                    </div>
                </section>

                <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
                    <div className="rounded-[30px] border border-slate-800 bg-[#111827] p-6 text-white shadow-[0_26px_60px_-40px_rgba(15,23,42,0.65)]">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Appointments</p>
                                <h3 className="mt-2 text-2xl font-bold">Appointment list</h3>
                            </div>
                            <span className="rounded-full border border-teal-300/15 bg-teal-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
                                {appointments.length} visits
                            </span>
                        </div>

                        <div className="mt-6 space-y-3">
                            {appointments.map((appointment) => (
                                <div key={appointment.id} className="rounded-3xl border border-slate-800 bg-[#0f172a] p-4 transition hover:border-slate-700 hover:bg-[#162033]">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-base font-semibold text-white">{appointment.patient_name}</p>
                                            <p className="mt-1 text-sm text-slate-400">Visit on {appointment.date} | {appointment.time_slot || "No slot"}</p>
                                            <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                                                {appointment.visit_stage || appointment.queue_status?.replaceAll("_", " ") || "waiting"}
                                                {appointment.queue_position ? ` | Queue #${appointment.queue_position}` : ""}
                                                {appointment.estimated_wait_minutes !== null && appointment.estimated_wait_minutes !== undefined ? ` | ETA ${appointment.estimated_wait_minutes} min` : ""}
                                            </p>
                                            {appointment.reason && <p className="mt-2 text-sm text-slate-300">Reason: {appointment.reason}</p>}
                                            {appointment.pre_checkin_notes && <p className="mt-2 text-sm text-cyan-100">Pre-check-in: {appointment.pre_checkin_notes}</p>}
                                        </div>
                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${getStatusTone(appointment.status)}`}>
                                            {appointment.status}
                                        </span>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            onClick={() => handleVisitUpdate(appointment, { queue_status: "in_consultation", status: appointment.status === "Pending" ? "Confirmed" : appointment.status })}
                                            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
                                        >
                                            Start Visit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleVisitUpdate(appointment, { queue_status: "completed", status: "Completed" })}
                                            className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400/40"
                                        >
                                            Complete Visit
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {!appointments.length && (
                                <div className="rounded-3xl border border-dashed border-teal-300/15 bg-[#0a1f1d] px-4 py-8 text-sm text-slate-400">
                                    No appointments yet.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-[30px] border border-slate-800 bg-[#111827] p-6 text-white shadow-[0_26px_60px_-40px_rgba(15,23,42,0.65)]">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Prescriptions</p>
                                <h3 className="mt-2 text-2xl font-bold">Recent prescriptions</h3>
                            </div>
                            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">
                                {prescriptions.length} total
                            </span>
                        </div>

                        <div className="mt-6 space-y-3">
                            {prescriptions.map((item) => (
                                <div key={item.id} className="rounded-3xl border border-slate-800 bg-[#0f172a] p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-base font-semibold text-white">{item.patient_name}</p>
                                            <p className="mt-1 text-sm text-slate-400">{item.diagnosis}</p>
                                            <p className="mt-2 text-sm text-slate-500">{item.medicines}</p>
                                            <p className="mt-2 text-sm text-slate-500">{item.notes || "No notes"}</p>
                                        </div>
                                        <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">
                                            {item.follow_up_date || "No follow-up"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {!prescriptions.length && <div className="rounded-3xl border border-dashed border-slate-700 bg-[#0f172a] px-4 py-8 text-sm text-slate-400">No prescriptions yet.</div>}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default DoctorDashboard;
