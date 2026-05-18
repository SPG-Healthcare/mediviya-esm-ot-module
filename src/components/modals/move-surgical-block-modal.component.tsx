import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { showSnackbar, useStore } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { useConfig } from '@openmrs/esm-framework';
import { useSWRConfig } from 'swr';
import {
  Button,
  DatePicker,
  DatePickerInput,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
} from '@carbon/react';

import { useUpdateSurgicalAppointment } from '../../hooks/useUpdateSurgicalAppointment';
import { useSurgicalBlocks } from '../../hooks/useSurgicalBlocks';
import { PeriodEnum } from '../../utils/constants';
import { formatTime, handleFreeze } from '../../utils/helpers';
import { revalidateOtData } from '../../utils/revalidateOtData';
import styles from './move-surgical-block-modal.scss';
import { otGlobalStore } from '../../store/globalOtStore';
import withOtFreeze from '../../enhancers/withOtFreeze';
import { type Config } from '../../config-schema';

interface MoveSurgicalBlockModalPayload {
  blockUuid: string;
  appointmentUuid: string;
  currentStartDatetime: string;
  currentEndDatetime: string;
  currentLocationUuid: string;
  currentLocationName: string;
  currentProviderUuid: string;
  currentProviderName: string;
  patientName: string;
  identifier: string;
  estTimeMinutes?: number;
}

interface MoveSurgicalBlockModalProps extends Partial<MoveSurgicalBlockModalPayload> {
  isOtAdmin?: boolean;
  closeModal?: () => void;
  onClose?: () => void;
  props?: MoveSurgicalBlockModalPayload;
}

const MoveSurgicalBlockModal: React.FC<MoveSurgicalBlockModalProps> = ({
  isOtAdmin,
  closeModal,
  onClose,
  props,
  appointmentUuid: topAppointmentUuid,
  currentStartDatetime: topStartDatetime,
  currentLocationName: topLocationName,
  currentProviderName: topProviderName,
  patientName: topPatientName,
  identifier: topIdentifier,
  estTimeMinutes: topEstTimeMinutes,
}) => {
  const { t } = useTranslation();
  const { otFreezeWindowDaysInAdvance }: Config = useConfig();
  const { mutate } = useSWRConfig();
  const { otfreeze, setOtFreeze } = useStore(otGlobalStore);

  const close = onClose ?? closeModal ?? (() => {});

  const appointmentUuid = props?.appointmentUuid ?? topAppointmentUuid;
  const currentStartDatetime = props?.currentStartDatetime ?? topStartDatetime;
  const currentLocationName = props?.currentLocationName ?? topLocationName ?? '-';
  const currentProviderName = props?.currentProviderName ?? topProviderName ?? '-';
  const patientName = props?.patientName ?? topPatientName ?? '';
  const identifier = props?.identifier ?? topIdentifier ?? '';
  const estTimeMinutes = props?.estTimeMinutes ?? topEstTimeMinutes ?? 0;

  const { updateSurgicalAppointment, isUpdating } = useUpdateSurgicalAppointment();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [destinationBlockUuid, setDestinationBlockUuid] = useState<string>('');

  const formattedDate = selectedDate ? dayjs(selectedDate).format('YYYY-MM-DD') : '';

  const { surgicalBlocks, isLoading: isLoadingBlocks } = useSurgicalBlocks(formattedDate, PeriodEnum.DAILY);

  useEffect(() => {
    const parsedStart = currentStartDatetime ? dayjs(currentStartDatetime) : dayjs();
    setSelectedDate(parsedStart.isValid() ? parsedStart.toDate() : undefined);
  }, [currentStartDatetime]);

  const modalHeading = useMemo(
    () =>
      t(
        'moveSurgicalBlockHeading',
        'Moving {{identifier}} - {{patientName}} from {{currentProviderName}} - {{currentLocationName}}',
        {
          identifier,
          patientName,
          currentProviderName,
          currentLocationName,
        },
      ),
    [t, identifier, patientName, currentProviderName, currentLocationName],
  );

  const checkBlockAvailability = (block: any, requiredMinutes: number) => {
    const start = dayjs(block.startDatetime);
    const end = dayjs(block.endDatetime);
    const totalBlockMinutes = end.diff(start, 'minute');

    const bookedMinutes = (block.surgicalAppointments || []).reduce((acc: number, appt: any) => {
      if (appt.uuid === appointmentUuid) return acc;

      const attrs = appt.surgicalAppointmentAttributes || [];
      const estTimeAttr = attrs.find((a: any) => a.surgicalAppointmentAttributeType?.name === 'estTimeMinutes');
      const estTime = estTimeAttr ? parseInt(estTimeAttr.value, 10) : 0;
      return acc + (isNaN(estTime) ? 0 : estTime);
    }, 0);

    return totalBlockMinutes - bookedMinutes >= requiredMinutes;
  };

  const candidateBlocks = useMemo(() => {
    if (!surgicalBlocks || !selectedDate) return [];

    const targetDateStr = dayjs(selectedDate).format('YYYY-MM-DD');

    return surgicalBlocks
      .filter((block) => dayjs(block.startDatetime).format('YYYY-MM-DD') === targetDateStr)
      .filter((block) => checkBlockAvailability(block, estTimeMinutes));
  }, [surgicalBlocks, selectedDate, estTimeMinutes, appointmentUuid]);

  const canSubmit = !!selectedDate && !!destinationBlockUuid && !isUpdating;

  const onSave = async () => {
    if (!appointmentUuid || !destinationBlockUuid) {
      showSnackbar({
        title: t('moveUnavailable', 'Unable to move'),
        subtitle: t('moveUnavailableDescription', 'Missing appointment or destination block.'),
        kind: 'error',
        isLowContrast: true,
      });
      return;
    }

    try {
      await updateSurgicalAppointment(appointmentUuid, {
        surgicalBlock: destinationBlockUuid,
      });

      showSnackbar({
        title: t('moveSaved', 'Move successful'),
        subtitle: t('moveSavedDescription', 'Surgical appointment moved successfully.'),
        kind: 'success',
        isLowContrast: true,
      });

      await revalidateOtData(mutate);
      close();
    } catch (error) {
      showSnackbar({
        title: t('moveFailed', 'Failed to move'),
        subtitle: t(
          'moveFailedDescription',
          'An error occurred while moving the surgical appointment. Please try again.',
        ),
        kind: 'error',
        isLowContrast: true,
      });
    }
  };

  useEffect(() => {
    if (isOtAdmin) {
      setOtFreeze(false);
    } else {
      setOtFreeze(handleFreeze(currentStartDatetime, otFreezeWindowDaysInAdvance));
    }
  }, []);

  return (
    <React.Fragment>
      <ModalHeader className={styles['wrap-modal-header']} closeModal={close} title={modalHeading} />
      <fieldset disabled={otfreeze}>
        <ModalBody className={styles['add-actual-time-body']}>
          <div className={styles['field-group']}>
            <h5>{t('selectDate', 'Select Date')}</h5>
            <div className={styles['datetime-row']}>
              <DatePicker
                datePickerType="single"
                value={selectedDate ? [selectedDate] : []}
                onChange={(dates: Date[]) => {
                  setSelectedDate(dates?.[0]);
                  setDestinationBlockUuid(''); // Reset selection
                }}
              >
                <DatePickerInput
                  id="move-select-date"
                  labelText={t('date', 'Date')}
                  placeholder="mm/dd/yyyy"
                  size="md"
                />
              </DatePicker>
            </div>
          </div>

          {selectedDate && (
            <div className={styles['field-group']} style={{ marginTop: '1rem' }}>
              <h5>{t('destination', 'Destination')}</h5>
              {isLoadingBlocks ? (
                <div>{t('loadingBlocks', 'Loading available blocks...')}</div>
              ) : candidateBlocks.length > 0 ? (
                <Select
                  id="destination-block"
                  labelText={t('selectDestination', 'Select Destination Block')}
                  value={destinationBlockUuid}
                  onChange={(e) => setDestinationBlockUuid(e.target.value)}
                >
                  <SelectItem value="" text={t('chooseBlock', 'Choose a block')} />
                  {candidateBlocks.map((block: any) => {
                    const providerName =
                      block.provider?.display || block.provider?.person?.display || 'Unknown Provider';
                    const locationName = block.location?.display || block.location?.name || 'Unknown Location';
                    const timeRange = `${formatTime(block.startDatetime)} - ${formatTime(block.endDatetime)}`;
                    return (
                      <SelectItem
                        key={block.uuid}
                        value={block.uuid}
                        text={`${providerName} - ${locationName} (${timeRange})`}
                      />
                    );
                  })}
                </Select>
              ) : (
                <div>{t('noBlocksFound', 'No available surgical blocks found for this date.')}</div>
              )}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button kind="secondary" onClick={close} disabled={isUpdating}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button kind="primary" disabled={!canSubmit} onClick={onSave}>
            {isUpdating ? t('moving', 'Moving...') : t('move', 'Move')}
          </Button>
        </ModalFooter>
      </fieldset>
    </React.Fragment>
  );
};

const MoveSurgicalBlockModalWrapper = withOtFreeze(MoveSurgicalBlockModal);
export default MoveSurgicalBlockModalWrapper;
