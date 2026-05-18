import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfig } from '@openmrs/esm-framework';
import { TFunction } from 'i18next';
import { useForm, Controller, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { launchWorkspace, navigate, showModal, showSnackbar, useStore } from '@openmrs/esm-framework';
import {
  Button,
  DatePicker,
  DatePickerInput,
  Select,
  SelectItem,
  TimePicker,
  TimePickerSelect,
  Heading,
  Section,
  Stack,
  Grid,
  Column,
  Form,
  Tile,
  InlineLoading,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
} from '@carbon/react';
import { Add, Save, Information } from '@carbon/react/icons';

import { formatWithOffset } from '../../utils/dateUtils';
import { ISurgicalAppointment, ISurgicalBlock } from '../../utils/types';
import { surgicalBlockSchema, SurgicalBlockFormData } from '../../schemas/surgicalBlock.schema';
import { useProviders } from '../../hooks/useProviders';
import { useLocations } from '../../hooks/useLocations';
import { useCreateSurgicalBlock } from '../../hooks/useCreateSurgicalBlock';
import { useEditSurgicalBlock } from '../../hooks/useEditSurgicalBlock';

import styles from './new-surgical-block-view.scss';
import { handleFreeze } from '../../utils/helpers';
import { otGlobalStore } from '../../store/globalOtStore';
import withOtFreeze from '../../enhancers/withOtFreeze';
import { type Config } from '../../config-schema';

interface NewSurgicalBlockViewProps {
  isOtAdmin?: boolean;
  isEdit?: boolean;
  surgicalBlock?: ISurgicalBlock;
}

const NewSurgicalBlockView: React.FC<NewSurgicalBlockViewProps> = ({ isOtAdmin, isEdit, surgicalBlock }) => {
  const { t } = useTranslation();
  const { otFreezeWindowDaysInAdvance } : Config = useConfig();
  const { providers, isLoading: isProvidersLoading } = useProviders();
  const { locations, isLoading: isLocationsLoading } = useLocations();
  const { createSurgicalBlock, isCreating, error: createError } = useCreateSurgicalBlock();
  const { editSurgicalBlock, isEditing, error: editError } = useEditSurgicalBlock(surgicalBlock?.uuid);
  const [createdBlock, setCreatedBlock] = useState(null);

  const { otfreeze, setOtFreeze } = useStore(otGlobalStore);

  const isSaving = isCreating || isEditing;

  const {
    control,
    handleSubmit,
    trigger,
    reset,
    formState: { errors, isValid },
  } = useForm<SurgicalBlockFormData>({
    resolver: zodResolver(surgicalBlockSchema),
    mode: 'onChange',
    defaultValues: {
      surgeon: '',
      location: '',
      startTime: '',
      startAmPm: 'AM',
      endTime: '',
      endAmPm: 'AM',
    },
  });

  const launchAddSurgeryWorkspace = (t: TFunction<'translation'>) => {
    launchWorkspace('add-surgical-appointment-workspace', {
      initialQuery: '',
      workspaceTitle: t('add-surgery', 'Add Surgery'),
      state: {
        surgicalBlock: surgicalBlock || createdBlock,
      },
    });
  };

  const launchEditSurgeryWorkspace = (t: TFunction<'translation'>, surgicalAppointment: ISurgicalAppointment) => {
    launchWorkspace('add-surgical-appointment-workspace', {
      initialQuery: '',
      workspaceTitle: t('add-surgery', 'Add Surgery'),
      state: {
        surgicalBlock,
        surgicalAppointment,
      },
    });
  };

  const handleAddSurgery = async () => {
    const isStep1Valid = await trigger();

    if (isStep1Valid) {
      launchAddSurgeryWorkspace(t);
    }
  };

  const onSubmit = async (data: SurgicalBlockFormData) => {
    if (handleFreeze((data || surgicalBlock || createdBlock)?.startDatetime, otFreezeWindowDaysInAdvance)) return;
    try {
      const payload = {
        provider: { uuid: data.surgeon },
        location: { uuid: data.location },
        startDatetime: formatWithOffset(data.startDate, data.startTime, data.startAmPm),
        endDatetime: formatWithOffset(data.endDate, data.endTime, data.endAmPm),
      };

      const response = !isEdit ? await createSurgicalBlock(payload) : await editSurgicalBlock(payload);

      if (response?.status === 201 || response?.status === 200) {
        showSnackbar({
          title: isEdit
            ? t('surgical-block-updated', 'Surgical block updated')
            : t('surgical-block-created', 'Surgical block created'),
          subtitle: isEdit
            ? t('surgical-block-updated-successfully', 'The surgical block has been updated successfully')
            : t('surgical-block-created-successfully', 'The surgical block has been created successfully'),
          kind: 'success',
          isLowContrast: true,
        });
        setCreatedBlock(response.data);
      }
    } catch (error) {
      showSnackbar({
        title: isEdit
          ? t('error-updating-surgical-block', 'Error updating surgical block')
          : t('error-creating-surgical-block', 'Error creating surgical block'),
        subtitle: isEdit
          ? t(
              'surgical-block-update-error-message',
              'An error occurred while updating the surgical block. Please try again.',
            )
          : t('surgical-block-error-message', 'An error occurred while creating the surgical block. Please try again.'),
        kind: 'error',
        isLowContrast: true,
      });
    }
  };

  const onError = (errors: FieldErrors<SurgicalBlockFormData>) => {
    if (errors.endDate?.message) {
      showSnackbar({
        title: t('date-logic-error', 'Date Sequence Error'),
        subtitle: String(errors.endDate.message),
        kind: 'error',
      });
      return;
    }

    if (errors.startDate?.message) {
      showSnackbar({
        title: t('invalid-start-date', 'Invalid Start Date'),
        subtitle: String(errors.startDate.message),
        kind: 'error',
      });
      return;
    }

    const firstError = Object.values(errors)[0];
    if (firstError?.message) {
      showSnackbar({
        title: t('validation-error', 'Validation Error'),
        subtitle: firstError.message as string,
        kind: 'error',
      });
    }
  };

  useEffect(() => {
    if (isEdit && surgicalBlock) {
      try {
        const startDate = surgicalBlock.startDatetime ? new Date(surgicalBlock.startDatetime) : undefined;
        const endDateRaw = (surgicalBlock as any).endDatetime || surgicalBlock.endDatetime || undefined;
        const endDate = endDateRaw ? new Date(endDateRaw) : undefined;

        let startTimeStr = '';
        let startAmPm = 'AM';
        let endTimeStr = '';
        let endAmPm = 'AM';

        if (startDate && startDate instanceof Date && !isNaN(startDate.getTime())) {
          const hours = startDate.getHours();
          startAmPm = hours >= 12 ? 'PM' : 'AM';
          const h = hours % 12 || 12;
          const m = startDate.getMinutes();
          startTimeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        }

        if (endDate && endDate instanceof Date && !isNaN(endDate.getTime())) {
          const hours = endDate.getHours();
          endAmPm = hours >= 12 ? 'PM' : 'AM';
          const h = hours % 12 || 12;
          const m = endDate.getMinutes();
          endTimeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        }

        reset({
          surgeon: surgicalBlock.provider?.uuid || '',
          location: surgicalBlock.location?.uuid || '',
          startDate,
          endDate,
          startTime: startTimeStr,
          startAmPm,
          endTime: endTimeStr,
          endAmPm,
        });
        void trigger();
      } catch (e) {
        // ignore parsing errors
        // console.warn('Error populating form from surgicalBlock', e);
      }
    }
  }, [isEdit, surgicalBlock, reset, trigger]);

  useEffect(() => {
    if (!isEdit) {
      setOtFreeze(false);
      return;
    }
    if (isOtAdmin) {
      setOtFreeze(false);
      return;
    }
    setOtFreeze(handleFreeze((surgicalBlock || createdBlock)?.startDatetime, otFreezeWindowDaysInAdvance));
  }, [isEdit, isOtAdmin, surgicalBlock, createdBlock, setOtFreeze]);

  return (
    <Form aria-label="surgical-block-form" onSubmit={handleSubmit(onSubmit, onError)}>
      <fieldset disabled={otfreeze}>
        <Stack gap={0} className={styles.container}>
          <div className={styles.headerWrapper}>
            <h4 className={styles.headerTitle}>
              {isEdit ? t('edit-surgical-block') : t('add-new-surgical-block', 'Add new surgical block')}
            </h4>
            <div className={styles.headerActions}>
              <Button
                kind="primary"
                renderIcon={Save}
                type="submit"
                style={{ minWidth: '8rem' }}
                disabled={isSaving || otfreeze}
              >
                {isSaving ? <InlineLoading description={t('saving', 'Saving...')} /> : t('save', 'Save')}
              </Button>
              <Button
                kind="secondary"
                onClick={() => {
                  window.history.back();
                }}
                style={{ minWidth: '8rem' }}
                disabled={isCreating || otfreeze}
              >
                {t('discard', 'Discard')}
              </Button>
            </div>
          </div>

          <Tile className={styles.infoBanner}>
            <Information size={20} style={{ marginRight: '8px' }} />
            <span>{t('block-ot-time-info')}</span>
          </Tile>

          <Grid className={styles.mainContent} fullWidth>
            <Column lg={3} md={4} sm={4} className={styles.leftColumn}>
              <Stack gap={6}>
                <Section level={5} className={styles.stepTitle}>
                  <Heading>{t('step-one-surgical-block')}</Heading>
                </Section>

                <Stack gap={5}>
                  <div className={styles.formRow}>
                    <Controller
                      name="surgeon"
                      control={control}
                      render={({ field }) => (
                        <Select
                          id="surgeon-select"
                          labelText={
                            <label className={styles.labelColumn}>
                              {t('surgeon')} <span className={styles.requiredStar}>*</span>
                            </label>
                          }
                          required
                          className={styles.inputColumn}
                          {...field}
                          invalid={!!errors.surgeon}
                          invalidText={errors.surgeon?.message as string}
                        >
                          <SelectItem value="" text={t('select-surgeon')} />
                          {isProvidersLoading ? (
                            <SelectItem value="" text={t('loading')} disabled />
                          ) : (
                            providers.map((provider) => (
                              <SelectItem key={provider.uuid} value={provider.uuid} text={provider.display} />
                            ))
                          )}
                        </Select>
                      )}
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.inputColumn}>
                      <div className={styles.toggleGroup}>
                        <Controller
                          name="location"
                          control={control}
                          render={({ field }) => (
                            <Select
                              id="location-select"
                              labelText={
                                <label className={styles.labelColumn}>
                                  {t('location')} <span className={styles.requiredStar}>*</span>
                                </label>
                              }
                              {...field}
                              invalid={!!errors.location}
                              invalidText={errors.location?.message as string}
                            >
                              <SelectItem value="" text={t('select-location')} />
                              {isLocationsLoading ? (
                                <SelectItem value="" text={t('loading')} disabled />
                              ) : (
                                locations.map((location) => (
                                  <SelectItem key={location.uuid} value={location.uuid} text={location.display} />
                                ))
                              )}
                            </Select>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.inputColumn}>
                      <div className={styles.datetimeGroup}>
                        <Controller
                          name="startDate"
                          control={control}
                          render={({ field: { onChange, value, onBlur } }) => (
                            <DatePicker
                              datePickerType="single"
                              dateFormat="m/d/Y"
                              onChange={(dates) => onChange(dates[0])}
                              value={value ? [value] : []}
                            >
                              <DatePickerInput
                                id="start-date"
                                placeholder="mm/dd/yyyy"
                                labelText={
                                  <label className={styles.labelColumn}>
                                    {t('start-date', 'Start Date')} <span className={styles.requiredStar}>*</span>
                                  </label>
                                }
                                invalid={!!errors.startDate}
                                invalidText={errors.startDate?.message as string}
                                onBlur={onBlur}
                              />
                            </DatePicker>
                          )}
                        />

                        <Controller
                          name="startTime"
                          control={control}
                          render={({ field }) => (
                            <TimePicker
                              id="start-time"
                              labelText={
                                <label className={styles.labelColumn}>
                                  {t('start-time', 'Start Time')} <span className={styles.requiredStar}>*</span>
                                </label>
                              }
                              {...field}
                              pattern="^(0?[1-9]|1[0-2]):[0-5][0-9]$"
                              invalid={!!errors.startTime}
                              invalidText={errors.startTime?.message as string}
                            >
                              <Controller
                                name="startAmPm"
                                control={control}
                                render={({ field: amPmField }) => (
                                  <TimePickerSelect
                                    id="start-time-select"
                                    value={amPmField.value}
                                    onChange={(e) => amPmField.onChange(e)}
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
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.inputColumn}>
                      <div className={styles.datetimeGroup}>
                        <Controller
                          name="endDate"
                          control={control}
                          render={({ field: { onChange, value, onBlur } }) => (
                            <DatePicker
                              datePickerType="single"
                              dateFormat="m/d/Y"
                              onChange={(dates) => onChange(dates[0])}
                              value={value ? [value] : []}
                            >
                              <DatePickerInput
                                id="end-date"
                                placeholder="mm/dd/yyyy"
                                labelText={
                                  <label className={styles.labelColumn}>
                                    {t('end-date-time')} <span className={styles.requiredStar}>*</span>
                                  </label>
                                }
                                invalid={!!errors.endDate}
                                invalidText={errors.endDate?.message as string}
                                onBlur={onBlur}
                              />
                            </DatePicker>
                          )}
                        />

                        <Controller
                          name="endTime"
                          control={control}
                          render={({ field }) => (
                            <TimePicker
                              id="end-time"
                              labelText={
                                <label className={styles.labelColumn}>
                                  {t('end-date-time')} <span className={styles.requiredStar}>*</span>
                                </label>
                              }
                              {...field}
                              pattern="^(0?[1-9]|1[0-2]):[0-5][0-9]$"
                              invalid={!!errors.endTime}
                              invalidText={errors.endTime?.message as string}
                            >
                              <Controller
                                name="endAmPm"
                                control={control}
                                render={({ field: amPmField }) => (
                                  <TimePickerSelect
                                    id="end-time-select"
                                    value={amPmField.value}
                                    onChange={(e) => amPmField.onChange(e)}
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
                  </div>
                </Stack>

                <Button
                  kind="danger"
                  size="md"
                  disabled={otfreeze}
                  onClick={() => {
                    if (otfreeze) return;

                    const dispose = showModal('cancel-surgical-block-modal', {
                      closeModal: () => dispose(),
                      surgicalBlockId: surgicalBlock?.uuid || createdBlock?.uuid,
                      startDateTime: (surgicalBlock || createdBlock)?.startDatetime,
                    });
                  }}
                >
                  {t('cancel-block', 'Cancel Block')}
                </Button>
              </Stack>
            </Column>

            <Column lg={13} md={4} sm={4} className={styles.rightColumn}>
              <Stack gap={5}>
                <div className={styles.step2Header}>
                  <Section level={5} className={styles.stepTitle}>
                    <Heading style={{ margin: 0 }}>{t('step-two-add-surgery', 'Step Two: Add Surgery')}</Heading>
                  </Section>

                  <Button
                    renderIcon={Add}
                    size="sm"
                    kind="tertiary"
                    onClick={() => {
                      if (otfreeze) return;

                      handleAddSurgery();
                    }}
                    disabled={!isValid || otfreeze}
                  >
                    {t('add-surgery', 'Add Surgery')}
                  </Button>
                </div>

                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>{t('surgery-details')}</TableHeader>
                      <TableHeader>{t('estimated-time', 'Estimated Time')}</TableHeader>
                      <TableHeader>{t('action')}</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {!surgicalBlock ||
                    surgicalBlock.surgicalAppointments.filter((surgery) => surgery.status !== 'CANCELLED').length ===
                      0 ? (
                      <TableRow className={styles.emptyState}>
                        <TableCell>{t('no-surgeries-added', 'No surgery added')}</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    ) : (
                      surgicalBlock.surgicalAppointments
                        .sort((a, b) => a.id - b.id)
                        .filter((surgery) => surgery?.status !== 'CANCELLED')
                        .map((surgery) => (
                          <TableRow key={surgery.uuid}>
                            {/* <TableCell>{surgery.patient.display}</TableCell> */}
                            <TableCell
                              className={styles['link-cell']}
                              onClick={() =>
                                navigate({ to: `${window.spaBase}/patient/${surgery.patient.uuid}/chart` })
                              }
                            >
                              <a>{surgery.patient.display}</a>
                            </TableCell>

                            <TableCell>
                              {surgery.surgicalAppointmentAttributes.find(
                                (attr) => attr.surgicalAppointmentAttributeType?.name === 'estTimeHours',
                              )?.value || 0}
                              h{' '}
                              {surgery.surgicalAppointmentAttributes.find(
                                (attr) => attr.surgicalAppointmentAttributeType?.name === 'estTimeMinutes',
                              )?.value || 0}
                              m
                            </TableCell>
                            <TableCell>
                              <Button
                                disabled={otfreeze}
                                kind="ghost"
                                size="sm"
                                onClick={() => {
                                  if (otfreeze) return;
                                  launchEditSurgeryWorkspace(t, surgery);
                                }}
                              >
                                {t('edit', 'Edit')}
                              </Button>
                              <Button
                                kind="danger--ghost"
                                size="sm"
                                disabled={otfreeze}
                                onClick={() => {
                                  if (otfreeze) return;

                                  const dispose = showModal('cancel-surgical-appointment-modal', {
                                    closeModal: () => dispose(),
                                    surgicalAppointmentId: surgery.uuid,
                                    startDateTime: (surgicalBlock || createdBlock)?.startDatetime,
                                  });
                                }}
                              >
                                {t('cancel', 'Cancel')}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </Stack>
            </Column>
          </Grid>
        </Stack>
      </fieldset>
    </Form>
  );
};

const NewSurgicalBlockViewWrapper = withOtFreeze(NewSurgicalBlockView);
export default NewSurgicalBlockViewWrapper;
