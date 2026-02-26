import { render } from 'solid-js/web';
import { MetaProvider } from '@solidjs/meta';
import { Router } from '@solidjs/router';
import { Provider as UrqlProvider } from '@urql/solid';
import { urqlClient } from './api/graphql';
import './assets/styles/main.css';
import App from './App';

// 渲染应用
render(
  () => (
    <MetaProvider>
      <UrqlProvider value={urqlClient}>
        <Router>
          <App />
        </Router>
      </UrqlProvider>
    </MetaProvider>
  ),
  document.getElementById('app')!
);
