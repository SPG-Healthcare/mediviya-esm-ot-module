import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { showModal } from '@openmrs/esm-framework';
import { useLocations } from '../../../hooks/useLocations';
import { useSurgicalBlocks } from '../../../hooks/useSurgicalBlocks';
import { SurgicalAppointmentStatusEnum } from '../../../utils/constants';
import type { IFilters, ISurgicalBlock } from '../../../utils/types';
import DailyOtCalendarView from '../daily-ot-calendar-view.component';

jest.mock('@openmrs/esm-framework', () => ({
  showModal: jest.fn(() => jest.fn()),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, defaultValue: string) => defaultValue,
  }),
}));

jest.mock('../../../hooks/useLocations', () => ({
  useLocations: jest.fn(),
}));

jest.mock('../../../hooks/useSurgicalBlocks', () => ({
  useSurgicalBlocks: jest.fn(),
}));

jest.mock('../daily-ot-desktop-board.component', () => {
  const React = require('react');

  return () => React.createElement('div', { className: 'desktop-board', 'data-testid': 'desktop-board' });
});

jest.mock('../daily-ot-mobile-board.component', () => {
  const React = require('react');

  return () => React.createElement('div', { className: 'mobile-board', 'data-testid': 'mobile-board' });
});

const mockUseLocations = jest.mocked(useLocations);
const mockUseSurgicalBlocks = jest.mocked(useSurgicalBlocks);
const mockShowModal = jest.mocked(showModal);

const emptyFilters: IFilters = {
  surgeon: [],
  location: [],
  patient: null,
  status: [],
};

const surgicalBlock: ISurgicalBlock = {
  id: 1,
  uuid: 'block-1',
  location: { uuid: 'ot-1', display: 'OT 1' } as ISurgicalBlock['location'],
  startDatetime: '2026-05-26T08:00:00',
  endDatetime: '2026-05-26T10:00:00',
  provider: {
    uuid: 'provider-1',
    display: 'Dr. Surgeon',
    person: { uuid: 'provider-person-1', display: 'Dr. Surgeon' },
  } as ISurgicalBlock['provider'],
  surgicalAppointments: [
    {
      id: 1,
      uuid: 'appointment-1',
      patient: {
        uuid: 'patient-1',
        display: 'Ada Lovelace',
        person: { uuid: 'person-1', display: 'Ada Lovelace' },
        identifiers: [{ uuid: 'identifier-1', display: 'ID = OT-100' }],
      },
      status: SurgicalAppointmentStatusEnum.SCHEDULED,
      surgicalAppointmentAttributes: [],
    },
  ],
};

const getRuleBody = (styles: string, selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = styles.match(new RegExp(`${escapedSelector}\\s*{([^}]*)}`));

  if (!match) {
    throw new Error(`Expected to find CSS rule for ${selector}`);
  }

  return match[1].replace(/\s+/g, ' ').trim();
};

describe('Daily OT calendar responsive layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShowModal.mockReturnValue(jest.fn());
    mockUseLocations.mockReturnValue({
      locations: [{ uuid: 'ot-1', display: 'OT 1' }],
      isLoading: false,
      error: null,
      isValidating: false,
    });
    mockUseSurgicalBlocks.mockReturnValue({
      surgicalBlocks: [surgicalBlock],
      isLoading: false,
      error: null,
      isValidating: false,
    });
  });

  it('renders both board renderers so the media query can switch visibility', () => {
    render(<DailyOtCalendarView selectedDate={new Date('2026-05-26T12:00:00')} filters={emptyFilters} />);

    expect(screen.getByTestId('desktop-board')).toHaveClass('desktop-board');
    expect(screen.getByTestId('mobile-board')).toHaveClass('mobile-board');
  });

  it('keeps mobile boards hidden and desktop boards visible before the mobile breakpoint', () => {
    const styles = fs.readFileSync(path.resolve(__dirname, '../daily-ot-calendar-view.scss'), 'utf8');
    const baseStyles = styles.slice(0, styles.indexOf('@media (max-width: 768px)'));

    expect(getRuleBody(baseStyles, '.desktop-board')).toContain('display: block;');
    expect(getRuleBody(baseStyles, '.weekly-desktop-board')).toContain('display: block;');
    expect(getRuleBody(baseStyles, '.mobile-board')).toContain('display: none;');
    expect(getRuleBody(baseStyles, '.weekly-mobile-board')).toContain('display: none;');
  });

  it('hides desktop boards and shows mobile boards at the mobile breakpoint', () => {
    const styles = fs.readFileSync(path.resolve(__dirname, '../daily-ot-calendar-view.scss'), 'utf8');
    const mobileMediaStyles = styles.slice(styles.indexOf('@media (max-width: 768px)'));

    expect(mobileMediaStyles).toContain('@media (max-width: 768px)');
    expect(getRuleBody(mobileMediaStyles, '.desktop-board')).toContain('display: none;');
    expect(getRuleBody(mobileMediaStyles, '.weekly-desktop-board')).toContain('display: none;');
    expect(getRuleBody(mobileMediaStyles, '.mobile-board')).toContain('display: flex;');
    expect(getRuleBody(mobileMediaStyles, '.weekly-mobile-board')).toContain('display: flex;');
    expect(getRuleBody(mobileMediaStyles, '.appointment-chip-header')).toContain('flex-direction: column;');
  });
});
