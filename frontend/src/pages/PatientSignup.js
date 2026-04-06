import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import API from "../services/api";

function getApiErrorMessage(err, fallback) {
    const responseData = err.response?.data;
    if (responseData?.error) return responseData.error;
    if (responseData?.detail) return responseData.detail;
    if (typeof responseData === "string" && responseData.trim()) return responseData;
    if (err.response?.status === 404) return "Signup API not found. Restart backend server.";
    if (err.response?.status >= 500) return "Backend error. Run migrations and restart backend server.";
    return fallback;
}

function PatientSignup() {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({
        name: "",
        mobile_number: "",
        email: "",
        password: "",
        age: "",
        history: "",
    });
    const [otp, setOtp] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleRequestOtp = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setMessage("");
        setError("");

        try {
            const response = await API.post("patient-signup/", form);
            setMessage(response.data.message || "OTP sent.");
            setStep(2);
        } catch (err) {
            setError(getApiErrorMessage(err, "Could not start signup."));
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setMessage("");
        setError("");

        try {
            const response = await API.post("patient-signup/verify/", {
                mobile_number: form.mobile_number,
                code: otp,
            });
            setMessage(response.data.message || "Signup complete.");
            setTimeout(() => navigate("/", { replace: true }), 1200);
        } catch (err) {
            setError(getApiErrorMessage(err, "Could not verify OTP."));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0b1120] px-4 py-8">
            <div className="grid w-full max-w-6xl overflow-hidden rounded-[28px] border border-slate-800 bg-[#101827] shadow-[0_45px_120px_-55px_rgba(15,23,42,0.95)] md:grid-cols-[1.08fr_0.92fr]">
                <div className="hidden border-r border-slate-800 bg-[#0f172a] p-8 text-white md:block">
                    <p className="text-sm uppercase tracking-[0.35em] text-slate-300">Patient Self Registration</p>
                    <h1 className="mt-6 max-w-lg text-4xl font-black leading-tight">Create your hospital portal account</h1>
                    <div className="mt-8 space-y-3">
                        <div className="rounded-2xl border border-slate-800 bg-[#111c2d] px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.28em] text-slate-300">1. Fill your personal details</p>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-[#111c2d] px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.28em] text-slate-300">2. Get OTP on mobile</p>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-[#111c2d] px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.28em] text-slate-300">3. Verify and start booking</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#111827] p-6 text-white sm:p-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-200">
                        <span className="h-2 w-2 rounded-full bg-cyan-300" />
                        Patient Signup
                    </div>
                    <h2 className="mt-5 text-3xl font-bold text-white">{step === 1 ? "Register with OTP" : "Verify OTP"}</h2>
                    <p className="mt-2 text-sm text-slate-400">Use your mobile number to create your patient portal account.</p>

                    {step === 1 ? (
                        <form onSubmit={handleRequestOtp} className="mt-6 grid gap-3">
                            <input className="w-full rounded-xl border border-white/10 bg-[#0f1b31] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:bg-[#12213a]" type="text" placeholder="Full name" value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} required />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <input className="w-full rounded-xl border border-white/10 bg-[#0f1b31] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:bg-[#12213a]" type="text" placeholder="Mobile number" value={form.mobile_number} onChange={(e) => setForm((current) => ({ ...current, mobile_number: e.target.value }))} required />
                                <input className="w-full rounded-xl border border-white/10 bg-[#0f1b31] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:bg-[#12213a]" type="email" placeholder="Email (optional)" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <input className="w-full rounded-xl border border-white/10 bg-[#0f1b31] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:bg-[#12213a]" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))} required />
                                <input className="w-full rounded-xl border border-white/10 bg-[#0f1b31] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:bg-[#12213a]" type="number" min="1" placeholder="Age" value={form.age} onChange={(e) => setForm((current) => ({ ...current, age: e.target.value }))} required />
                            </div>
                            <textarea className="min-h-28 w-full rounded-xl border border-white/10 bg-[#0f1b31] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:bg-[#12213a]" placeholder="Medical history" value={form.history} onChange={(e) => setForm((current) => ({ ...current, history: e.target.value }))} />

                            {error && <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
                            {message && <p className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}

                            <button type="submit" disabled={isLoading} className="mt-2 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200">
                                {isLoading ? "Sending OTP..." : "Send Signup OTP"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="mt-6 space-y-3">
                            <input className="w-full rounded-xl border border-white/10 bg-[#0f1b31] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:bg-[#12213a]" type="text" placeholder="Mobile number" value={form.mobile_number} onChange={(e) => setForm((current) => ({ ...current, mobile_number: e.target.value }))} required />
                            <input className="w-full rounded-xl border border-white/10 bg-[#0f1b31] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:bg-[#12213a]" type="text" placeholder="OTP" value={otp} onChange={(e) => setOtp(e.target.value)} required />

                            {error && <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
                            {message && <p className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}

                            <button type="submit" disabled={isLoading} className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200">
                                {isLoading ? "Verifying..." : "Verify OTP"}
                            </button>
                        </form>
                    )}

                    <div className="mt-5 flex items-center justify-between gap-4 text-sm text-slate-400">
                        <button
                            type="button"
                            onClick={() => {
                                setStep(1);
                                setOtp("");
                                setError("");
                                setMessage("");
                            }}
                            className="font-semibold text-slate-300 transition hover:text-white"
                        >
                            Start again
                        </button>
                        <Link to="/" className="font-semibold text-slate-300 transition hover:text-white">
                            Back to login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PatientSignup;
