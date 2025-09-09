/* eslint-disable sort-imports */
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { App } from './components/app/app.component';
import { history } from './history';
import * as serviceWorker from './serviceWorker';
import { createStore } from './store/app.store';
import { appTheme } from './theme/app.theme';

const appStore = createStore(history, true);

const Root: React.FC = () => (
  <Router history={history}>
    <Provider store={appStore}>
      <ThemeProvider theme={appTheme}>
        <App />
      </ThemeProvider>
    </Provider>
  </Router>
);

ReactDOM.render(<Root />, document.getElementById('root'));

serviceWorker.register();
