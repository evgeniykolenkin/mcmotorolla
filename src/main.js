import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import { definePreset } from '@primevue/themes'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import ru from 'primelocale/ru.json'

import 'primeicons/primeicons.css'
import './styles/base.css'

import App from './App.vue'
import router from './router'
import { applyInitialTheme } from './composables/useTheme'

/** Фиолетовый акцент в духе Twitch поверх пресета Aura. */
const AppPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f6f2ff',
      100: '#ebe1ff',
      200: '#d6c2ff',
      300: '#b794ff',
      400: '#9d67ff',
      500: '#9146ff',
      600: '#7b2ff0',
      700: '#6821d1',
      800: '#541ba8',
      900: '#421586',
      950: '#2a0c5c'
    }
  }
})

applyInitialTheme()

createApp(App)
  .use(router)
  .use(PrimeVue, {
    theme: {
      preset: AppPreset,
      options: {
        darkModeSelector: '.p-dark',
        cssLayer: false
      }
    },
    ripple: true,
    locale: ru
  })
  .use(ToastService)
  .use(ConfirmationService)
  .directive('tooltip', Tooltip)
  .mount('#app')

