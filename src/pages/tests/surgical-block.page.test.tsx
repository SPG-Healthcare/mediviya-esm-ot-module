import React from 'react';
import { render, screen } from '@testing-library/react';
import { useSurgicalBlockById } from '../../hooks/useSurgicalBlockById';
import SurgicalBlock from '../surgical-block.page';

jest.mock('../../components/headers/ot-header.component', () => {
  const React = require('react');

  return ({ tabSelectedIndex }) =>
    React.createElement('div', { 'data-testid': 'operation-theater-header' }, `Selected tab: ${tabSelectedIndex}`);
});

jest.mock('../../components/forms/new-surgical-block-view.component', () => {
  const React = require('react');

  return ({ isEdit, surgicalBlock }) =>
    React.createElement('div', {
      'data-testid': 'new-surgical-block-view',
      'data-is-edit': String(isEdit),
      'data-surgical-block-uuid': surgicalBlock?.uuid ?? '',
    });
});

jest.mock('../../hooks/useSurgicalBlockById', () => ({
  useSurgicalBlockById: jest.fn(),
}));

const mockUseSurgicalBlockById = jest.mocked(useSurgicalBlockById);
type UseSurgicalBlockByIdResult = ReturnType<typeof useSurgicalBlockById>;

describe('SurgicalBlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSurgicalBlockById.mockReturnValue({
      surgicalBlock: null,
      isLoading: false,
      error: null,
      isValidating: false,
    } as UseSurgicalBlockByIdResult);
    window.history.pushState({}, '', '/openmrs/spa/home/operation-theater/surgical-block');
  });

  it('renders the surgical block page in create mode when no id is present', () => {
    render(<SurgicalBlock />);

    expect(mockUseSurgicalBlockById).toHaveBeenCalledWith(null);
    expect(screen.getByTestId('operation-theater-header')).toHaveTextContent('Selected tab: 1');
    expect(screen.getByTestId('new-surgical-block-view')).toHaveAttribute('data-is-edit', 'false');
  });

  it('renders the surgical block page in edit mode when an id is present', () => {
    mockUseSurgicalBlockById.mockReturnValue({
      surgicalBlock: { uuid: 'surgical-block-uuid' },
      isLoading: false,
      error: null,
      isValidating: false,
    } as UseSurgicalBlockByIdResult);
    window.history.pushState({}, '', '/openmrs/spa/home/operation-theater/surgical-block?id=surgical-block-uuid');

    render(<SurgicalBlock />);

    const form = screen.getByTestId('new-surgical-block-view');
    expect(mockUseSurgicalBlockById).toHaveBeenCalledWith('surgical-block-uuid');
    expect(form).toHaveAttribute('data-is-edit', 'true');
    expect(form).toHaveAttribute('data-surgical-block-uuid', 'surgical-block-uuid');
  });
});
