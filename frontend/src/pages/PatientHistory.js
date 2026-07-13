import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../services/api";
import LiveDateTimeCard from "../components/LiveDateTimeCard";
import Sidebar from "../components/Sidebar";

function getStatusTone(status) {
    if (status === "Completed") return "border border-emerald-400/15 bg-emerald-400/10 text-emerald-200";
    if (status === "Confirmed") return "border border-teal-300/15 bg-teal-300/10 text-teal-100";
    return "border border-amber-300/15 bg-amber-300/10 text-amber-200";
}

function PatientHistory() {
    const navigate = useNavigate();
    const role = localStorage.getItem("role");

    const [patients, setPatients] = useState([]);
    const [patientSearch, setPatientSearch] = useState("");
    const [selectedPatientId, setSelectedPatientId] = useState("");
    const [patientHistory, setPatientHistory] = useState(null);
    const [loadingPatients, setLoadingPatients] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [error, setError] = useState("");

    const loadPatients = useCallback(async () => {
        setLoadingPatients(true);
        setError("");
        try {
            const res = await API.get("patients/");
            setPatients(res.data || []);
        } catch (err) {
            setError(err.response?.data?.error || "Could not load patient list.");
        } finally {
            setLoadingPatients(false);
        }
    }, []);

    const loadPatientHistory = useCallback(async (patientId) => {
        setLoadingHistory(true);
        setError("");
        setPatientHistory(null);
        try {
            const res = await API.get(`patients/${patientId}/full-history/`);
            setPatientHistory(res.data);
        } catch (err) {
            setError(err.response?.data?.error || "Could not load patient history.");
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        const allowedRoles = ["doctor", "frontdesk", "admin"];
        if (!allowedRoles.includes(role)) {
            navigate("/", { replace: true });
            return;
        }
        loadPatients();
    }, [navigate, role, loadPatients]);

    useEffect(() => {
        if (selectedPatientId) {
            loadPatientHistory(selectedPatientId);
        } else {
            setPatientHistory(null);
        }
    }, [selectedPatientId, loadPatientHistory]);

    const selectedPatient = patients.find((p) => String(p.id) === selectedPatientId);
    const patientPrescriptions = patientHistory?.prescriptions || [];
    const patientAppointments = patientHistory?.appointments || [];
    const filteredPatients = patients.filter((p) =>
        p.user_name?.toLowerCase().includes(patientSearch.toLowerCase())
    );

    return (
        <div className="dashboard-light min-h-screen bg-[#f6fbff]">
            <Sidebar />

            <main className="min-h-screen p-5 md:ml-64 md:p-8">
                <div className="mx-auto max-w-[1400px]">
                    <LiveDateTimeCard stageLabel="Patient History" />

                    {error && (
                        <div className="mb-6 mt-6 rounded-2xl border border-rose-800/20 bg-rose-500/10 px-5 py-3 text-sm text-rose-200">
                            {error}
                        </div>
                    )}

                    <div className="mt-6 rounded-[28px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                                    Patient History
                                </p>
                                <h3 className="mt-1 text-xl font-bold text-white">
                                    {selectedPatient ? selectedPatient.user_name : "Search a patient"}
                                </h3>
                            </div>
                            <div className="relative">
                                <input
                                    className="w-64 rounded-xl border border-slate-700 bg-[#0f172a] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500"
                                    placeholder="Search patient by name..."
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
                    </div>

                    {loadingPatients && (
                        <div className="mt-6 flex items-center justify-center py-12">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                            <p className="ml-3 text-sm text-slate-400">Loading patient list...</p>
                        </div>
                    )}

                    {loadingHistory && selectedPatientId && (
                        <div className="mt-6 flex items-center justify-center py-12">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                            <p className="ml-3 text-sm text-slate-400">Loading patient history...</p>
                        </div>
                    )}

                    {selectedPatient && !loadingHistory && !loadingPatients && (
                        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
                            {/* Prescriptions */}
                            <div className="rounded-[28px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                                    Prescription History ({patientPrescriptions.length})
                                </p>
                                {patientPrescriptions.length > 0 ? (
                                    <div className="space-y-4">
                                        {patientPrescriptions.map((item) => (
                                            <div key={item.id} className="rounded-2xl border border-slate-800 bg-[#0f172a] p-4 text-sm">
                                                <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                                                    <div>
                                                        <p className="text-xs text-slate-400">
                                                            {item.doctor_name} — {item.appointment_date || "—"}
                                                            {item.appointment_time_slot ? ` at ${item.appointment_time_slot}` : ""}
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-slate-500">
                                                            Prescribed: {item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}
                                                        </p>
                                                    </div>
                                                    <span className="rounded-full border border-cyan-400/15 bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                                                        Rx #{item.id}
                                                    </span>
                                                </div>
                                                <div className="mt-3 space-y-2">
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Diagnosis</p>
                                                        <p className="mt-0.5 text-white">{item.diagnosis}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Medicines</p>
                                                        <p className="mt-0.5 text-slate-300">{item.medicines}</p>
                                                    </div>
                                                    {item.notes && (
                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Notes</p>
                                                            <p className="mt-0.5 text-slate-300">{item.notes}</p>
                                                        </div>
                                                    )}
                                                    {item.follow_up_date && (
                                                        <div className="flex items-center gap-2 rounded-lg border border-amber-400/15 bg-amber-400/5 px-3 py-2">
                                                            <span className="text-[10px] uppercase tracking-[0.22em] text-amber-300">Follow-up</span>
                                                            <span className="text-sm text-amber-200">{item.follow_up_date}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0f172a] px-4 py-8 text-center text-sm text-slate-400">
                                        No prescriptions found for this patient.
                                    </div>
                                )}
                            </div>

                            {/* Sidebar: Patient Info + Appointments */}
                            <div className="space-y-6">
                                <div className="rounded-[28px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                                        Patient Info
                                    </p>
                                    <div className="mt-4 space-y-2 text-sm">
                                        <p className="text-white">
                                            <span className="text-slate-400">Name:</span> {selectedPatient.user_name}
                                        </p>
                                        <p className="text-white">
                                            <span className="text-slate-400">Age:</span> {selectedPatient.age || "—"}
                                        </p>
                                        <p className="text-white">
                                            <span className="text-slate-400">History:</span> {selectedPatient.history || "None"}
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-[28px] border border-slate-800 bg-[#111827] p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                                        Appointments ({patientAppointments.length})
                                    </p>
                                    <div className="mt-4 max-h-[400px] space-y-3 overflow-y-auto">
                                        {patientAppointments.map((item) => {
                                            const hasRx = patientPrescriptions.some((p) => String(p.appointment) === String(item.id));
                                            return (
                                                <div key={item.id} className="rounded-2xl border border-slate-800 bg-[#0f172a] p-3 text-sm">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="font-semibold text-white">
                                                            {item.date} | {item.time_slot || "—"}
                                                        </p>
                                                        {hasRx && (
                                                            <span className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                                                                Rx Given
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-0.5 text-slate-400">{item.reason || "No reason"}</p>
                                                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${getStatusTone(item.status)}`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        {!patientAppointments.length && (
                                            <p className="text-center text-sm text-slate-400">No appointments.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!selectedPatient && !loadingPatients && !loadingHistory && (
                        <div className="mt-6 rounded-[28px] border border-dashed border-slate-700 bg-[#111827] p-12 text-center shadow-[0_24px_50px_-36px_rgba(15,23,42,0.55)]">
                            <p className="text-lg font-semibold text-slate-400">Search and select a patient</p>
                            <p className="mt-2 text-sm text-slate-500">Use the search bar above to find a patient and view their full history.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default PatientHistory;
