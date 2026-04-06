import { useCallback, useEffect, useMemo, useState } from "react";
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

function AdmissionDesk() {
    const [patients, setPatients] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [admissions, setAdmissions] = useState([]);
    const [editingAdmissionId, setEditingAdmissionId] = useState(null);
    const [expandedAdmissions, setExpandedAdmissions] = useState({});
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [admissionForm, setAdmissionForm] = useState({
        patient: "",
        doctor: "",
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

    const loadData = useCallback(async () => {
        try {
            const [patientsRes, doctorsRes, appointmentsRes, admissionsRes] = await Promise.all([
                API.get("patients/"),
                API.get("doctors/"),
                API.get("appointments/"),
                API.get("admissions/"),
            ]);

            setPatients(patientsRes.data);
            setDoctors(doctorsRes.data);
            setAppointments(appointmentsRes.data);
            setAdmissions(admissionsRes.data);
            setError("");
        } catch (err) {
            setError(err.response?.data?.error || "Could not load admission desk.");
        }
    }, []);

    useEffect(() => {
        const role = localStorage.getItem("role");
        if (role !== "frontdesk") {
            navigate("/", { replace: true });
            return;
        }

        loadData();
    }, [loadData, navigate]);

    const patientOptions = useMemo(
        () =>
            patients.map((patient) => ({
                value: String(patient.id),
                label: `${patient.user_name} (${patient.user_mobile || patient.user_email})`,
            })),
        [patients]
    );

    const doctorOptions = useMemo(
        () =>
            doctors.map((doctor) => ({
                value: String(doctor.id),
                label: `${doctor.user_name} (${doctor.specialization})`,
            })),
        [doctors]
    );

    const appointmentOptions = useMemo(
        () =>
            appointments.map((appointment) => ({
                value: String(appointment.id),
                label: `${appointment.patient_name} | ${appointment.doctor_name} | ${appointment.date} ${appointment.time_slot || ""}`.trim(),
                patientId: String(appointment.patient),
                doctorId: String(appointment.doctor),
            })),
        [appointments]
    );

    const resetAdmissionForm = () => {
        setEditingAdmissionId(null);
        setAdmissionForm({
            patient: "",
            doctor: "",
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
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || "Could not save admission.");
        }
    };

    const startAdmissionEdit = (admission) => {
        setEditingAdmissionId(admission.id);
        setAdmissionForm({
            patient: String(admission.patient),
            doctor: String(admission.doctor),
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

    const handleAdmissionStatusUpdate = async (admission, status) => {
        setMessage("");
        setError("");

        try {
            const response = await API.put(`admissions/${admission.id}/`, { status });
            setMessage(response.data.message || "Admission updated.");
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || "Could not update admission.");
        }
    };

    const toggleAdmissionDetails = (admissionId) => {
        setExpandedAdmissions((current) => ({
            ...current,
            [admissionId]: !current[admissionId],
        }));
    };

    return (
        <div className="min-h-screen bg-[#0b1120]">
            <Sidebar />

            <main className="min-h-screen p-5 md:ml-64 md:p-8">
                <div className="mx-auto max-w-7xl">
                    <LiveDateTimeCard stageLabel="Stage 3 - Admission Desk" />

                    {message && <p className="mt-6 rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}
                    {error && <p className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

                    <section className="mt-6 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
                        <form onSubmit={handleAdmissionSubmit} className="rounded-[28px] border border-slate-800 bg-[#111827] p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Admission Desk</p>
                                    <h2 className="mt-2 text-2xl font-bold text-white">{editingAdmissionId ? "Edit admitted patient" : "Admit patient"}</h2>
                                </div>
                                {editingAdmissionId && (
                                    <button type="button" onClick={resetAdmissionForm} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500">
                                        Cancel edit
                                    </button>
                                )}
                            </div>

                            <div className="mt-5 grid gap-4">
                                <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500" value={admissionForm.patient} onChange={(event) => setAdmissionForm((current) => ({ ...current, patient: event.target.value }))} required>
                                    <option value="">Select patient</option>
                                    {patientOptions.map((patient) => (
                                        <option key={patient.value} value={patient.value}>{patient.label}</option>
                                    ))}
                                </select>

                                <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500" value={admissionForm.doctor} onChange={(event) => setAdmissionForm((current) => ({ ...current, doctor: event.target.value }))} required>
                                    <option value="">Select doctor</option>
                                    {doctorOptions.map((doctor) => (
                                        <option key={doctor.value} value={doctor.value}>{doctor.label}</option>
                                    ))}
                                </select>

                                <select
                                    className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500"
                                    value={admissionForm.appointment}
                                    onChange={(event) => {
                                        const selectedOption = appointmentOptions.find((item) => item.value === event.target.value);
                                        setAdmissionForm((current) => ({
                                            ...current,
                                            appointment: event.target.value,
                                            patient: selectedOption?.patientId || current.patient,
                                            doctor: selectedOption?.doctorId || current.doctor,
                                        }));
                                    }}
                                >
                                    <option value="">Select related appointment</option>
                                    {appointmentOptions.map((appointment) => (
                                        <option key={appointment.value} value={appointment.value}>{appointment.label}</option>
                                    ))}
                                </select>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <input className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500" placeholder="Room number" value={admissionForm.room_number} onChange={(event) => setAdmissionForm((current) => ({ ...current, room_number: event.target.value }))} />
                                    <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500" value={admissionForm.room_type} onChange={(event) => setAdmissionForm((current) => ({ ...current, room_type: event.target.value }))}>
                                        <option value="non_ac">Non AC</option>
                                        <option value="ac">AC</option>
                                    </select>
                                </div>

                                <textarea className="min-h-24 w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500" placeholder="Admission reason" value={admissionForm.admission_reason} onChange={(event) => setAdmissionForm((current) => ({ ...current, admission_reason: event.target.value }))} />
                                <textarea className="min-h-24 w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500" placeholder="Care notes / observation" value={admissionForm.care_notes} onChange={(event) => setAdmissionForm((current) => ({ ...current, care_notes: event.target.value }))} />
                                <textarea className="min-h-24 w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500" placeholder="Injection / bottle / medicines" value={admissionForm.medicine_notes} onChange={(event) => setAdmissionForm((current) => ({ ...current, medicine_notes: event.target.value }))} />
                                <select className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500" value={admissionForm.status} onChange={(event) => setAdmissionForm((current) => ({ ...current, status: event.target.value }))}>
                                    <option value="admitted">Admitted</option>
                                    <option value="discharged">Discharged</option>
                                </select>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <p className="mb-2 text-xs uppercase tracking-[0.22em] text-slate-500">Admit Date & Time</p>
                                        <input className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500" type="datetime-local" value={admissionForm.admitted_at} onChange={(event) => setAdmissionForm((current) => ({ ...current, admitted_at: event.target.value }))} />
                                    </div>
                                    <div>
                                        <p className="mb-2 text-xs uppercase tracking-[0.22em] text-slate-500">Discharge Date & Time</p>
                                        <input className="w-full rounded-xl border border-white/10 bg-[#091a2b] px-4 py-3 text-white outline-none transition focus:border-slate-500" type="datetime-local" value={admissionForm.discharged_at} onChange={(event) => setAdmissionForm((current) => ({ ...current, discharged_at: event.target.value }))} />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-between gap-4">
                                <p className="text-sm text-slate-400">Yahin se admission create aur edit dono ho jayega.</p>
                                <button type="submit" className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white">
                                    {editingAdmissionId ? "Update Admission" : "Save Admission"}
                                </button>
                            </div>
                        </form>

                        <div className="rounded-[28px] border border-slate-800 bg-[#111827] p-5 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Current Admissions</p>
                                    <h2 className="mt-2 text-2xl font-bold text-white">Admitted patients list</h2>
                                </div>
                                <span className="rounded-full border border-indigo-300/15 bg-indigo-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-100">
                                    {admissions.length} total
                                </span>
                            </div>

                            <div className="mt-5 space-y-3">
                                {admissions.map((admission) => (
                                    <div key={admission.id} className="rounded-2xl border border-slate-800 bg-[#0f172a] p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold text-white">{admission.patient_name}</p>
                                                <p className="mt-1 text-sm text-slate-400">
                                                    {admission.doctor_name} | Room {admission.room_number || "Not assigned"} | {admission.room_type === "ac" ? "AC" : "Non AC"}
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
                                            {admission.status === "admitted" && (
                                                <button type="button" onClick={() => handleAdmissionStatusUpdate(admission, "discharged")} className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400/40">
                                                    Discharge
                                                </button>
                                            )}
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
                                {!admissions.length && <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0f172a] px-4 py-8 text-sm text-slate-400">No admissions yet.</div>}
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

export default AdmissionDesk;
