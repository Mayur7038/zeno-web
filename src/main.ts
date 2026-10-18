import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app.component';

bootstrapApplication(App, appConfig)
  .then(() => {
    console.log('✅ Zeno Books Angular App successfully bootstrapped!');
  })
  .catch((err) => console.error('❌ Bootstrap error:', err));
