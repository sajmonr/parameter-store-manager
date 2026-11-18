import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider } from 'antd';
import AppShell from './components/AppShell';
import UpdateNotice from './components/UpdateNotice';
import { FeedbackBridge } from './feedback';
import useMediaQuery from './hooks/useMediaQuery';
import { appTheme } from './theme';

const App = ({ queryClient }: { queryClient: QueryClient }) => {
  // The main process sets nativeTheme.themeSource from the theme setting, and
  // prefers-color-scheme follows it, so this covers both the OS and the setting.
  const dark = useMediaQuery('(prefers-color-scheme: dark)');

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={appTheme(dark)}>
        <AntApp notification={{ placement: 'topRight', duration: 4 }}>
          {/* Must render before AppShell, which shows notifications on mount. */}
          <FeedbackBridge />
          <UpdateNotice />
          <AppShell />
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;
