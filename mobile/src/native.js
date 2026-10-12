import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

if (Capacitor.getPlatform() === 'android') {
  App.addListener('backButton', () => {
    if (!document.getElementById('study').hidden) {
      document.getElementById('back-to-decks').click();
    } else {
      App.exitApp();
    }
  }).catch(error => console.error('Unable to register Android Back button', error));
}
