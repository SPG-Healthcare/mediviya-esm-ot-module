import React from 'react';
import { render, screen } from '@testing-library/react';
import SurgicalQueues from '../surgical-queues.page';

jest.mock('../../components/headers/ot-header.component', () => {
  const React = require('react');

  return () => React.createElement('div', { 'data-testid': 'operation-theater-header' }, 'Operation Theater Header');
});

jest.mock('../../components/tables/surgical-queues-table.component', () => {
  const React = require('react');

  return () => React.createElement('div', { 'data-testid': 'surgical-queues-table' }, 'Surgical Queues Table');
});

describe('SurgicalQueues', () => {
  it('renders the operation theater header and surgical queues table', () => {
    render(<SurgicalQueues />);

    expect(screen.getByTestId('operation-theater-header')).toBeInTheDocument();
    expect(screen.getByTestId('surgical-queues-table')).toBeInTheDocument();
  });
});
