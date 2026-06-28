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
        <section className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(120deg,rgba(239,248,255,0.95),rgba(255,255,255,0.96),rgba(237,250,245,0.92))] px-5 py-4 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.16)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-600">{stageLabel}</p>
                    <h2 className="mt-2 text-xl font-bold text-slate-950">Live date and time</h2>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="min-w-[220px] rounded-full border border-slate-200 bg-white px-5 py-3">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Date</p>
                        <p className="mt-1 text-base font-semibold text-slate-950">{dateLabel}</p>
                    </div>
                    <div className="min-w-[180px] rounded-full border border-slate-200 bg-white px-5 py-3">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Time</p>
                        <p className="mt-1 text-base font-semibold text-slate-950">{timeLabel}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default LiveDateTimeCard;
