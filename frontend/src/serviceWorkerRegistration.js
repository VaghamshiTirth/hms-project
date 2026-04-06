const isLocalhost = Boolean(
    window.location.hostname === "localhost" ||
    window.location.hostname === "[::1]" ||
    window.location.hostname.match(
        /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

export function register() {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
        return;
    }

    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
        return;
    }

    window.addEventListener("load", () => {
        const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

        if (isLocalhost) {
            checkValidServiceWorker(swUrl);
            navigator.serviceWorker.ready.catch(() => {});
        } else {
            registerValidSW(swUrl);
        }
    });
}

function registerValidSW(swUrl) {
    navigator.serviceWorker
        .register(swUrl)
        .catch(() => {});
}

function checkValidServiceWorker(swUrl) {
    fetch(swUrl, {
        headers: { "Service-Worker": "script" },
    })
        .then((response) => {
            const contentType = response.headers.get("content-type");
            if (response.status === 404 || (contentType && contentType.indexOf("javascript") === -1)) {
                navigator.serviceWorker.ready.then((registration) => {
                    registration.unregister().then(() => {
                        window.location.reload();
                    });
                });
            } else {
                registerValidSW(swUrl);
            }
        })
        .catch(() => {});
}

export function unregister() {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready
            .then((registration) => {
                registration.unregister();
            })
            .catch(() => {});
    }
}
