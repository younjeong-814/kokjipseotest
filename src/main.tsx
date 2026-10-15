import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/tokens.css';
import './styles/global.css';
import './styles/screens.css';
import './styles/recognition.css';
import './styles/recognition-overlays.css';
import './styles/manual-entry.css';
import './styles/recipe.css';
import './styles/fridge-search.css';
// Retire the previous, unrequested ingredient storage and its test entries.
try {
  localStorage.removeItem('kokjipseo.ingredients.v1');
} catch { /* Storage may be blocked. The UI remains empty. */ }
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
