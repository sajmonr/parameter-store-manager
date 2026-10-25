// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../../test/mockServices';
import type { ParameterEntry } from '../../state/parameters';
import { PageVisibleContext } from '../../hooks/usePageVisible';
import { SOURCE_CHANGED, useExportStore } from '../../state/export';
import { useSettingsStore } from '../../state/settings';
import { uiActions } from '../../state/ui';
import { renderWithProviders } from '../../test/render';
import { createTestState, makeParameter } from '../../test/testState';
import { parseJsonExport } from '../../utils/jsonExport';
import ExportPanel from './ExportPanel';

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
  return renderWithProviders(<ExportPanel />, { queryClient });
};

// The panel on a page that can be hidden and shown again.
const Page = ({ visible }: { visible: boolean }) => (
  <PageVisibleContext.Provider value={visible}>
    <ExportPanel />
  </PageVisibleContext.Provider>
);

const count = () => screen.getByRole('status');
// A finished loading state leaves antd's icon behind in jsdom, which has no
// animations to end it.
const exportButton = () =>
  screen.getByRole('button', { name: /^(loading )?Export .* as \w+$/ });
const cancelButton = () => screen.queryByRole('button', { name: 'Cancel' });
const pathInput = () => screen.getByRole('combobox', { name: 'Path or glob' });
const decryptSwitch = () =>
  screen.getByRole('switch', { name: 'Decrypt SecureString values' });
const format = (name: string) =>
  screen.getByRole('radio', { name: new RegExp(`^${name}`) });
const running = () => useExportStore.getState().running;
const saved = () => api.filesService.save.mock.calls[0]!;
const exported = async () => {
  await waitFor(() => expect(api.filesService.save).toHaveBeenCalled());
  return saved();
};
const fetchedNames = () =>
  api.parametersService.getValues.mock.calls.flatMap(([names]) => names);
const decrypted = () =>
  api.parametersService.getValues.mock.calls.map(([, decrypt]) => decrypt);

beforeEach(() => {
  vi.clearAllMocks();
  api.serveParameters(parameters);
  api.filesService.save.mockResolvedValue('/Downloads/export.csv');
  api.accountService.getId.mockResolvedValue('123456789012');
});

describe('ExportPanel', () => {
  it('exports every parameter as CSV, leaving SecureString values out by default', async () => {
    const user = userEvent.setup();
    setup();

    expect(format('CSV')).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'All parameters' }));
    expect(count()).toHaveTextContent('4 parameters');
    expect(
      screen.getByText('name,value,type,description,kmsKey')
    ).toBeVisible();
    expect(
      screen.queryByText('SecureString values are exported as plain text')
    ).not.toBeInTheDocument();
    // Cancel only stops a running export.
    expect(cancelButton()).not.toBeInTheDocument();
    expect(exportButton()).toHaveTextContent('Export 4 parameters as CSV');
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
      await screen.findByText('Saved export.csv (4 parameters)')
    ).toBeInTheDocument();
    expect(running()).toBe(false);
    expect(cancelButton()).not.toBeInTheDocument();
  });

  it('decrypts SecureString values when asked to, with a warning', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(decryptSwitch());
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

  it('exports every field as JSON, without columns to pick', async () => {
    const user = userEvent.setup();
    setup();
    api.filesService.save.mockResolvedValue('/Downloads/backup.json');

    await user.click(format('JSON'));
    expect(screen.queryByText('Columns')).not.toBeInTheDocument();
    expect(screen.getByText('Contents')).toBeVisible();
    await user.click(decryptSwitch());
    await user.click(exportButton());

    const [fileName, content] = await exported();
    expect(fileName).toMatch(
      /^ssm-parameters_123456789012_eu-west-1_.*\.json$/
    );
    expect(content.endsWith('}\n')).toBe(true);
    const file = JSON.parse(content);
    expect(file).toMatchObject({
      format: 'parameter-store-manager',
      version: 1,
      region: 'eu-west-1',
      decrypted: true
    });
    expect(file.exportedAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
    expect(file.parameters).toEqual([
      {
        name: '/app/dev/db/Password',
        type: 'SecureString',
        value: 'dev-secret',
        description: '',
        keyId: 'alias/dev'
      },
      {
        name: '/app/prod/Title',
        type: 'String',
        value: 'value of /app/prod/Title',
        description: '',
        keyId: null
      },
      // The default key is written as null.
      {
        name: '/app/prod/db/Password',
        type: 'SecureString',
        value: 'hunter2',
        description: 'DB password',
        keyId: null
      },
      {
        name: '/other/Flag',
        type: 'String',
        value: 'value of /other/Flag',
        description: '',
        keyId: null
      }
    ]);
    // What it writes, Import reads back.
    expect(parseJsonExport(content)).toMatchObject({ ok: true });
    expect(
      await screen.findByText('Saved backup.json (4 parameters)')
    ).toBeInTheDocument();
  });

  it('writes SecureString values as null in JSON without decryption, and says so', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(format('JSON'));
    expect(
      screen.getByText(/Without decryption, SecureString values are left out/)
    ).toBeVisible();
    await user.click(exportButton());

    const [, content] = await exported();
    const file = JSON.parse(content);
    expect(file.decrypted).toBe(false);
    expect(
      file.parameters.find(
        (p: { name: string }) => p.name === '/app/prod/db/Password'
      )
    ).toMatchObject({ value: null, keyId: null });
  });

  it('leaves StringLists out of JSON, which Import can’t create', async () => {
    const user = userEvent.setup();
    const withList = [
      ...parameters,
      makeParameter('/app/prod/Hosts', { Type: 'StringList', Value: 'a,b' })
    ];
    setup({ loaded: withList });
    api.serveParameters(withList);

    expect(exportButton()).toHaveTextContent('Export 5 parameters as CSV');
    await user.click(format('JSON'));
    expect(exportButton()).toHaveTextContent('Export 4 parameters as JSON');
    await user.click(exportButton());

    const [, content] = await exported();
    expect(content).not.toContain('/app/prod/Hosts');
  });

  it('exports the names a glob matches as a whole, filtered by AWS on its literal part', async () => {
    const user = userEvent.setup();
    setup();

    await user.clear(pathInput());
    expect(exportButton()).toBeDisabled();

    // A glob must match the whole name.
    await user.type(pathInput(), '/app/*/db');
    expect(
      await screen.findByText('No parameters match this path.')
    ).toBeVisible();
    expect(exportButton()).toBeDisabled();

    await user.type(pathInput(), '/*');
    await waitFor(() => expect(count()).toHaveTextContent('2 parameters'));
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

  it('exports everything under a path without wildcards', async () => {
    const user = userEvent.setup();
    setup();

    await user.clear(pathInput());
    await user.type(pathInput(), '/app/prod');
    await waitFor(() => expect(count()).toHaveTextContent('2 parameters'));
  });

  it('previews the first five matches', async () => {
    const many = Array.from({ length: 8 }, (_, i) => makeParameter(`/p/${i}`));
    setup({ loaded: many, scope: '/p/' });

    const preview = screen.getByRole('list', { name: 'Matching parameters' });
    expect(within(preview).getAllByRole('listitem')).toHaveLength(6);
    expect(within(preview).getByText('/p/0')).toBeVisible();
    expect(within(preview).getByText('and 3 more')).toBeVisible();
  });

  it('exports what AWS has now, not what the app loaded', async () => {
    const user = userEvent.setup();
    setup({ loaded: [makeParameter('/old', { Value: 'stale' })] });
    api.serveParameters([makeParameter('/new', { Value: 'fresh' })]);

    expect(count()).toHaveTextContent('1 parameter');
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
      await screen.findByText('Saved export.csv (2 parameters)')
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
    expect(api.filesService.save).not.toHaveBeenCalled();
    expect(running()).toBe(false);
  });

  it("can't be cancelled while the file is being saved", async () => {
    const user = userEvent.setup();
    let finishSave!: (path: string | null) => void;
    api.filesService.save.mockReturnValue(
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

  it('starts from everything under the scoped folder and suggests its subfolders', async () => {
    const user = userEvent.setup();
    setup({ scope: '/app/' });

    expect(pathInput()).toHaveValue('/app/**');
    expect(count()).toHaveTextContent('3 parameters');

    await user.clear(pathInput());
    await user.type(pathInput(), '/app/');
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
    expect(screen.getByRole('radio', { name: 'Path or glob' })).toBeChecked();
    expect(pathInput()).toHaveValue('/**');
    await user.click(screen.getByRole('radio', { name: 'All parameters' }));
    await user.click(decryptSwitch());
    await user.click(format('JSON'));

    rerender(<Page visible={false} />);
    act(() => uiActions.setScope('/app/prod/'));
    rerender(<Page visible />);

    expect(screen.getByRole('radio', { name: 'Path or glob' })).toBeChecked();
    expect(pathInput()).toHaveValue('/app/prod/**');
    expect(decryptSwitch()).not.toBeChecked();
    // The format stays the last one used.
    expect(format('JSON')).toBeChecked();
  });

  it('keeps the form as it was when the page is shown during an export', async () => {
    const user = userEvent.setup();
    api.parametersService.describe.mockReturnValue(new Promise(() => {}));
    const queryClient = createTestState({ parameters });
    const { rerender } = renderWithProviders(<Page visible />, {
      queryClient
    });

    await user.click(screen.getByRole('radio', { name: 'All parameters' }));
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
    expect(api.filesService.save).not.toHaveBeenCalled();
  });

  it("doesn't send the queued value batches after Cancel", async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 60 }, (_, i) => makeParameter(`/p${i}`));
    setup({ loaded: many });
    api.serveParameters(many);
    const inFlight: (() => void)[] = [];
    api.parametersService.getValues.mockImplementation(
      () =>
        new Promise(resolve => {
          inFlight.push(() =>
            resolve({ parameters: [], invalidParameters: [] })
          );
        })
    );

    await user.click(exportButton());
    // 6 batches; the read limit lets 4 run at once.
    await waitFor(() => expect(inFlight).toHaveLength(4));
    await user.click(cancelButton()!);
    await act(async () => inFlight.forEach(resolve => resolve()));

    expect(api.parametersService.getValues).toHaveBeenCalledTimes(4);
    expect(api.filesService.save).not.toHaveBeenCalled();
  });

  it('ignores progress from a batch that finishes after another failed', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 20 }, (_, i) => makeParameter(`/p${i}`));
    setup({ loaded: many });
    api.serveParameters(many);
    let lateBatch!: () => void;
    api.parametersService.getValues
      .mockReturnValueOnce(
        new Promise(resolve => {
          lateBatch = () => resolve({ parameters: [], invalidParameters: [] });
        })
      )
      .mockRejectedValueOnce(new Error('throttled'));

    await user.click(exportButton());
    expect(
      await screen.findByText('Parameters were not exported')
    ).toBeInTheDocument();
    await act(async () => lateBatch());

    expect(useExportStore.getState()).toEqual({
      running: false,
      progress: null
    });
  });

  it('says nothing when the save dialog is cancelled', async () => {
    const user = userEvent.setup();
    api.filesService.save.mockResolvedValue(null);
    setup();

    await user.click(exportButton());

    await exported();
    await waitFor(() => expect(running()).toBe(false));
    expect(screen.queryByText(/^Saved/)).not.toBeInTheDocument();
  });
});
