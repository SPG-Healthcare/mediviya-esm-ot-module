import React, { useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { showSnackbar, useStore } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { useConfig } from '@openmrs/esm-framework';
import { useSWRConfig } from 'swr';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  DatePicker,
  DatePickerInput,
  ModalBody,
  ModalFooter,
  ModalHeader,
  SelectItem,
  TextArea,
  TimePicker,
  TimePickerSelect,
} from '@carbon/react';

import { useUpdateSurgicalAppointment } from '../../hooks/useUpdateSurgicalAppointment';
import { omrsDateFormat } from '../../utils/constants';
import {
  actualTimeSchema,
  ActualTimeFormData,
  maxActualTimeNotesLength,
  mergeDateAndTime,
} from '../../schemas/actualTime.schema';
import { AddActualTimeModalPayload } from '../../utils/types';
import { revalidateOtData } from '../../utils/revalidateOtData';
import styles from './add-actual-time-modal.scss';
import withOtFreeze from '../../enhancers/withOtFreeze';
import { otGlobalStore } from '../../store/globalOtStore';
import { handleFreeze } from '../../utils/helpers';
import { type Config } from '../../config-schema';

interface AddActualTimeModalProps {
  isOtAdmin?: boolean;
  onClose?: () => void;
  closeModal?: () => void;
  props?: AddActualTimeModalPayload;
  appointmentUuid?: string;
  patientName?: string;
  identifier?: string;
  initialStartDatetime?: string;
  initialEndDatetime?: string;
  initialNotes?: string;
}

const defaultTime = '12:00';

const resolvePickerDate = (dates: Array<Date | string> | undefined, dateStr?: string): Date | undefined => {
  const first = dates?.[0];

  if (first instanceof Date && !Number.isNaN(first.getTime())) {
    return first;
  }

  if (typeof first === 'string') {
    const parsed = dayjs(first);
    if (parsed.isValid()) {
      return parsed.toDate();
    }
  }

  if (dateStr) {
    const parsed = dayjs(dateStr);
    if (parsed.isValid()) {
      return parsed.toDate();
    }
  }

  return undefined;
};

const AddActualTimeModal: React.FC<AddActualTimeModalProps> = ({
  isOtAdmin,
  onClose,
  closeModal,
  props,
  appointmentUuid: topAppointmentUuid,
  patientName: topPatientName,
  identifier: topIdentifier,
  initialStartDatetime: topInitialStartDatetime,
  initialEndDatetime: topInitialEndDatetime,
  initialNotes: topInitialNotes,
}) => {
  const { t } = useTranslation();
  const { otFreezeWindowDaysInAdvance }: Config = useConfig();
  const { mutate } = useSWRConfig();
  const { updateSurgicalAppointment, isUpdating } = useUpdateSurgicalAppointment();
  const { otfreeze, setOtFreeze } = useStore(otGlobalStore);

  const close = onClose ?? closeModal ?? (() => {});
  const appointmentUuid = props?.appointmentUuid ?? topAppointmentUuid;
  const patientName = props?.patientName ?? topPatientName ?? '-';
  const identifier = props?.identifier ?? topIdentifier ?? '-';
  const initialStartDatetime = props?.initialStartDatetime ?? topInitialStartDatetime;
  const initialEndDatetime = props?.initialEndDatetime ?? topInitialEndDatetime;
  const initialNotes = props?.initialNotes ?? topInitialNotes;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ActualTimeFormData>({
    resolver: zodResolver(actualTimeSchema),
    mode: 'onChange',
    defaultValues: {
      startDate: undefined,
      startTime: defaultTime,
      startMeridiem: 'AM',
      endDate: undefined,
      endTime: defaultTime,
      endMeridiem: 'PM',
      notes: '',
    },
  });

  useEffect(() => {
    const parsedStart = initialStartDatetime ? dayjs(initialStartDatetime) : dayjs();
    const parsedEnd = initialEndDatetime ? dayjs(initialEndDatetime) : dayjs();

    reset({
      startDate: parsedStart.isValid() ? parsedStart.toDate() : undefined,
      startTime: parsedStart.isValid() ? parsedStart.format('hh:mm') : defaultTime,
      startMeridiem: (parsedStart.isValid() ? parsedStart.format('A') : 'AM') as 'AM' | 'PM',
      endDate: parsedEnd.isValid() ? parsedEnd.toDate() : undefined,
      endTime: parsedEnd.isValid() ? parsedEnd.format('hh:mm') : defaultTime,
      endMeridiem: (parsedEnd.isValid() ? parsedEnd.format('A') : 'PM') as 'AM' | 'PM',
      notes: initialNotes || '',
    });
  }, [initialStartDatetime, initialEndDatetime, initialNotes, reset]);

  const modalHeading = useMemo(
    () =>
      t('addActualTimeHeading', 'Add Actual time for {{patientName}} ({{identifier}})', {
        patientName,
        identifier,
      }),
    [t, patientName, identifier],
  );

  const onSubmit = async (values: ActualTimeFormData) => {
    if (otfreeze) return;
    if (!appointmentUuid) {
      showSnackbar({
        title: t('actualTimeUnavailable', 'Unable to add actual time'),
        subtitle: t('actualTimeUnavailableDescription', 'Surgical appointment reference is missing.'),
        kind: 'error',
        isLowContrast: true,
      });
      return;
    }

    const mergedStartDatetime = mergeDateAndTime(values.startDate, values.startTime, values.startMeridiem);
    const mergedEndDatetime = mergeDateAndTime(values.endDate, values.endTime, values.endMeridiem);

    if (!mergedStartDatetime || !mergedEndDatetime) {
      showSnackbar({
        title: t('invalidDateTime', 'Invalid date or time'),
        subtitle: t('invalidDateTimeDescription', 'Please enter valid start/end time.'),
        kind: 'error',
        isLowContrast: true,
      });
      return;
    }

    try {
      await updateSurgicalAppointment(appointmentUuid, {
        actualStartDatetime: dayjs(mergedStartDatetime).format(omrsDateFormat),
        actualEndDatetime: dayjs(mergedEndDatetime).format(omrsDateFormat),
        notes: values.notes?.trim() || '',
      });

      showSnackbar({
        title: t('actualTimeSaved', 'Actual time saved'),
        subtitle: t('actualTimeSavedDescription', 'Actual time updated successfully.'),
        kind: 'success',
        isLowContrast: true,
      });

      await revalidateOtData(mutate);
      close();
    } catch (error) {
      showSnackbar({
        title: t('actualTimeSaveFailed', 'Failed to save actual time'),
        subtitle: t('actualTimeSaveFailedDescription', 'An error occurred while saving actual time. Please try again.'),
        kind: 'error',
        isLowContrast: true,
      });
    }
  };

  useEffect(() => {
    if (isOtAdmin) {
      setOtFreeze(false);
    } else {
      setOtFreeze(handleFreeze(initialStartDatetime, otFreezeWindowDaysInAdvance));
    }
  }, []);

  return (
    <React.Fragment>
      <ModalHeader className={styles['wrap-modal-header']} closeModal={close} title={modalHeading} />
      <fieldset disabled={otfreeze}>
        <ModalBody className={styles['add-actual-time-body']}>
          <div className={styles['field-group']}>
            <h5>{t('startTime', 'Start Time')}</h5>
            <div className={styles['datetime-row']}>
              <Controller
                name="startDate"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <DatePicker
                    datePickerType="single"
                    value={value ? [value] : []}
                    onChange={(dates: Array<Date | string>, dateStr: string) =>
                      onChange(resolvePickerDate(dates, dateStr))
                    }
                  >
                    <DatePickerInput
                      id="actual-time-start-date"
                      labelText={t('startDate', 'Start date')}
                      placeholder="mm/dd/yyyy"
                      size="md"
                      invalid={Boolean(errors.startDate)}
                      invalidText={errors.startDate?.message as string}
                    />
                  </DatePicker>
                )}
              />
              <Controller
                name="startTime"
                control={control}
                render={({ field }) => (
                  <TimePicker
                    id="actual-time-start-time"
                    labelText={t('startTime', 'Start Time')}
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                    invalid={Boolean(errors.startTime)}
                    invalidText={errors.startTime?.message as string}
                  >
                    <Controller
                      name="startMeridiem"
                      control={control}
                      render={({ field: meridiemField }) => (
                        <TimePickerSelect
                          id="actual-time-start-meridiem"
                          value={meridiemField.value}
                          onChange={(event) => meridiemField.onChange(event.target.value)}
                        >
                          <SelectItem value="AM" text="AM" />
                          <SelectItem value="PM" text="PM" />
                        </TimePickerSelect>
                      )}
                    />
                  </TimePicker>
                )}
              />
            </div>
          </div>

          <div className={styles['field-group']}>
            <h5>{t('endTime', 'End Time')}</h5>
            <div className={styles['datetime-row']}>
              <Controller
                name="endDate"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <DatePicker
                    datePickerType="single"
                    value={value ? [value] : []}
                    onChange={(dates: Array<Date | string>, dateStr: string) =>
                      onChange(resolvePickerDate(dates, dateStr))
                    }
                  >
                    <DatePickerInput
                      id="actual-time-end-date"
                      labelText={t('endDate', 'End date')}
                      placeholder="mm/dd/yyyy"
                      size="md"
                      invalid={Boolean(errors.endDate)}
                      invalidText={errors.endDate?.message as string}
                    />
                  </DatePicker>
                )}
              />
              <Controller
                name="endTime"
                control={control}
                render={({ field }) => (
                  <TimePicker
                    id="actual-time-end-time"
                    labelText={t('endTime', 'End Time')}
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                    invalid={Boolean(errors.endTime)}
                    invalidText={errors.endTime?.message as string}
                  >
                    <Controller
                      name="endMeridiem"
                      control={control}
                      render={({ field: meridiemField }) => (
                        <TimePickerSelect
                          id="actual-time-end-meridiem"
                          value={meridiemField.value}
                          onChange={(event) => meridiemField.onChange(event.target.value)}
                        >
                          <SelectItem value="AM" text="AM" />
                          <SelectItem value="PM" text="PM" />
                        </TimePickerSelect>
                      )}
                    />
                  </TimePicker>
                )}
              />
            </div>
          </div>

          <div className={styles['field-group']}>
            <h5>{t('notes', 'Notes')}</h5>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextArea
                  id="actual-time-notes"
                  labelText={t('notes', 'Notes')}
                  hideLabel
                  rows={5}
                  maxLength={maxActualTimeNotesLength}
                  placeholder={t('notes', 'Notes')}
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  invalid={Boolean(errors.notes)}
                  invalidText={errors.notes?.message as string}
                />
              )}
            />
          </div>
        </ModalBody>

        <ModalFooter>
          <Button kind="secondary" onClick={close} disabled={isUpdating}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button kind="primary" onClick={() => void handleSubmit(onSubmit)()} disabled={isUpdating}>
            {isUpdating ? t('saving', 'Saving...') : t('add', 'Add')}
          </Button>
        </ModalFooter>
      </fieldset>
    </React.Fragment>
  );
};

const AddActualTimeModalWrapper = withOtFreeze(AddActualTimeModal);
export default AddActualTimeModalWrapper;
