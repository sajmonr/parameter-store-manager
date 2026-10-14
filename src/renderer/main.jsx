import React from 'react';
import { createRoot } from 'react-dom/client';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import 'antd/dist/reset.css';

import App from './App';
import configureStore from './store/configureStore';
import { getAllSettings, loadSettings, onSettingsChange } from './settings';
import { actions as settingsActions } from './ducks/settings';
import './app.global.css';

TimeAgo.addDefaultLocale(en);

loadSettings().then(() => {
  const store = configureStore();
  store.dispatch(settingsActions.settingsChanged(getAllSettings()));
  onSettingsChange(settings =>
    store.dispatch(settingsActions.settingsChanged(settings))
  );

  createRoot(document.getElementById('root')).render(<App store={store} />);
});
