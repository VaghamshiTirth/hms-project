function MobileApiSettings({
    apiBaseUrl,
    onApiBaseUrlChange,
    onSave,
    onReset,
}) {
    return (
        <>
            <input
                className="w-full rounded-xl border border-white/10 bg-[#0f1b31] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:bg-[#12213a]"
                type="text"
                placeholder="Backend URL"
                value={apiBaseUrl}
                onChange={(e) => onApiBaseUrlChange(e.target.value)}
            />
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onSave}
                    className="flex-1 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/15"
                >
                    Save Backend URL
                </button>
                <button
                    type="button"
                    onClick={onReset}
                    className="flex-1 rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                >
                    Reset Default
                </button>
            </div>
        </>
    );
}

export default MobileApiSettings;
