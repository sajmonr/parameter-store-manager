import React from 'react';
import { render } from 'react-dom';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import 'antd/dist/antd.css';

import App from './App';
import configureStore from './store/configureStore';
import { loadSettings } from './settings';
import './app.global.css';

TimeAgo.addDefaultLocale(en);

loadSettings().then(() => {
  render(<App store={configureStore()} />, document.getElementById('root'));
});
