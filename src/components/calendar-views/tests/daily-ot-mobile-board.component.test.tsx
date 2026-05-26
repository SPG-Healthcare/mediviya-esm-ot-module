import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { SurgicalAppointmentStatusEnum } from '../../../utils/constants';
import type { CalendarDetailsModalPayload, ISurgicalAppointment, ISurgicalBlock } from '../../../utils/types';
import type { CalendarLaneDefinition } from '../daily-ot-calendar-view.utils';
import DailyOtMobileBoard from '../daily-ot-mobile-board.component';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, defaultValue: string) => defaultValue,
  }),
}));

const appointment: ISurgicalAppointment = {
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
  surgicalAppointments: [appointment],
};

const lanes: Array<CalendarLaneDefinition> = [
  { key: 'ot-1', label: 'OT 1', placeholder: false },
  { key: 'ot-2', label: 'OT 2', placeholder: false },
  { key: 'placeholder-ot-3', label: 'Operation Theatre 3', placeholder: true },
];

const renderMobileBoard = (onOpenDetails = jest.fn()) => {
  const blocksByLane = new Map<string, Array<ISurgicalBlock>>([
    ['ot-1', [surgicalBlock]],
    ['ot-2', []],
    ['placeholder-ot-3', []],
  ]);

  const result = render(<DailyOtMobileBoard lanes={lanes} blocksByLane={blocksByLane} onOpenDetails={onOpenDetails} />);

  return { ...result, onOpenDetails };
};

describe('DailyOtMobileBoard', () => {
  it('renders mobile lanes, appointment chips, empty lanes, and placeholder labels', () => {
    const { container } = renderMobileBoard();

    expect(container.firstChild).toHaveClass('mobile-board');
    expect(screen.getByText('OT 1')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText(/Est:/i)).toBeInTheDocument();
    expect(screen.getByText('OT 2')).toBeInTheDocument();
    expect(screen.getByText('No blocks for this theatre today')).toBeInTheDocument();
    expect(screen.getByText('Operation Theatre 3')).toBeInTheDocument();
    expect(screen.getByText('Planned')).toBeInTheDocument();
    expect(screen.getByText('This lane is reserved so the layout supports 3 OTs.')).toBeInTheDocument();
  });

  it('opens appointment details without also opening the parent block', () => {
    const { onOpenDetails } = renderMobileBoard();
    const appointmentButton = screen.getByText('Ada Lovelace').closest('button') as HTMLElement;

    fireEvent.click(appointmentButton);

    expect(onOpenDetails).toHaveBeenCalledTimes(1);
    expect(onOpenDetails).toHaveBeenCalledWith({
      kind: 'appointment',
      block: surgicalBlock,
      appointment,
      laneLabel: 'OT 1',
    } satisfies CalendarDetailsModalPayload);
  });

  it('opens block details when the mobile block is clicked or activated with the keyboard', () => {
    const { container, onOpenDetails } = renderMobileBoard();
    const mobileBlock = container.querySelector('.mobile-block') as HTMLElement;

    fireEvent.click(mobileBlock);
    fireEvent.keyDown(mobileBlock, { key: 'Enter' });

    expect(onOpenDetails).toHaveBeenCalledTimes(2);
    expect(onOpenDetails).toHaveBeenNthCalledWith(1, {
      kind: 'block',
      block: surgicalBlock,
      laneLabel: 'OT 1',
    } satisfies CalendarDetailsModalPayload);
    expect(onOpenDetails).toHaveBeenNthCalledWith(2, {
      kind: 'block',
      block: surgicalBlock,
      laneLabel: 'OT 1',
    } satisfies CalendarDetailsModalPayload);
  });
});
