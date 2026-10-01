// Vite's PWA plugin provides this module at build time.
// eslint-disable-next-line import-x/no-unresolved
import { registerSW } from 'virtual:pwa-register';

const UPDATE_CHECK_INTERVAL = 5 * 60 * 1000;

/** App-wide update notice; persists across areas and reloads only on player request. */
export function registerGameUpdates() {
    if (!('serviceWorker' in navigator)) return;

    const notice = document.createElement('section');
    notice.id = 'game-update';
    notice.hidden = true;
    notice.setAttribute('aria-label', 'Speluppdatering');
    notice.innerHTML = `<p role="status"><strong>En ny version är redo!</strong><span>Ladda om för att uppdatera och börja ett nytt äventyr.</span></p><div><button type="button" class="update-reload">Ladda om</button><button type="button" class="update-later">Senare</button></div>`;
    document.body.appendChild(notice);

    const reload = notice.querySelector<HTMLButtonElement>('.update-reload')!;
    const later = notice.querySelector<HTMLButtonElement>('.update-later')!;
    let reloadRequested = false;
    let workerActivated = false;
    let controlled = Boolean(navigator.serviceWorker.controller);

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        const previouslyControlled = controlled;
        controlled = Boolean(navigator.serviceWorker.controller);
        if (!controlled || (!previouslyControlled && !reloadRequested)) return;
        // Another open game can activate the shared worker. Keep this adventure running.
        workerActivated = true;
        if (reloadRequested) window.location.reload();
        else notice.hidden = false;
    });

    const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
            notice.hidden = false;
        },
        onNeedReload() {
            // Handle controllerchange ourselves, including updates after a first-ever install.
        },
        onRegisteredSW(_url, registration) {
            if (!registration) return;
            let checking = false;
            const check = async () => {
                if (checking || document.hidden || !navigator.onLine || registration.installing) return;
                checking = true;
                try {
                    await registration.update();
                } catch {
                    // Offline or unavailable server: keep the cached adventure playable.
                } finally {
                    checking = false;
                }
            };
            window.addEventListener('focus', check);
            window.addEventListener('online', check);
            document.addEventListener('visibilitychange', check);
            window.setInterval(check, UPDATE_CHECK_INTERVAL);
            void check();
        }
    });

    reload.onclick = async () => {
        if (reloadRequested) return;
        reloadRequested = true;
        if (workerActivated) {
            window.location.reload();
            return;
        }
        reload.disabled = true;
        later.disabled = true;
        reload.textContent = 'Laddar om…';
        try {
            await updateSW();
        } catch {
            reloadRequested = false;
            reload.disabled = false;
            later.disabled = false;
            reload.textContent = 'Försök igen';
        }
    };
    later.onclick = () => {
        notice.hidden = true;
    };
    // Keyboard use of the notice must not also trigger gameplay actions.
    notice.addEventListener('keydown', (event) => event.stopPropagation());
}
