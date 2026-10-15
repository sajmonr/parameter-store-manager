import React from 'react';
import { createRoot } from 'react-dom/client';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import 'antd/dist/reset.css';

import App from './App';
import { createQueryClient } from './state/queryClient';
import { loadSettings } from './state/settings';
import './app.global.css';

TimeAgo.addDefaultLocale(en);

loadSettings().then(() => {
  createRoot(document.getElementById('root')).render(
    <App queryClient={createQueryClient()} />
  );
});
