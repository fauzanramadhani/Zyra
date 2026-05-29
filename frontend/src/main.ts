import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './style.css';

// Apply saved theme before mount to prevent flash
const savedTheme = localStorage.getItem('zyra-theme') || 'light';
document.documentElement.classList.remove('light', 'dark');
document.documentElement.classList.add(savedTheme);

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

app.mount('#app');
