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
        <div className="min-h-screen bg-[#f6fbff] text-slate-900">
            <div className="relative overflow-hidden bg-[linear-gradient(135deg,#eff8ff_0%,#ffffff_42%,#eefaf5_100%)] px-4 py-8 sm:px-6 lg:px-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_34%),radial-gradient(circle_at_right,rgba(16,185,129,0.14),transparent_28%)]" />

                <div className="relative mx-auto max-w-6xl">
                    <div className="mb-6 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.36em] text-emerald-600">Hospital Care</p>
                            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">HMS Portal</h1>
                        </div>
                        <Link
                            to="/"
                            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                        >
                            Back
                        </Link>
                    </div>

                    <div className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_45px_120px_-45px_rgba(15,23,42,0.25)]">
                        <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
                            <div className="border-b border-slate-200 bg-[linear-gradient(160deg,#f8fdff_0%,#eef7ff_52%,#eefaf5_100%)] p-6 sm:p-8 lg:border-b-0 lg:border-r">
                                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700 shadow-sm">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    Patient Signup
                                </div>
                                <h2 className="mt-6 max-w-lg text-4xl font-black leading-tight text-slate-950">
                                    Create your hospital portal account
                                </h2>
                                <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">
                                    Complete the quick registration flow to receive an OTP and activate your patient account.
                                </p>

                                <div className="mt-8 grid gap-3">
                                    <div className={`rounded-[22px] border px-5 py-4 ${step === 1 ? "border-emerald-200 bg-white shadow-sm" : "border-slate-200 bg-slate-50"}`}>
                                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Step 1</p>
                                        <p className="mt-2 text-lg font-bold text-slate-950">Enter personal details</p>
                                        <p className="mt-1 text-sm leading-6 text-slate-600">Add your basic information, contact details, age, and password.</p>
                                    </div>
                                    <div className={`rounded-[22px] border px-5 py-4 ${step === 2 ? "border-emerald-200 bg-white shadow-sm" : "border-slate-200 bg-slate-50"}`}>
                                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Step 2</p>
                                        <p className="mt-2 text-lg font-bold text-slate-950">Verify mobile OTP</p>
                                        <p className="mt-1 text-sm leading-6 text-slate-600">Use the code sent to your mobile number to finish signup securely.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 sm:p-8">
                                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    {step === 1 ? "Register" : "Verify OTP"}
                                </div>
                                <p className="mt-5 text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
                                    {step === 1 ? "New Patient Access" : "Final Confirmation"}
                                </p>
                                <h3 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
                                    {step === 1 ? "Register with OTP" : "Confirm your mobile code"}
                                </h3>
                                <p className="mt-2 text-sm leading-7 text-slate-600">
                                    {step === 1
                                        ? "Use your mobile number to create your patient portal account."
                                        : "Enter the OTP sent to your mobile number to activate your patient account."}
                                </p>

                                {step === 1 ? (
                                    <form onSubmit={handleRequestOtp} className="mt-8 space-y-3" autoComplete="off">
                                        <input
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
                                            type="text"
                                            name="patient_name"
                                            autoComplete="off"
                                            placeholder="Full name"
                                            value={form.name}
                                            onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                                            required
                                        />
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <input
                                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
                                                type="text"
                                                name="patient_mobile"
                                                autoComplete="off"
                                                placeholder="Mobile number"
                                                value={form.mobile_number}
                                                onChange={(e) => setForm((current) => ({ ...current, mobile_number: e.target.value }))}
                                                required
                                            />
                                            <input
                                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
                                                type="email"
                                                name="patient_email"
                                                autoComplete="off"
                                                placeholder="Email (optional)"
                                                value={form.email}
                                                onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                                            />
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <input
                                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
                                                type="password"
                                                name="patient_password"
                                                autoComplete="new-password"
                                                placeholder="Password"
                                                value={form.password}
                                                onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
                                                required
                                            />
                                            <input
                                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
                                                type="number"
                                                name="patient_age"
                                                autoComplete="off"
                                                min="1"
                                                placeholder="Age"
                                                value={form.age}
                                                onChange={(e) => setForm((current) => ({ ...current, age: e.target.value }))}
                                                required
                                            />
                                        </div>
                                        <textarea
                                            className="min-h-32 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
                                            name="patient_history"
                                            autoComplete="off"
                                            placeholder="Medical history"
                                            value={form.history}
                                            onChange={(e) => setForm((current) => ({ ...current, history: e.target.value }))}
                                        />

                                        {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
                                        {message && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}

                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="mt-2 w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-400"
                                        >
                                            {isLoading ? "Sending OTP..." : "Send Signup OTP"}
                                        </button>
                                    </form>
                                ) : (
                                    <form onSubmit={handleVerifyOtp} className="mt-8 space-y-3" autoComplete="off">
                                        <input
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
                                            type="text"
                                            name="verify_mobile"
                                            autoComplete="off"
                                            placeholder="Mobile number"
                                            value={form.mobile_number}
                                            onChange={(e) => setForm((current) => ({ ...current, mobile_number: e.target.value }))}
                                            required
                                        />
                                        <input
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
                                            type="text"
                                            name="verify_otp"
                                            autoComplete="one-time-code"
                                            placeholder="OTP"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            required
                                        />

                                        {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
                                        {message && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}

                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-400"
                                        >
                                            {isLoading ? "Verifying..." : "Verify OTP"}
                                        </button>
                                    </form>
                                )}

                                <div className="mt-5 flex items-center justify-between gap-4 text-sm">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStep(1);
                                            setOtp("");
                                            setError("");
                                            setMessage("");
                                        }}
                                        className="font-semibold text-slate-700 transition hover:text-slate-950"
                                    >
                                        Start again
                                    </button>
                                    <Link to="/" className="font-semibold text-slate-700 transition hover:text-slate-950">
                                        Back
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PatientSignup;
