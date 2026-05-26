import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfig } from '@openmrs/esm-framework';
import { Controller, useForm } from 'react-hook-form';
import { Button, Form, Select, SelectItem, Stack, TextInput } from '@carbon/react';
import { ExtensionSlot, showSnackbar, useStore } from '@openmrs/esm-framework';
import { useSWRConfig } from 'swr';

import SelectedPatient from '../selected-patient/selected-patient.component';
import { useSurgicalAppointmentAttributeTypes } from '../../hooks/useSurgicalAppointmentAttributeTypes';
import { useProviders } from '../../hooks/useProviders';
import { ISurgicalAppointment, ISurgicalBlock } from '../../utils/types';
import { useEditSurgicalBlock } from '../../hooks/useEditSurgicalBlock';
import { useEditSurgicalAppointment } from '../../hooks/useEditSurgicalAppointment';
import { revalidateOtData } from '../../utils/revalidateOtData';
import { otGlobalStore } from '../../store/globalOtStore';
import { handleFreeze } from '../../utils/helpers';
import withOtFreeze from '../../enhancers/withOtFreeze';
import { SurgicalAppointmentInputTypeEnum } from '../../utils/constants';

import styles from './surgical-appointment-form.scss';
import { type Config } from '../../config-schema';

interface SurgicalAppointmentFormData {
  isOtAdmin?: boolean;
  state: {
    surgicalBlock: ISurgicalBlock;
    surgicalAppointment?: ISurgicalAppointment;
  };
  closeWorkspace?: () => void;
}

interface SurgicalAppointmentFormValues {
  [key: string]: string;
  patient: string;
  procedure: string;
  estTimeHours: string;
  estTimeMinutes: string;
  cleaningTime: string;
  otherSurgeon: string;
  surgicalAssistant: string;
  anaesthetist: string;
  scrubNurse: string;
  circulatingNurse: string;
  notes: string;
}

const SurgicalAppointmentForm: React.FC<SurgicalAppointmentFormData> = ({ isOtAdmin, state, closeWorkspace }) => {
  const { t } = useTranslation();
  const { otFreezeWindowDaysInAdvance }: Config = useConfig();
  const { mutate } = useSWRConfig();

  const { data: surgicalAppointmentAttributes } = useSurgicalAppointmentAttributeTypes();
  const { providers } = useProviders();

  const { editSurgicalBlock, error: editError } = useEditSurgicalBlock(state.surgicalBlock?.uuid);
  const { editSurgicalAppointment, error: editAppointmentError } = useEditSurgicalAppointment(
    state.surgicalAppointment?.uuid,
  );

  const [patientId, setPatientId] = useState('');

  const { otfreeze, setOtFreeze } = useStore(otGlobalStore);

  const { control, handleSubmit, resetField, reset } = useForm<SurgicalAppointmentFormValues>({
    mode: 'onSubmit',
    defaultValues: {
      patient: '',
      procedure: '',
      estTimeHours: '',
      estTimeMinutes: '',
      cleaningTime: '',
      otherSurgeon: '',
      surgicalAssistant: '',
      anaesthetist: '',
      scrubNurse: '',
      circulatingNurse: '',
      notes: '',
    },
  });

  const hasAvailableSlot = (data: SurgicalAppointmentFormValues) => {
    const start = state.surgicalBlock?.startDatetime ? new Date(state.surgicalBlock.startDatetime).getTime() : NaN;
    const end = state.surgicalBlock?.endDatetime ? new Date(state.surgicalBlock.endDatetime).getTime() : NaN;

    if (isNaN(start) || isNaN(end)) {
      return false;
    }

    const blockDurationMinutes = Math.max(0, Math.round((end - start) / 60000));

    const scheduledMinutes =
      state.surgicalBlock?.surgicalAppointments?.reduce((sum, appointment) => {
        if (appointment.uuid === state.surgicalAppointment?.uuid) {
          return sum;
        }

        const getValue = (name: string) =>
          appointment.surgicalAppointmentAttributes?.find(
            (attr) => attr.surgicalAppointmentAttributeType?.name === name,
          )?.value;

        const hours = Number(getValue('estTimeHours') || 0);
        const minutes = Number(getValue('estTimeMinutes') || 0);
        const cleaning = Number(getValue('cleaningTime') || 0);

        return sum + hours * 60 + minutes + cleaning;
      }, 0) ?? 0;

    const newAppointmentMinutes =
      Number(data?.estTimeHours || 0) * 60 + Number(data?.estTimeMinutes || 0) + Number(data?.cleaningTime || 0);

    return scheduledMinutes + newAppointmentMinutes <= blockDurationMinutes;
  };

  const buildSurgicalAppointmentAttributesPayload = (data: SurgicalAppointmentFormValues) =>
    surgicalAppointmentAttributes
      .filter((attributeType) => attributeType.uuid && attributeType.name)
      .map((attributeType) => ({
        surgicalAppointmentAttributeType: {
          uuid: attributeType.uuid,
        },
        value: data[attributeType.name] ?? '',
      }));

  async function onSubmit(data: SurgicalAppointmentFormValues) {
    if (data.patient === '') {
      showSnackbar({
        title: t('patient-required', 'Patient ID is required'),
        subtitle: t(
          'patient-required-subtitle',
          'Please provide a valid Patient ID to proceed with the surgical appointment.',
        ),
        kind: 'error',
        isLowContrast: true,
      });
      return;
    }

    if (!hasAvailableSlot(data)) {
      showSnackbar({
        title: t('no-available-slot', 'No available slot'),
        subtitle: t(
          'no-available-slot-subtitle',
          'The estimated time for this surgical appointment exceeds the available time in the surgical block. Please adjust the estimated time or choose a different surgical block.',
        ),
        kind: 'error',
        isLowContrast: true,
      });
      return;
    }

    try {
      const surgicalAppointmentAttributesPayload = buildSurgicalAppointmentAttributesPayload(data);

      const editSurgicalAppointmentAttributesPayload = surgicalAppointmentAttributesPayload.map((attribute) => {
        const existingAttribute = state?.surgicalAppointment?.surgicalAppointmentAttributes?.find(
          (appointmentAttribute) =>
            appointmentAttribute.surgicalAppointmentAttributeType?.uuid ===
            attribute.surgicalAppointmentAttributeType?.uuid,
        );

        return existingAttribute ? { ...attribute, uuid: existingAttribute.uuid } : attribute;
      });

      const surgicalAppointment = {
        patient: data.patient,
        status: 'SCHEDULED',
        surgicalAppointmentAttributes: surgicalAppointmentAttributesPayload,
      };

      const editedSurgicalBlock = {
        location: { uuid: state.surgicalBlock?.location.uuid },
        provider: { uuid: state.surgicalBlock?.provider.uuid },
        startDatetime: state.surgicalBlock?.startDatetime,
        endDatetime: state.surgicalBlock?.endDatetime,
        surgicalAppointments: [surgicalAppointment],
      };

      const editedSurgicalAppointment = {
        patient: data.patient,
        surgicalBlock: state?.surgicalBlock?.uuid,
        surgicalAppointmentAttributes: editSurgicalAppointmentAttributesPayload,
      };

      const response = !state.surgicalAppointment
        ? await editSurgicalBlock(editedSurgicalBlock)
        : await editSurgicalAppointment(editedSurgicalAppointment);

      if (response?.status === 201 || response?.status === 200) {
        showSnackbar({
          title: state?.surgicalAppointment
            ? t('surgical-appointment-updated', 'Surgical appointment updated')
            : t('surgical-appointment-created', 'Surgical appointment created'),
          subtitle: state?.surgicalAppointment
            ? t('surgical-appointment-updated-successfully', 'The surgical appointment has been updated successfully')
            : t('surgical-appointment-created-successfully', 'The surgical appointment has been created successfully'),
          kind: 'success',
          isLowContrast: true,
        });
        await revalidateOtData(mutate);
        closeWorkspace?.();
      }
    } catch (error) {
      showSnackbar({
        title: state?.surgicalAppointment
          ? t('surgical-appointment-update-failed', 'Surgical appointment update failed')
          : t('surgical-appointment-creation-failed', 'Surgical appointment creation failed'),
        subtitle: state?.surgicalAppointment
          ? t(
              'surgical-appointment-update-failed-subtitle',
              'An error occurred while updating the surgical appointment',
            )
          : t(
              'surgical-appointment-creation-failed-subtitle',
              'An error occurred while creating the surgical appointment',
            ),
        kind: 'error',
        isLowContrast: true,
      });
    }
  }

  useEffect(() => {
    if (isOtAdmin) {
      setOtFreeze(false);
    } else {
      setOtFreeze(handleFreeze(state.surgicalBlock?.startDatetime, otFreezeWindowDaysInAdvance));
    }
  }, []);

  useEffect(() => {
    if (patientId) resetField('patient', { defaultValue: patientId });
  }, [patientId]);

  useEffect(() => {
    if (state.surgicalAppointment) {
      setPatientId(state.surgicalAppointment.patient?.uuid || '');

      const appointmentAttrs = state.surgicalAppointment.surgicalAppointmentAttributes ?? [];
      const dynamicDefaults: Record<string, any> = {
        patient: state.surgicalAppointment.patient?.uuid || '',
      };

      const attributeNames =
        surgicalAppointmentAttributes?.length > 0
          ? surgicalAppointmentAttributes.map((a) => a.name)
          : appointmentAttrs.map((a) => a.surgicalAppointmentAttributeType?.name).filter(Boolean);

      attributeNames.forEach((name) => {
        const found = appointmentAttrs.find(
          (a) =>
            a.surgicalAppointmentAttributeType?.name === name ||
            a.surgicalAppointmentAttributeType?.uuid ===
              surgicalAppointmentAttributes?.find((t) => t.name === name)?.uuid,
        );
        dynamicDefaults[name] = found?.value ?? '';
      });

      reset(dynamicDefaults);
    }
  }, [state.surgicalAppointment]);

  return (
    <Stack className={styles.formWrapper} gap={6}>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <fieldset disabled={otfreeze}>
          <Stack>
            {!patientId ? (
              <ExtensionSlot
                name="patient-search-bar-slot"
                state={{
                  selectPatientAction: (patientUuid) => {
                    setPatientId(patientUuid);
                  },
                }}
              />
            ) : (
              <Controller
                name="patient"
                control={control}
                render={({ field }) => {
                  return (
                    <SelectedPatient
                      {...field}
                      patientUuid={patientId}
                      setPatientId={setPatientId}
                      resetField={resetField}
                    />
                  );
                }}
              />
            )}

            {surgicalAppointmentAttributes
              .sort((a, b) => a.sortWeight - b.sortWeight)
              .map((attr) => {
                const attributeLabel = attr.name === 'otherSurgeon' ? t('other-surgeon', 'Other Surgeon') : attr.name;

                if (attr.format === SurgicalAppointmentInputTypeEnum.provider) {
                  return (
                    <Controller
                      name={attr.name}
                      control={control}
                      defaultValue=""
                      render={({ field }) => {
                        return (
                          <Select id={`select-${attr.name}`} labelText={attributeLabel} {...field}>
                            <SelectItem
                              key="default"
                              value=""
                              text={
                                attr.name === 'otherSurgeon'
                                  ? t('select-other-surgeon', 'Select other surgeon')
                                  : t('select-provider', 'Select provider')
                              }
                            />
                            {providers &&
                              providers.map((provider) => (
                                <SelectItem key={provider.uuid} value={provider.uuid} text={provider.display} />
                              ))}
                          </Select>
                        );
                      }}
                    />
                  );
                }
                return (
                  <Controller
                    name={attr.name}
                    control={control}
                    defaultValue=""
                    render={({ field }) => {
                      return (
                        <TextInput
                          {...field}
                          id={`write-${attr.name}`}
                          labelText={attr.name}
                          type={attr.name.startsWith('estTime') || attr.name === 'cleaningTime' ? 'number' : 'text'}
                          min={attr.name.startsWith('estTime') || attr.name === 'cleaningTime' ? 0 : undefined}
                        />
                      );
                    }}
                  />
                );
              })}

            <Stack orientation="horizontal" className={styles.submitButtonContainer} gap={4}>
              <Button type="submit" disabled={otfreeze}>
                {t('submit', 'Submit')}
              </Button>
            </Stack>
          </Stack>
        </fieldset>
      </Form>
    </Stack>
  );
};

const SurgicalAppointmentFormWrapper = withOtFreeze(SurgicalAppointmentForm);
export default SurgicalAppointmentFormWrapper;
