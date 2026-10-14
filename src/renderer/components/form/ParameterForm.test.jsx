// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as api from '../../clients/api';
import { actions as uiActions, selectors as uiSelectors } from '../../ducks/ui';
import { renderWithStore } from '../../test/render';
import { createTestStore, makeParameter } from '../../test/testStore';
import ParameterForm from './ParameterForm';

vi.mock('../../clients/api', () => import('../../test/mockApi'));

const setup = (prefill = null) => {
  const store = createTestStore({
    parameters: [makeParameter('/dev/app/Existing')]
  });
  store.dispatch(uiActions.setScope('/dev/app/'));
  store.dispatch(uiActions.openNewParameter(prefill));
  return renderWithStore(<ParameterForm prefill={prefill} />, { store });
};
const createButton = () =>
  screen.getByRole('button', { name: 'Create parameter' });

beforeEach(() => {
  vi.clearAllMocks();
  api.putParameter.mockResolvedValue({ version: 1 });
});

describe('ParameterForm', () => {
  it('starts in the scoped folder and shows the full path', async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.getByText('New parameter')).toBeInTheDocument();
    expect(createButton()).toBeDisabled();

    await user.type(screen.getByLabelText('Parameter name'), 'Timeout');
    expect(screen.getByText('/dev/app/Timeout')).toBeInTheDocument();
  });

  it('rejects slashes and whitespace in the name', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText('Parameter name'), 'a/b');
    expect(screen.getByText(/are not allowed in the name/)).toBeInTheDocument();
  });

  it('links to a parameter that already exists', async () => {
    const user = userEvent.setup();
    const { store } = setup();
    await user.type(screen.getByLabelText('Parameter name'), 'Existing');
    await user.type(screen.getByRole('textbox', { name: 'Value' }), 'v');
    expect(createButton()).toBeDisabled();

    await user.click(screen.getByText('Open it'));
    expect(uiSelectors.getSelectedName(store.getState())).toBe(
      '/dev/app/Existing'
    );
  });

  it('creates the parameter and selects it', async () => {
    const user = userEvent.setup();
    const { store } = setup();
    await user.type(screen.getByLabelText('Parameter name'), 'Timeout');
    await user.type(screen.getByRole('textbox', { name: 'Value' }), '30');
    await user.click(createButton());

    await waitFor(() =>
      expect(uiSelectors.getSelectedName(store.getState())).toBe(
        '/dev/app/Timeout'
      )
    );
    expect(api.putParameter).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '/dev/app/Timeout',
        type: 'String',
        value: '30',
        overwrite: false
      })
    );
    expect(await screen.findByText('Parameter created')).toBeInTheDocument();
  });

  it('creates with ⌘/Ctrl+Enter', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText('Parameter name'), 'Timeout');
    const value = screen.getByRole('textbox', { name: 'Value' });
    await user.type(value, '30');
    fireEvent.keyDown(value, { key: 'Enter', ctrlKey: true });
    await waitFor(() => expect(api.putParameter).toHaveBeenCalled());
  });

  it('prefills a duplicate, including the KMS key', () => {
    setup({
      folder: '/dev/app/',
      name: 'ExistingCopy',
      description: 'desc',
      type: 'SecureString',
      kmsKey: 'alias/custom',
      value: 'secret'
    });
    expect(screen.getByText('Duplicate parameter')).toBeInTheDocument();
    expect(screen.getByLabelText('Parameter name')).toHaveValue('ExistingCopy');
    expect(screen.getByText('alias/custom')).toBeInTheDocument();
    expect(createButton()).toBeEnabled();
  });
});
