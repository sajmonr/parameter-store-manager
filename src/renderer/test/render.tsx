import type { ReactElement, ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider } from 'antd';
import { render } from '@testing-library/react';
import { FeedbackBridge } from '../feedback';
import { createTestState } from './testState';

// The providers App.tsx renders around the app.
export const createWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <AntApp>
          <FeedbackBridge />
          {children}
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
  return Wrapper;
};

export const renderWithProviders = (
  ui: ReactElement,
  { queryClient = createTestState() }: { queryClient?: QueryClient } = {}
) => ({
  queryClient,
  ...render(ui, { wrapper: createWrapper(queryClient) })
});
