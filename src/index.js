import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './app/App';
import reportWebVitals from './lib/reportWebVitals';

const container = document.getElementById('root');
const bootstrap = document.getElementById('site-bootstrap');
let publicData;
try {
  const data = JSON.parse(bootstrap?.textContent || 'null');
  if (data && Array.isArray(data.skills) && Array.isArray(data.projects) && Array.isArray(data.posts)) publicData = data;
} catch (_) { /* Use the site data API if the initial data is unavailable. */ }

const canHydrate = container.dataset.rendered === 'true' && publicData;
const props = canHydrate ? {
  initialLanguage: document.documentElement.lang,
  initialTheme: document.documentElement.dataset.theme
} : { hasHomePreview: Boolean(container.querySelector('#home')) };
const app = (
  <React.StrictMode>
    <App publicData={publicData} partialData={bootstrap?.dataset.partial === 'true'} {...props} />
  </React.StrictMode>
);
if (canHydrate) ReactDOM.hydrateRoot(container, app);
else ReactDOM.createRoot(container).render(app);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
