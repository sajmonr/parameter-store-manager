// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../../test/mockServices';
import type { ParameterEntry } from '../../state/parameters';
import { PageVisibleContext } from '../../hooks/usePageVisible';
import { SOURCE_CHANGED, useExportStore } from '../../state/export';
import { useSettingsStore } from '../../state/settings';
import { uiActions } from '../../state/ui';
import { renderWithProviders } from '../../test/render';
import { createTestState, makeParameter } from '../../test/testState';
import ExportForm from './ExportForm';

vi.mock('../../services', () => import('../../test/mockServices'));

const parameters = [
  makeParameter('/app/prod/db/Password', {
    Type: 'SecureString',
    Value: 'hunter2',
    KeyId: 'alias/aws/ssm',
    Description: 'DB password'
  }),
  makeParameter('/app/prod/Title'),
  makeParameter('/app/dev/db/Password', {
    Type: 'SecureString',
    Value: 'dev-secret',
    KeyId: 'alias/dev'
  }),
  makeParameter('/other/Flag')
];

// `loaded` is what the app shows; AWS serves `parameters` unless told otherwise.
const setup = ({
  scope = '',
  loaded = parameters
}: { scope?: string; loaded?: ParameterEntry[] } = {}) => {
  const queryClient = createTestState({
    parameters: loaded,
    settings: { profile: 'prod', ssmRegion: 'eu-west-1' }
  });
  if (scope) uiActions.setScope(scope);
  return renderWithProviders(<ExportForm />, { queryClient });
};

// The form on a page that can be hidden and shown again.
const Page = ({ visible }: { visible: boolean }) => (
  <PageVisibleContext.Provider value={visible}>
    <ExportForm />
  </PageVisibleContext.Provider>
);

const status = () => screen.getByRole('status');
// A finished loading state leaves antd's icon behind in jsdom, which has no
// animations to end it.
const exportButton = () =>
  screen.getByRole('button', { name: /^(loading )?Export$/ });
const cancelButton = () => screen.queryByRole('button', { name: 'Cancel' });
const running = () => useExportStore.getState().running;
const savedCsv = () => api.filesService.saveCsv.mock.calls[0]!;
const exported = async () => {
  await waitFor(() => expect(api.filesService.saveCsv).toHaveBeenCalled());
  return savedCsv();
};
const fetchedNames = () =>
  api.parametersService.getValues.mock.calls.flatMap(([names]) => names);
const decrypted = () =>
  api.parametersService.getValues.mock.calls.map(([, decrypt]) => decrypt);

beforeEach(() => {
  vi.clearAllMocks();
  api.serveParameters(parameters);
  api.filesService.saveCsv.mockResolvedValue('/Downloads/export.csv');
  api.accountService.getId.mockResolvedValue('123456789012');
});

describe('ExportForm', () => {
  it('exports every parameter from AWS, leaving SecureString values out by default', async () => {
    const user = userEvent.setup();
    setup();

    expect(status()).toHaveTextContent(
      '4 parameters match, 2 of them SecureString.'
    );
    expect(
      screen.queryByText('SecureString values are exported as plain text')
    ).not.toBeInTheDocument();
    // Cancel only stops a running export.
    expect(cancelButton()).not.toBeInTheDocument();
    await user.click(exportButton());

    const [fileName, content] = await exported();
    expect(api.parametersService.describe).toHaveBeenCalledWith(
      undefined,
      undefined
    );
    // Every name is checked, but nothing is decrypted.
    expect(fetchedNames()).toHaveLength(4);
    expect(new Set(decrypted())).toEqual(new Set([false]));
    expect(fileName).toMatch(
      /^ssm-parameters_123456789012_eu-west-1_[\d_-]+\.csv$/
    );
    expect(content).toBe(
      'name,value,type,description,kmsKey\r\n' +
        '/app/dev/db/Password,,SecureString,,alias/dev\r\n' +
        '/app/prod/Title,value of /app/prod/Title,String,,\r\n' +
        '/app/prod/db/Password,,SecureString,DB password,alias/aws/ssm\r\n' +
        '/other/Flag,value of /other/Flag,String,,\r\n'
    );
    expect(
      await screen.findByText('Exported 4 parameters')
    ).toBeInTheDocument();
    expect(running()).toBe(false);
    expect(cancelButton()).not.toBeInTheDocument();
  });

  it('decrypts SecureString values when asked to, with a warning', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(
      screen.getByRole('checkbox', { name: 'Include SecureString values' })
    );
    expect(
      screen.getByText('SecureString values are exported as plain text')
    ).toBeInTheDocument();
    await user.click(exportButton());

    const [, content] = await exported();
    expect(fetchedNames()).toHaveLength(4);
    expect(new Set(decrypted())).toEqual(new Set([true]));
    expect(content).toContain(
      '/app/prod/db/Password,hunter2,SecureString,DB password,alias/aws/ssm\r\n'
    );
  });

  it('exports the names under a glob path, filtered by AWS on its literal part', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('radio', { name: 'By path' }));
    expect(status()).toHaveTextContent('Enter a path.');
    expect(exportButton()).toBeDisabled();

    await user.type(
      screen.getByRole('combobox', { name: 'Path' }),
      '/app/*/db'
    );
    await waitFor(() =>
      expect(status()).toHaveTextContent(
        '2 parameters match, 2 of them SecureString.'
      )
    );
    await user.click(exportButton());

    const [fileName, content] = await exported();
    expect(api.parametersService.describe).toHaveBeenCalledWith(
      undefined,
      '/app/'
    );
    expect(fileName).toMatch(/_eu-west-1_app-db_/);
    expect(content.split('\r\n').slice(1, -1)).toEqual([
      '/app/dev/db/Password,,SecureString,,alias/dev',
      '/app/prod/db/Password,,SecureString,DB password,alias/aws/ssm'
    ]);
  });

  it('exports what AWS has now, not what the app loaded', async () => {
    const user = userEvent.setup();
    setup({ loaded: [makeParameter('/old', { Value: 'stale' })] });
    api.serveParameters([makeParameter('/new', { Value: 'fresh' })]);

    expect(status()).toHaveTextContent('1 parameter match.');
    await user.click(exportButton());

    const [, content] = await exported();
    expect(content).toBe(
      'name,value,type,description,kmsKey\r\n/new,fresh,String,,\r\n'
    );
  });

  it('leaves out parameters deleted while the export runs, SecureStrings too', async () => {
    const user = userEvent.setup();
    setup();
    api.parametersService.getValues.mockResolvedValue({
      parameters: [{ Name: '/app/prod/Title', Value: 'Title', Type: 'String' }],
      invalidParameters: ['/other/Flag', '/app/dev/db/Password']
    });

    await user.click(exportButton());

    const [, content] = await exported();
    expect(content).not.toContain('/other/Flag');
    expect(content).not.toContain('/app/dev/db/Password');
    expect(
      await screen.findByText('Exported 2 parameters')
    ).toBeInTheDocument();
  });

  it('leaves out the value of a String recreated as a SecureString since it was listed', async () => {
    const user = userEvent.setup();
    setup({ loaded: [makeParameter('/x')] });
    api.serveParameters([makeParameter('/x')]);
    api.parametersService.getValues.mockResolvedValue({
      parameters: [{ Name: '/x', Value: 'ciphertext', Type: 'SecureString' }],
      invalidParameters: []
    });

    await user.click(exportButton());

    const [, content] = await exported();
    expect(decrypted()).toEqual([false]);
    expect(content).toBe(
      'name,value,type,description,kmsKey\r\n/x,,SecureString,,\r\n'
    );
  });

  it('stops when the profile or region changes during the export', async () => {
    const user = userEvent.setup();
    setup();
    api.parametersService.getValues.mockImplementation(async () => {
      useSettingsStore.setState({ ssmRegion: 'us-west-2' });
      return { parameters: [], invalidParameters: [] };
    });

    await user.click(exportButton());

    expect(await screen.findByText(SOURCE_CHANGED)).toBeInTheDocument();
    expect(api.filesService.saveCsv).not.toHaveBeenCalled();
    expect(running()).toBe(false);
  });

  it("can't be cancelled while the file is being saved", async () => {
    const user = userEvent.setup();
    let finishSave!: (path: string | null) => void;
    api.filesService.saveCsv.mockReturnValue(
      new Promise(resolve => {
        finishSave = resolve;
      })
    );
    setup();

    await user.click(exportButton());

    await exported();
    await waitFor(() => expect(cancelButton()).toBeDisabled());
    await act(async () => finishSave('/Downloads/export.csv'));
    expect(running()).toBe(false);
    expect(cancelButton()).not.toBeInTheDocument();
  });

  it('names the file after the profile when the account is unknown', async () => {
    const user = userEvent.setup();
    api.accountService.getId.mockRejectedValue(new Error('offline'));
    setup();

    await user.click(exportButton());

    const [fileName] = await exported();
    expect(fileName).toMatch(/^ssm-parameters_prod_eu-west-1_/);
  });

  it('starts from the scoped folder and suggests its subfolders', async () => {
    const user = userEvent.setup();
    setup({ scope: '/app/' });

    const input = screen.getByRole('combobox', { name: 'Path' });
    expect(input).toHaveValue('/app/');
    expect(status()).toHaveTextContent('3 parameters match');

    await user.click(input);
    const options = await screen.findAllByRole('option');
    expect(options.map(o => o.textContent)).toEqual(
      expect.arrayContaining(['/app/dev/', '/app/prod/'])
    );
    expect(screen.queryByText('/other/')).not.toBeInTheDocument();
  });

  it('starts over from the current folder each time the page is shown', async () => {
    const user = userEvent.setup();
    const queryClient = createTestState({ parameters });
    const { rerender } = renderWithProviders(<Page visible />, {
      queryClient
    });
    expect(screen.getByRole('radio', { name: 'All parameters' })).toBeChecked();
    await user.click(
      screen.getByRole('checkbox', { name: 'Include SecureString values' })
    );

    rerender(<Page visible={false} />);
    act(() => uiActions.setScope('/app/prod/'));
    rerender(<Page visible />);

    expect(screen.getByRole('combobox', { name: 'Path' })).toHaveValue(
      '/app/prod/'
    );
    expect(
      screen.getByRole('checkbox', { name: 'Include SecureString values' })
    ).not.toBeChecked();
  });

  it('keeps the form as it was when the page is shown during an export', async () => {
    const user = userEvent.setup();
    api.parametersService.describe.mockReturnValue(new Promise(() => {}));
    const queryClient = createTestState({ parameters });
    const { rerender } = renderWithProviders(<Page visible />, {
      queryClient
    });

    await user.click(exportButton());
    rerender(<Page visible={false} />);
    act(() => uiActions.setScope('/app/prod/'));
    rerender(<Page visible />);

    expect(running()).toBe(true);
    expect(screen.getByRole('radio', { name: 'All parameters' })).toBeChecked();
  });

  it('shows progress, and Cancel stops the export', async () => {
    const user = userEvent.setup();
    let resolvePage!: (
      page: Awaited<ReturnType<typeof api.parametersService.describe>>
    ) => void;
    api.parametersService.describe.mockReturnValue(
      new Promise(resolve => {
        resolvePage = resolve;
      })
    );
    setup();

    await user.click(exportButton());
    await user.click(cancelButton()!);

    expect(running()).toBe(false);
    expect(cancelButton()).not.toBeInTheDocument();
    await waitFor(() =>
      expect(exportButton()).not.toHaveClass('ant-btn-loading')
    );
    expect(exportButton()).toBeEnabled();
    await act(async () => resolvePage({ parameters }));
    expect(api.parametersService.getValues).not.toHaveBeenCalled();
    expect(api.filesService.saveCsv).not.toHaveBeenCalled();
  });

  it('says nothing when the save dialog is cancelled', async () => {
    const user = userEvent.setup();
    api.filesService.saveCsv.mockResolvedValue(null);
    setup();

    await user.click(exportButton());

    await exported();
    await waitFor(() => expect(running()).toBe(false));
    expect(screen.queryByText(/^Exported/)).not.toBeInTheDocument();
  });
});
