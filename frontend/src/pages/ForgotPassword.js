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
        <div className="flex min-h-screen items-center justify-center bg-[#0b1120] px-4 py-8">
            <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-800 bg-[#101827] shadow-[0_45px_120px_-55px_rgba(15,23,42,0.95)] md:grid-cols-[1.08fr_0.92fr]">
                <div className="hidden border-r border-slate-800 bg-[#0f172a] p-8 text-white md:block">
                    <p className="text-sm uppercase tracking-[0.35em] text-slate-300">Hospital Access</p>
                    <h1 className="mt-6 max-w-lg text-4xl font-black leading-tight">Reset Password</h1>

                    <div className="mt-8 space-y-3">
                        <div className="rounded-2xl border border-slate-800 bg-[#111c2d] px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.28em] text-slate-300">1. Enter mobile or email</p>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-[#111c2d] px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.28em] text-slate-300">2. OTP comes to mobile</p>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-[#111c2d] px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.28em] text-slate-300">3. Set new password</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#111827] p-6 text-white sm:p-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-200">
                        <span className="h-2 w-2 rounded-full bg-slate-300" />
                        Password Reset
                    </div>
                    <h2 className="mt-5 text-3xl font-bold text-white">Account Recovery</h2>
                    <p className="mt-2 text-sm text-slate-400">Use OTP to set a new password.</p>

                    {step === 1 ? (
                        <form onSubmit={handleRequestOtp} className="mt-6">
                            <input
                                className="w-full rounded-xl border border-white/10 bg-[#0f1b31] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:bg-[#12213a]"
                                type="text"
                                placeholder="Email or mobile number"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required
                            />

                            {error && <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
                            {message && <p className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="mt-5 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200"
                            >
                                {isLoading ? "Sending OTP..." : "Send OTP"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleReset} className="mt-6 space-y-3">
                            <input
                                className="w-full rounded-xl border border-white/10 bg-[#0f1b31] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:bg-[#12213a]"
                                type="text"
                                placeholder="Email or mobile number"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required
                            />
                            <input
                                className="w-full rounded-xl border border-white/10 bg-[#0f1b31] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:bg-[#12213a]"
                                type="text"
                                placeholder="OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                            />
                            <input
                                className="w-full rounded-xl border border-white/10 bg-[#0f1b31] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:bg-[#12213a]"
                                type="password"
                                placeholder="New password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />

                            {error && <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
                            {message && <p className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</p>}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200"
                            >
                                {isLoading ? "Resetting..." : "Reset Password"}
                            </button>
                        </form>
                    )}

                    <div className="mt-5 flex items-center justify-between gap-4 text-sm text-slate-400">
                        <button
                            type="button"
                            onClick={() => {
                                setStep(1);
                                setOtp("");
                                setPassword("");
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

export default ForgotPassword;
