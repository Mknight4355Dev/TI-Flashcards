'use strict';
(function () {
  const invitation = document.getElementById('install-invitation');
  const action = document.getElementById('install-action');
  const help = document.getElementById('install-help');
  const status = document.getElementById('offline-status');
  const agent = navigator.userAgent;
  const iosDevice = /iPhone|iPad|iPod/.test(agent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const iosSafari = iosDevice && /Safari/.test(agent) && !/CriOS|FxiOS|EdgiOS/.test(agent);
  const android = /Android/.test(agent);
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let installPrompt = null;
  let hasStudied = false;
  let dismissed = false;
  let offlineReady = false;
  let updateWaiting = false;
  function showStatus() {
    const messages = [];
    if (offlineReady) messages.push('All decks are ready for offline study.');
    if (updateWaiting) messages.push('An update is ready. Close and reopen TI Flashcards to use it.');
    status.textContent = messages.join(' ');
    status.hidden = messages.length === 0;
  }
  try { dismissed = sessionStorage.getItem('ti-flashcards:install-dismissed') === 'yes'; } catch (error) { /* Storage may be disabled. */ }

  function showInvitation() {
    if (!hasStudied || dismissed || standalone() || invitation.hidden === false) return;
    if (!installPrompt && !iosSafari && !android) return;
    invitation.hidden = false;
  }
  document.addEventListener('ti-flashcards:study-started', () => { hasStudied = true; showInvitation(); });
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    showInvitation();
  });
  window.addEventListener('appinstalled', () => { invitation.hidden = true; installPrompt = null; });
  document.getElementById('install-dismiss').addEventListener('click', () => {
    invitation.hidden = true;
    dismissed = true;
    try { sessionStorage.setItem('ti-flashcards:install-dismissed', 'yes'); } catch (error) { /* Storage may be disabled. */ }
  });
  action.addEventListener('click', async () => {
    if (installPrompt) {
      const prompt = installPrompt;
      installPrompt = null;
      try {
        await prompt.prompt();
        const result = await prompt.userChoice;
        if (result.outcome === 'accepted') invitation.hidden = true;
        else help.textContent = android ? 'Use your browser menu and choose Install app or Add to Home screen.' : 'Use your browser install option to add this app.';
      } catch (error) {
        help.textContent = 'Use your browser menu to add this app to your home screen.';
      }
    } else {
      help.textContent = iosSafari
        ? 'In Safari, tap Share, then Add to Home Screen.'
        : 'Open your browser menu and choose Install app or Add to Home screen.';
    }
    help.hidden = false;
  });

  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  navigator.serviceWorker.register('sw.js').then(async registration => {
    window.addEventListener('online', () => registration.update().catch(() => {}));
    if (registration.waiting && navigator.serviceWorker.controller) {
      updateWaiting = true;
      showStatus();
    }
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          updateWaiting = true;
          showStatus();
        }
      });
    });
    const ready = await navigator.serviceWorker.ready;
    const worker = navigator.serviceWorker.controller || ready.active;
    if (!worker) return;
    const channel = new MessageChannel();
    const verified = await new Promise(resolve => {
      const timer = setTimeout(() => resolve(false), 5000);
      channel.port1.onmessage = event => { clearTimeout(timer); resolve(event.data && event.data.ready === true); };
      worker.postMessage('VERIFY_OFFLINE', [channel.port2]);
    });
    channel.port1.close();
    offlineReady = verified;
    showStatus();
  }).catch(() => { /* Online study remains available when offline setup fails. */ });
}());
