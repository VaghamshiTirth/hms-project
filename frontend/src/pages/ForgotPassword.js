import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import API from "../services/api";

function ForgotPassword() {
    const [step, setStep] = useState(1);
    const [identifier, setIdentifier] = useState("");
    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
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
            const response = await API.post("forgot-password/", { identifier });
            setMessage(response.data.message || "OTP sent.");
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.error || "Could not send OTP.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setMessage("");
        setError("");

        try {
            const response = await API.post("reset-password/", {
                identifier,
                code: otp,
                new_password: password,
            });
            setMessage(response.data.message || "Password reset.");
            setTimeout(() => navigate("/", { replace: true }), 1200);
        } catch (err) {
            setError(err.response?.data?.error || "Could not reset password.");
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
                                    Password Reset
                                </div>
                                <h2 className="mt-6 max-w-lg text-4xl font-black leading-tight text-slate-950">
                                    Recover account access securely
                                </h2>
                                <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">
                                    Request an OTP, confirm it, and set a new password using the same clean access flow as the rest of the portal.
                                </p>

                                <div className="mt-8 grid gap-3">
                                    <div className={`rounded-[22px] border px-5 py-4 ${step === 1 ? "border-emerald-200 bg-white shadow-sm" : "border-slate-200 bg-slate-50"}`}>
                                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Step 1</p>
                                        <p className="mt-2 text-lg font-bold text-slate-950">Enter mobile or email</p>
                                        <p className="mt-1 text-sm leading-6 text-slate-600">Submit the account identifier used for login.</p>
                                    </div>
                                    <div className={`rounded-[22px] border px-5 py-4 ${step === 2 ? "border-emerald-200 bg-white shadow-sm" : "border-slate-200 bg-slate-50"}`}>
                                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Step 2</p>
                                        <p className="mt-2 text-lg font-bold text-slate-950">Verify OTP and reset password</p>
                                        <p className="mt-1 text-sm leading-6 text-slate-600">Use the one-time code and create a new secure password.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 sm:p-8">
                                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    {step === 1 ? "Request OTP" : "Reset Password"}
                                </div>
                                <p className="mt-5 text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
                                    {step === 1 ? "Account Recovery" : "Verification"}
                                </p>
                                <h3 className="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
                                    {step === 1 ? "Recover your account" : "Finish the password reset"}
                                </h3>
                                <p className="mt-2 text-sm leading-7 text-slate-600">
                                    {step === 1
                                        ? "Enter your registered email or mobile number to receive an OTP."
                                        : "Enter the OTP and set a new password for your account."}
                                </p>

                                {step === 1 ? (
                                    <form onSubmit={handleRequestOtp} className="mt-8" autoComplete="off">
                                        <input
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
                                            type="text"
                                            name="recovery_identifier"
                                            autoComplete="off"
                                            placeholder="Email or mobile number"
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value)}
                                            required
                                        />

                                        {error && <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
                                        {message && <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}

                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="mt-5 w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-400"
                                        >
                                            {isLoading ? "Sending OTP..." : "Send OTP"}
                                        </button>
                                    </form>
                                ) : (
                                    <form onSubmit={handleReset} className="mt-8 space-y-3" autoComplete="off">
                                        <input
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
                                            type="text"
                                            name="reset_identifier"
                                            autoComplete="off"
                                            placeholder="Email or mobile number"
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value)}
                                            required
                                        />
                                        <input
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
                                            type="text"
                                            name="reset_otp"
                                            autoComplete="one-time-code"
                                            placeholder="OTP"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            required
                                        />
                                        <input
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white"
                                            type="password"
                                            name="reset_password"
                                            autoComplete="new-password"
                                            placeholder="New password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />

                                        {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
                                        {message && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}

                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-400"
                                        >
                                            {isLoading ? "Resetting..." : "Reset Password"}
                                        </button>
                                    </form>
                                )}

                                <div className="mt-5 flex items-center justify-between gap-4 text-sm">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStep(1);
                                            setOtp("");
                                            setPassword("");
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

export default ForgotPassword;
