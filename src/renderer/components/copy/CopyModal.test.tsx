// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_STRUCTURE } from '../../../shared/structure';
import type { Structure } from '../../../shared/structure';
import * as api from '../../test/mockServices';
import { uiActions, useUiStore } from '../../state/ui';
import type { ParameterEntry } from '../../state/parameters';
import { renderWithProviders } from '../../test/render';
import { createTestState, makeParameter } from '../../test/testState';
import DetailHost from '../detail/DetailHost';
import CopyModal from './CopyModal';

vi.mock('../../services', () => import('../../test/mockServices'));

const structure: Structure = {
  ...DEFAULT_STRUCTURE,
  enabled: true,
  services: [
    {
      segment: 'compass',
      environments: ['development', 'staging', 'production']
    },
    { segment: 'solo', environments: ['development'] }
  ]
};

const parameters = [
  makeParameter('/development/compass/Secret', {
    Type: 'SecureString',
    Value: 'dev-secret',
    KeyId: 'alias/compass'
  }),
  makeParameter('/staging/compass/Secret', {
    Value: 'staging-secret',
    Description: 'Kept'
  }),
  makeParameter('/development/compass/Flag', { Value: 'on' }),
  makeParameter('/staging/compass/Flag', { Value: 'on' }),
  makeParameter('/production/compass/Flag', {
    Type: 'SecureString',
    Value: 'off',
    KeyId: 'alias/prod'
  }),
  makeParameter('/development/compass/Only', { Value: 'only' }),
  makeParameter('/development/solo/Key')
];

const setup = (name: string, list: ParameterEntry[] = parameters) => {
  const queryClient = createTestState({
    parameters: list,
    settings: { structure }
  });
  uiActions.selectParameter(name);
  return renderWithProviders(
    <>
      <DetailHost narrow={false} />
      <CopyModal />
    </>,
    { queryClient }
  );
};

const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'More actions' }));
  await screen.findByRole('menuitem', { name: /Duplicate/ });
};

const openDialog = async (user: ReturnType<typeof userEvent.setup>) => {
  await openMenu(user);
  await user.click(
    screen.getByRole('menuitem', { name: /Copy to environments/ })
  );
  return screen.findByRole('dialog');
};

const rowOf = (dialog: HTMLElement, env: string) =>
  within(dialog).getByRole('checkbox', { name: env }).closest('li')!;

const pickSource = async (
  user: ReturnType<typeof userEvent.setup>,
  dialog: HTMLElement,
  env: string
) => {
  await user.click(
    within(dialog).getByRole('combobox', { name: 'Source environment' })
  );
  await user.click(
    (await screen.findAllByText(env)).find(el =>
      el.closest('.ant-select-item-option')
    )!
  );
};

const targetNames = (dialog: HTMLElement) =>
  within(dialog)
    .getAllByRole('checkbox')
    .flatMap(box => {
      const name = box.getAttribute('aria-label');
      return name ? [name] : [];
    });

const primary = (dialog: HTMLElement) =>
  within(dialog).getByRole('button', { name: /^Copy/ });

beforeEach(() => vi.clearAllMocks());

describe('Copy to environments', () => {
  it("isn't offered for a service with one environment", async () => {
    const user = userEvent.setup();
    setup('/development/solo/Key');
    await openMenu(user);
    expect(
      screen.queryByRole('menuitem', { name: /Copy to environments/ })
    ).not.toBeInTheDocument();
  });

  it("is disabled when the value can't be read", async () => {
    const user = userEvent.setup();
    setup('/development/compass/Secret', [
      makeParameter('/development/compass/Secret', {
        Type: 'SecureString',
        Value: undefined
      })
    ]);
    await openMenu(user);
    expect(
      screen.getByRole('menuitem', { name: /Copy to environments/ })
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('lists the other environments with what the copy does to each', async () => {
    const user = userEvent.setup();
    setup('/development/compass/Flag');
    const dialog = await openDialog(user);

    expect(dialog).toHaveTextContent('/development/compass/Flag');
    const staging = rowOf(dialog, 'staging');
    expect(staging).toHaveTextContent('Same value');
    expect(within(staging).getByRole('checkbox')).toBeDisabled();
    const production = rowOf(dialog, 'production');
    expect(production).toHaveTextContent('Overwrites');
    expect(production).toHaveTextContent('Keeps SecureString');
    // A SecureString target's value is masked.
    expect(production).toHaveTextContent('••••••••');
    expect(production).toHaveTextContent('encrypted with alias/prod');
    expect(dialog).toHaveTextContent('0 of 1 environment selected');
    expect(dialog).toHaveTextContent('Select the environments to copy to');
    expect(primary(dialog)).toHaveTextContent('Copy');
    expect(primary(dialog)).toBeDisabled();
    // Three environments aren't filtered.
    expect(
      within(dialog).queryByPlaceholderText('Filter environments')
    ).not.toBeInTheDocument();

    // A Same value row can't be picked by clicking it either.
    await user.click(staging);
    await user.click(production);
    expect(dialog).toHaveTextContent('1 of 1 environment selected');
    expect(dialog).toHaveTextContent('1 overwrite');
    expect(primary(dialog)).toHaveTextContent('Copy to 1 environment');
  });

  it('selects every selectable environment with Select all', async () => {
    const user = userEvent.setup();
    setup('/development/compass/Secret');
    const dialog = await openDialog(user);
    const all = within(dialog).getByRole('checkbox', { name: 'Select all' });

    await user.click(rowOf(dialog, 'staging'));
    expect(all.closest('.ant-checkbox')).toHaveClass(
      'ant-checkbox-indeterminate'
    );
    await user.click(all);
    expect(dialog).toHaveTextContent('2 of 2 environments selected');
    await user.click(all);
    expect(dialog).toHaveTextContent('0 of 2 environments selected');
  });

  it('copies a SecureString, keeping each target type', async () => {
    const user = userEvent.setup();
    api.parametersService.put.mockResolvedValue({ version: 2 });
    setup('/development/compass/Secret');
    const dialog = await openDialog(user);

    const staging = rowOf(dialog, 'staging');
    expect(staging).toHaveTextContent('Overwrites');
    expect(staging).toHaveTextContent('Keeps String');
    expect(staging).toHaveTextContent('staging-secret');
    expect(staging).toHaveTextContent('saved unencrypted');
    const production = rowOf(dialog, 'production');
    expect(production).toHaveTextContent('New');
    expect(production).toHaveTextContent('Not set');

    await user.click(production);
    // The KMS key of a new SecureString defaults to the source's.
    expect(
      within(production).getByRole('combobox', {
        name: 'KMS key for production'
      })
    ).toBeInTheDocument();
    expect(production).toHaveTextContent('alias/compass');
    await user.click(staging);
    expect(dialog).toHaveTextContent('1 new · 1 overwrite · 1 unencrypted');

    await user.click(primary(dialog));

    expect(api.parametersService.put).toHaveBeenCalledWith({
      name: '/staging/compass/Secret',
      type: 'String',
      value: 'dev-secret',
      overwrite: true
    });
    expect(api.parametersService.put).toHaveBeenCalledWith({
      name: '/production/compass/Secret',
      type: 'SecureString',
      kmsKey: 'alias/compass',
      value: 'dev-secret',
      overwrite: false
    });
    expect(
      await screen.findByText('Copied to 2 environments')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Secret → staging, production')
    ).toBeInTheDocument();
    await waitFor(() => expect(useUiStore.getState().copyRequest).toBeNull());
    // The pane shows the new parameter.
    expect(
      within(screen.getByRole('complementary')).getByRole('button', {
        name: 'production'
      })
    ).toBeInTheDocument();
  });

  it('keeps the failed environments selected and retries only them', async () => {
    const user = userEvent.setup();
    api.parametersService.put.mockImplementation(request =>
      request.name.startsWith('/production')
        ? Promise.reject(
            Object.assign(new Error('Access denied'), { code: 'Denied' })
          )
        : Promise.resolve({ version: 2 })
    );
    setup('/development/compass/Secret');
    const dialog = await openDialog(user);
    await user.click(
      within(dialog).getByRole('checkbox', { name: 'Select all' })
    );
    await user.click(primary(dialog));

    expect(
      await within(dialog).findByText('Copied to 1 of 2. 1 failed.')
    ).toBeInTheDocument();
    expect(rowOf(dialog, 'production')).toHaveTextContent(
      'Denied: Access denied'
    );
    // Staging has the value now.
    expect(rowOf(dialog, 'staging')).toHaveTextContent('Same value');
    expect(dialog).toHaveTextContent('1 of 1 environment selected');

    api.parametersService.put.mockClear();
    api.parametersService.put.mockResolvedValue({ version: 1 });
    await user.click(within(dialog).getByRole('button', { name: 'Retry' }));
    expect(api.parametersService.put).toHaveBeenCalledTimes(1);
    expect(api.parametersService.put).toHaveBeenCalledWith(
      expect.objectContaining({ name: '/production/compass/Secret' })
    );
    await waitFor(() => expect(useUiStore.getState().copyRequest).toBeNull());
  });

  it('closes on Esc without closing the pane', async () => {
    const user = userEvent.setup();
    setup('/development/compass/Secret');
    await openDialog(user);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useUiStore.getState().copyRequest).toBeNull();
    expect(useUiStore.getState().paneMode).toBe('detail');
  });

  it('defaults the KMS key for an environment named like an object property', async () => {
    const user = userEvent.setup();
    api.parametersService.put.mockResolvedValue({ version: 1 });
    const odd: Structure = {
      ...structure,
      environments: ['a', 'constructor'].map(segment => ({
        segment,
        color: '#52c41a'
      })),
      services: [{ segment: 'compass', environments: ['a', 'constructor'] }]
    };
    const queryClient = createTestState({
      parameters: [
        makeParameter('/a/compass/Key', {
          Type: 'SecureString',
          KeyId: 'alias/compass'
        })
      ],
      settings: { structure: odd }
    });
    uiActions.openCopyDialog('/a/compass/Key');
    renderWithProviders(<CopyModal />, { queryClient });
    const dialog = await screen.findByRole('dialog');

    await user.click(rowOf(dialog, 'constructor'));
    await user.click(primary(dialog));
    expect(api.parametersService.put).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '/constructor/compass/Key',
        kmsKey: 'alias/compass'
      })
    );
  });

  it('warns that a secret copied to a StringList is saved unencrypted', async () => {
    const user = userEvent.setup();
    setup('/development/compass/Secret', [
      ...parameters,
      makeParameter('/production/compass/Secret', {
        Type: 'StringList',
        Value: 'a,b'
      })
    ]);
    const dialog = await openDialog(user);
    const production = rowOf(dialog, 'production');
    expect(production).toHaveTextContent(
      'stores it as a StringList, so the secret will be saved unencrypted'
    );
    await user.click(production);
    expect(dialog).toHaveTextContent('1 overwrite · 1 unencrypted');
  });

  it('shows the source as a tag when only one environment has the key', async () => {
    const user = userEvent.setup();
    setup('/development/compass/Only');
    const dialog = await openDialog(user);
    expect(
      within(dialog).queryByRole('combobox', { name: 'Source environment' })
    ).not.toBeInTheDocument();
    expect(targetNames(dialog)).toEqual(['staging', 'production']);
  });

  it('copies from another environment picked as the source', async () => {
    const user = userEvent.setup();
    api.parametersService.put.mockResolvedValue({ version: 2 });
    setup('/development/compass/Flag');
    const dialog = await openDialog(user);
    expect(targetNames(dialog)).toEqual(['staging', 'production']);
    // Staging has the same value as development.
    expect(rowOf(dialog, 'staging')).toHaveTextContent('Same value');
    await user.click(rowOf(dialog, 'production'));

    await pickSource(user, dialog, 'production');

    // The new source isn't a target, and is no longer ticked; the old one is
    // a target now.
    expect(targetNames(dialog)).toEqual(['development', 'staging']);
    expect(dialog).toHaveTextContent('/production/compass/Flag');
    expect(dialog).toHaveTextContent('0 of 2 environments selected');
    // Production's value is a SecureString, so it is masked in the strip.
    expect(within(dialog).queryByText('off')).not.toBeInTheDocument();
    const staging = rowOf(dialog, 'staging');
    expect(staging).toHaveTextContent('Overwrites');
    expect(staging).toHaveTextContent('saved unencrypted');

    await user.click(staging);
    await user.click(primary(dialog));
    expect(api.parametersService.put).toHaveBeenCalledWith({
      name: '/staging/compass/Flag',
      type: 'String',
      value: 'off',
      overwrite: true
    });
  });

  it('opens on a picked target and asks to check the source', async () => {
    const queryClient = createTestState({
      parameters,
      settings: { structure }
    });
    uiActions.openCopyDialog('/development/compass/Secret', {
      preselectTargets: ['production'],
      pickSource: true
    });
    renderWithProviders(<CopyModal />, { queryClient });
    const dialog = await screen.findByRole('dialog');

    expect(dialog).toHaveTextContent(
      'Choose which environment to copy the value from.'
    );
    expect(
      within(dialog).getByRole('checkbox', { name: 'production' })
    ).toBeChecked();
    expect(dialog).toHaveTextContent('1 of 2 environments selected');
    expect(dialog).toHaveTextContent('1 new');
  });

  it('opens from the detail pane without the hint or a ticked target', async () => {
    const user = userEvent.setup();
    setup('/development/compass/Secret');
    const dialog = await openDialog(user);
    expect(dialog).not.toHaveTextContent('Choose which environment');
    expect(dialog).toHaveTextContent('0 of 2 environments selected');
  });

  it("doesn't offer a StringList as the source", async () => {
    const user = userEvent.setup();
    setup('/development/compass/List', [
      makeParameter('/development/compass/List', { Value: 'a' }),
      makeParameter('/staging/compass/List', {
        Type: 'StringList',
        Value: 'a,b'
      })
    ]);
    const dialog = await openDialog(user);
    await user.click(
      within(dialog).getByRole('combobox', { name: 'Source environment' })
    );
    const option = (await screen.findAllByText('staging'))
      .map(el => el.closest('.ant-select-item-option'))
      .find(Boolean)!;
    expect(option).toHaveClass('ant-select-item-option-disabled');
    expect(option).toHaveTextContent('StringList not supported');
    await user.click(option);
    expect(dialog).toHaveTextContent('/development/compass/List');
  });

  it("won't copy from a StringList source", async () => {
    const user = userEvent.setup();
    const queryClient = createTestState({
      parameters: [
        makeParameter('/development/compass/List', {
          Type: 'StringList',
          Value: 'a,b'
        })
      ],
      settings: { structure }
    });
    uiActions.openCopyDialog('/development/compass/List', {
      preselectTargets: ['production']
    });
    renderWithProviders(<CopyModal />, { queryClient });
    const dialog = await screen.findByRole('dialog');

    expect(dialog).toHaveTextContent("StringList values can't be copied yet");
    expect(primary(dialog)).toBeDisabled();
    await user.click(primary(dialog));
    expect(api.parametersService.put).not.toHaveBeenCalled();
  });

  it('filters the environments when there are more than 5', async () => {
    const user = userEvent.setup();
    const many = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const wide: Structure = {
      ...structure,
      environments: many.map(segment => ({ segment, color: '#52c41a' })),
      services: [{ segment: 'compass', environments: many }]
    };
    const queryClient = createTestState({
      parameters: [makeParameter('/a/compass/Key')],
      settings: { structure: wide }
    });
    uiActions.openCopyDialog('/a/compass/Key');
    renderWithProviders(<CopyModal />, { queryClient });
    const dialog = await screen.findByRole('dialog');

    const filter = within(dialog).getByPlaceholderText('Filter environments');
    await user.type(filter, 'g');
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(1);
    await user.type(filter, 'x');
    expect(dialog).toHaveTextContent('No environments match');
  });
});
