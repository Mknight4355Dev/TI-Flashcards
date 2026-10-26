'use strict';
(function () {
  const invitation = document.getElementById('install-invitation');
  const action = document.getElementById('install-action');
  const title = document.getElementById('install-title');
  const description = document.getElementById('install-description');
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
  let offlineState = 'checking';
  let updateWaiting = false;
  let pendingCheck = null;
  function withTimeout(promise, milliseconds) {
    let timer;
    return Promise.race([
      promise,
      new Promise(resolve => { timer = setTimeout(() => resolve(null), milliseconds); })
    ]).finally(() => clearTimeout(timer));
  }
  function showStatus() {
    const messages = [];
    if (offlineState === 'ready') messages.push('All decks are ready for offline study.');
    else if (offlineState === 'checking') messages.push('Checking offline files…');
    else if (offlineState === 'incomplete') messages.push('Offline setup incomplete. Connect to the internet and keep this page open to finish downloading all decks.');
    else messages.push('Offline download is unavailable in this browser. Online study still works.');
    if (updateWaiting) messages.push('An update is ready. Close and reopen TI Flashcards to use it.');
    status.textContent = messages.join(' ');
    status.hidden = false;
    const ready = offlineState === 'ready';
    title.textContent = ready ? 'Study anywhere, even offline' : 'Add TI Flashcards to your home screen';
    description.textContent = ready
      ? 'Add TI Flashcards to your home screen for quick access, even without an internet connection.'
      : 'Get quick access to your study decks. Offline setup is not complete yet.';
    action.textContent = ready ? 'Install for offline study' : 'Install app';
  }
  try { dismissed = sessionStorage.getItem('ti-flashcards:install-dismissed') === 'yes'; } catch (error) { /* Storage may be disabled. */ }
  showStatus();

  function showInvitation() {
    if (!hasStudied || dismissed || standalone() || invitation.hidden === false) return;
    if (!installPrompt && !iosSafari && !android) return;
    invitation.hidden = false;
  }
  document.addEventListener('ti-flashcards:study-started', () => { hasStudied = true; showInvitation(); if (registration) checkOffline(registration); });
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

  let registration = null;
  async function checkOffline(activeRegistration) {
    if (pendingCheck) return pendingCheck;
    offlineState = 'checking';
    showStatus();
    pendingCheck = (async () => {
      const ready = await withTimeout(navigator.serviceWorker.ready, 8000);
      const worker = navigator.serviceWorker.controller || (ready && ready.active) || activeRegistration.active;
      if (!worker) return false;
      const channel = new MessageChannel();
      try {
        return await new Promise(resolve => {
          const timer = setTimeout(() => resolve(false), 10000);
          channel.port1.onmessage = event => { clearTimeout(timer); resolve(event.data && event.data.ready === true); };
          worker.postMessage('ENSURE_OFFLINE', [channel.port2]);
        });
      } finally { channel.port1.close(); }
    })().catch(() => false).then(ready => {
      offlineState = ready ? 'ready' : 'incomplete';
      showStatus();
    }).finally(() => { pendingCheck = null; });
    return pendingCheck;
  }

  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    offlineState = 'unavailable';
    showStatus();
    return;
  }
  navigator.serviceWorker.register('sw.js').then(activeRegistration => {
    registration = activeRegistration;
    window.addEventListener('online', () => {
      registration.update().catch(() => {});
      checkOffline(registration);
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) checkOffline(registration);
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => checkOffline(registration));
    navigator.serviceWorker.ready.then(() => checkOffline(registration)).catch(() => {});
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
    checkOffline(registration);
  }).catch(() => {
    offlineState = 'incomplete';
    showStatus();
  });
}());
