import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { initCivicDensity } from '@/composables/useCivicDensity';
import { initDashboardLayout } from '@/composables/useDashboardLayout';
import './style.css';

initCivicDensity();
initDashboardLayout();

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
