import { useEffect, useMemo, useState } from "react";

function formatDateParts(currentTime) {
    const dateLabel = currentTime.toLocaleDateString(undefined, {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
    const timeLabel = currentTime.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

    return { dateLabel, timeLabel };
}

function LiveDateTimeCard({ stageLabel }) {
    const [currentTime, setCurrentTime] = useState(() => new Date());

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => window.clearInterval(intervalId);
    }, []);

    const { dateLabel, timeLabel } = useMemo(() => formatDateParts(currentTime), [currentTime]);

    return (
        <section className="mt-6 overflow-hidden rounded-[24px] border border-cyan-400/20 bg-[linear-gradient(120deg,rgba(34,211,238,0.16),rgba(15,23,42,0.92),rgba(56,189,248,0.12))] px-5 py-4 shadow-[0_24px_50px_-36px_rgba(34,211,238,0.45)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-200/80">{stageLabel}</p>
                    <h2 className="mt-2 text-xl font-bold text-white">Live date and time</h2>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="min-w-[220px] rounded-full border border-white/10 bg-slate-950/35 px-5 py-3">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Date</p>
                        <p className="mt-1 text-base font-semibold text-white">{dateLabel}</p>
                    </div>
                    <div className="min-w-[180px] rounded-full border border-white/10 bg-slate-950/35 px-5 py-3">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Time</p>
                        <p className="mt-1 text-base font-semibold text-white">{timeLabel}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default LiveDateTimeCard;
