import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { printElement } from '../../utils/printElement';
import { formatSchedulingPrintDateRange } from '../../utils/schedulingRows';
import OtSchedulingPage from '../ot-scheduling.page';

jest.mock('../../components/calendar-views/daily-ot-calendar-view.component', () => {
  const React = require('react');

  return ({ selectedDate }) =>
    React.createElement('div', { 'data-testid': 'daily-calendar' }, `Daily calendar ${selectedDate.toISOString()}`);
});

jest.mock('../../components/calendar-views/weekly-ot-calendar-view.component', () => {
  const React = require('react');

  return ({ selectedDate }) =>
    React.createElement('div', { 'data-testid': 'weekly-calendar' }, `Weekly calendar ${selectedDate.toISOString()}`);
});

jest.mock('../../components/headers/ot-header.component', () => {
  const React = require('react');

  return () => React.createElement('div', { 'data-testid': 'operation-theater-header' }, 'Operation Theater Header');
});

jest.mock('../../components/headers/scheduling-header-filters.component', () => {
  const React = require('react');

  return ({ onPrint, selectedFiltersPeriod }) =>
    React.createElement(
      'div',
      { 'data-testid': 'scheduling-header-filters' },
      React.createElement('span', null, `Period: ${selectedFiltersPeriod}`),
      React.createElement('button', { type: 'button', onClick: onPrint }, 'Print schedule'),
    );
});

jest.mock('../../components/print/scheduling-print-content.component', () => {
  const React = require('react');

  return () => React.createElement('div', { 'data-testid': 'scheduling-print-content' }, 'Print content');
});

jest.mock('../../components/tables/scheduling-table-list.component', () => {
  const React = require('react');

  return ({ period }) => React.createElement('div', { 'data-testid': 'scheduling-table-list' }, `List ${period}`);
});

jest.mock('../../utils/printElement', () => ({
  printElement: jest.fn(),
}));

jest.mock('../../utils/schedulingRows', () => ({
  formatSchedulingPrintDateRange: jest.fn(),
}));

const mockPrintElement = jest.mocked(printElement);
const mockFormatSchedulingPrintDateRange = jest.mocked(formatSchedulingPrintDateRange);

describe('OtSchedulingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatSchedulingPrintDateRange.mockReturnValue('May 26, 2026');
    window.history.pushState({}, '', '/openmrs/spa/home/operation-theater/ot-scheduling?period=day&date=2026-05-26');
  });

  it('renders the daily calendar view for day scheduling', () => {
    render(<OtSchedulingPage />);

    expect(screen.getByTestId('operation-theater-header')).toBeInTheDocument();
    expect(screen.getByTestId('scheduling-header-filters')).toHaveTextContent('Period: day');
    expect(screen.getByTestId('daily-calendar')).toBeInTheDocument();
    expect(screen.queryByTestId('weekly-calendar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('scheduling-table-list')).not.toBeInTheDocument();
    expect(screen.getByTestId('scheduling-print-content')).toBeInTheDocument();
  });

  it('renders the weekly calendar view for week scheduling', () => {
    window.history.pushState({}, '', '/openmrs/spa/home/operation-theater/ot-scheduling?period=week&date=2026-05-26');

    render(<OtSchedulingPage />);

    expect(screen.getByTestId('scheduling-header-filters')).toHaveTextContent('Period: week');
    expect(screen.getByTestId('weekly-calendar')).toBeInTheDocument();
    expect(screen.queryByTestId('daily-calendar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('scheduling-table-list')).not.toBeInTheDocument();
  });

  it('renders the list view when requested by the URL', () => {
    window.history.pushState(
      {},
      '',
      '/openmrs/spa/home/operation-theater/ot-scheduling?view=list&period=week&date=2026-05-26',
    );

    render(<OtSchedulingPage />);

    expect(screen.getByTestId('scheduling-table-list')).toHaveTextContent('List week');
    expect(screen.queryByTestId('daily-calendar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('weekly-calendar')).not.toBeInTheDocument();
  });

  it('prints the scheduling view with the selected date range in the document title', () => {
    render(<OtSchedulingPage />);

    fireEvent.click(screen.getByRole('button', { name: /print schedule/i }));

    expect(mockFormatSchedulingPrintDateRange).toHaveBeenCalledWith(expect.any(Date), 'day');
    expect(mockPrintElement).toHaveBeenCalledWith(expect.any(HTMLDivElement), {
      documentTitle: 'OT Schedule - May 26, 2026',
    });
  });
});
