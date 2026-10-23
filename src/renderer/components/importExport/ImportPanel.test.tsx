// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../../test/mockServices';
import { renderWithProviders } from '../../test/render';
import { createTestState, makeParameter } from '../../test/testState';
import { NOT_AN_EXPORT } from '../../utils/importFile';
import ImportPanel from './ImportPanel';

vi.mock('../../services', () => import('../../test/mockServices'));

const loaded = [
  makeParameter('/app/Same', { Value: 'same' }),
  makeParameter('/app/Changed', { Value: 'old' }),
  makeParameter('/app/Typed', { Value: 'x' })
];

const exportFile = (extra: object = {}) =>
  JSON.stringify({
    format: 'parameter-store-manager',
    version: 1,
    exportedAt: '2026-10-14T09:12:00Z',
    region: 'us-east-1',
    decrypted: false,
    parameters: [
      {
        name: '/app/New',
        type: 'String',
        value: 'n',
        description: 'New one',
        keyId: null
      },
      {
        name: '/app/Same',
        type: 'String',
        value: 'same',
        description: '',
        keyId: null
      },
      {
        name: '/app/Changed',
        type: 'String',
        value: 'new',
        description: '',
        keyId: null
      },
      {
        name: '/app/Secret',
        type: 'SecureString',
        value: null,
        description: '',
        keyId: null
      },
      {
        name: '/app/Typed',
        type: 'SecureString',
        value: 'x',
        description: '',
        keyId: null
      }
    ],
    ...extra
  });

const setup = () => {
  const queryClient = createTestState({ parameters: loaded });
  return renderWithProviders(<ImportPanel />, { queryClient });
};

const upload = async (
  user: ReturnType<typeof userEvent.setup>,
  content: string,
  name = 'backup.json'
) => {
  const input = document.querySelector<HTMLInputElement>('input[type=file]')!;
  await user.upload(
    input,
    new File([content], name, { type: 'application/json' })
  );
};

const importButton = () =>
  screen.getByRole('button', {
    name: /^(loading )?(Import \d+ parameters?|Nothing to import|Importing .*)$/
  });
const rowOf = (name: string) =>
  within(screen.getByRole('list', { name: 'Parameters in the file' }))
    .getByText(name)
    .closest('li')!;

beforeEach(() => {
  vi.clearAllMocks();
  api.parametersService.put.mockResolvedValue({ version: 1 });
  api.serveParameters(loaded);
});

describe('ImportPanel', () => {
  it('starts on JSON, with CSV importable too', async () => {
    const user = userEvent.setup();
    setup();

    expect(screen.getByRole('radio', { name: /^JSON/ })).toBeChecked();
    expect(
      screen.getByText('Drop a .json file here, or', { exact: false })
    ).toBeVisible();
    await user.click(screen.getByRole('radio', { name: /^CSV/ }));
    expect(
      screen.getByText('Drop a .csv file here, or', { exact: false })
    ).toBeVisible();
  });

  it.each([
    ['a file that isn’t JSON', 'name,value', NOT_AN_EXPORT],
    ['another app’s JSON', '{"parameters": []}', NOT_AN_EXPORT],
    [
      'invalid entries',
      exportFile({
        parameters: [{ name: 'app/x', type: 'String', value: 'v' }]
      }),
      "1 entry is invalid: entry 1: app/x doesn't start with /."
    ]
  ])(
    'shows an error for %s and never reviews it',
    async (_, content, error) => {
      const user = userEvent.setup();
      setup();

      await upload(user, content);

      expect(await screen.findByText(error)).toBeVisible();
      expect(
        screen.queryByRole('list', { name: 'Parameters in the file' })
      ).not.toBeInTheDocument();
      await user.click(
        screen.getByRole('button', { name: 'Choose another file' })
      );
      expect(
        screen.getByText('Drop a .json file here, or', { exact: false })
      ).toBeVisible();
    }
  );

  it('compares the file with the loaded parameters', async () => {
    const user = userEvent.setup();
    setup();

    await upload(user, exportFile());

    expect(await screen.findByText('backup.json')).toBeVisible();
    expect(
      screen.getByText(/^5 parameters · exported .* · us-east-1$/)
    ).toBeVisible();
    const summary = within(screen.getByLabelText('Summary'));
    expect(summary.getByText('1 new')).toBeVisible();
    expect(summary.getByText('1 changed')).toBeVisible();
    expect(summary.getByText('1 unchanged')).toBeVisible();
    expect(summary.getByText('1 skipped')).toBeVisible();
    expect(summary.getByText('1 type change')).toBeVisible();
    expect(within(rowOf('/app/New')).getByText('new')).toBeVisible();
    expect(
      within(rowOf('/app/Secret')).getByLabelText('SecureString')
    ).toBeVisible();
    // The same region needs no note.
    expect(
      screen.queryByText(/This file was exported from/)
    ).not.toBeInTheDocument();
  });

  it('notes a file from another region', async () => {
    const user = userEvent.setup();
    setup();

    await upload(user, exportFile({ region: 'eu-west-1' }));

    expect(
      await screen.findByText(
        'This file was exported from eu-west-1. Parameters will be imported into us-east-1.'
      )
    ).toBeVisible();
  });

  it('imports new parameters only, unless Overwrite is on', async () => {
    const user = userEvent.setup();
    setup();
    await upload(user, exportFile());

    await screen.findByText('backup.json');
    expect(importButton()).toHaveTextContent('Import 1 parameter');
    expect(rowOf('/app/Changed')).toHaveClass(/dimmed/);
    await user.click(
      screen.getByRole('switch', {
        name: 'Overwrite parameters that already exist with a different value'
      })
    );
    expect(rowOf('/app/Changed')).not.toHaveClass(/dimmed/);
    expect(importButton()).toHaveTextContent('Import 2 parameters');
    await user.click(importButton());

    expect(
      await screen.findByText('Imported 2 parameters')
    ).toBeInTheDocument();
    const requests = api.parametersService.put.mock.calls.map(([r]) => r);
    expect(requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: '/app/New',
          description: 'New one',
          overwrite: false
        }),
        expect.objectContaining({
          name: '/app/Changed',
          value: 'new',
          overwrite: true
        })
      ])
    );
    expect(requests).toHaveLength(2);
    // Back to step 1, with the parameters loaded again.
    await waitFor(() =>
      expect(
        screen.getByText('Drop a .json file here, or', { exact: false })
      ).toBeVisible()
    );
    expect(api.parametersService.describe).toHaveBeenCalled();
  });

  it('says there is nothing to import when every entry is already there', async () => {
    const user = userEvent.setup();
    setup();

    await upload(
      user,
      exportFile({
        parameters: [{ name: '/app/Same', type: 'String', value: 'same' }]
      })
    );

    await screen.findByText('backup.json');
    expect(importButton()).toHaveTextContent('Nothing to import');
    expect(importButton()).toBeDisabled();
  });

  it('marks the failed rows and retries them', async () => {
    const user = userEvent.setup();
    setup();
    api.parametersService.put.mockImplementation(async ({ name }) => {
      if (name === '/app/Changed') {
        throw Object.assign(new Error('Not allowed'), {
          name: 'AccessDeniedException',
          code: 'AccessDeniedException'
        });
      }
      return { version: 1 };
    });
    await upload(user, exportFile());
    await screen.findByText('backup.json');
    await user.click(screen.getByRole('switch', { name: /^Overwrite/ }));

    await user.click(importButton());

    expect(await screen.findByText('Imported 1 of 2. 1 failed.')).toBeVisible();
    expect(within(rowOf('/app/Changed')).getByText('failed')).toBeVisible();
    await user.hover(rowOf('/app/Changed'));
    expect(
      await screen.findByText('AccessDeniedException: Not allowed')
    ).toBeInTheDocument();
    // The one that was written is now unchanged.
    expect(within(rowOf('/app/New')).getByText('unchanged')).toBeVisible();

    api.parametersService.put.mockResolvedValue({ version: 2 });
    api.parametersService.put.mockClear();
    await user.click(screen.getByRole('button', { name: 'Retry failed' }));

    expect(await screen.findByText('Imported 1 parameter')).toBeInTheDocument();
    expect(api.parametersService.put.mock.calls.map(([r]) => r.name)).toEqual([
      '/app/Changed'
    ]);
  });

  it('closes the file and goes back to step 1', async () => {
    const user = userEvent.setup();
    setup();
    await upload(user, exportFile());
    await screen.findByText('backup.json');

    await user.click(screen.getByRole('button', { name: 'Close file' }));

    expect(
      screen.getByText('Drop a .json file here, or', { exact: false })
    ).toBeVisible();
    expect(api.parametersService.put).not.toHaveBeenCalled();
  });

  it('imports a CSV export, listing StringLists as unsupported', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('radio', { name: /^CSV/ }));

    await upload(
      user,
      'name,value,type,description,kmsKey\r\n' +
        '/app/New,"a, b",String,Fresh,\r\n' +
        '/app/Same,same,String,,\r\n' +
        '/app/Secret,,SecureString,,alias/aws/ssm\r\n' +
        '/app/Hosts,"h1,h2",StringList,,\r\n',
      'parameters.csv'
    );

    expect(await screen.findByText('parameters.csv')).toBeVisible();
    // A CSV has no export time or region.
    expect(screen.getByText('4 parameters')).toBeVisible();
    const summary = within(screen.getByLabelText('Summary'));
    expect(summary.getByText('1 new')).toBeVisible();
    expect(summary.getByText('1 skipped')).toBeVisible();
    expect(summary.getByText('1 unsupported')).toBeVisible();
    expect(within(rowOf('/app/Hosts')).getByText('unsupported')).toBeVisible();

    await user.click(importButton());

    expect(await screen.findByText('Imported 1 parameter')).toBeInTheDocument();
    expect(api.parametersService.put.mock.calls.map(([r]) => r)).toEqual([
      {
        name: '/app/New',
        type: 'String',
        value: 'a, b',
        description: 'Fresh',
        kmsKey: undefined,
        overwrite: false
      }
    ]);
  });

  it('reads a file as the format its extension names', async () => {
    const user = userEvent.setup();
    setup();

    await upload(
      user,
      'name,value,type,description,kmsKey\r\n/app/New,n,String,,\r\n',
      'parameters.csv'
    );

    expect(await screen.findByText('parameters.csv')).toBeVisible();
    expect(screen.getByRole('radio', { name: /^CSV/ })).toBeChecked();
  });
});
