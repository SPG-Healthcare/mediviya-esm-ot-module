import React, { useEffect } from 'react';
import { Button, ModalBody, ModalFooter, ModalHeader, TextInput } from '@carbon/react';
import { showSnackbar, useStore } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import { useConfig } from '@openmrs/esm-framework';
import { useSWRConfig } from 'swr';

import { useEditSurgicalAppointment } from '../../hooks/useEditSurgicalAppointment';
import { revalidateOtData } from '../../utils/revalidateOtData';
import { otGlobalStore } from '../../store/globalOtStore';
import { handleFreeze } from '../../utils/helpers';
import withOtFreeze from '../../enhancers/withOtFreeze';
import { type Config } from '../../config-schema';

interface CancelSurgicalAppointmentModalProps {
  isOtAdmin?: boolean;
  startDatetime?: string;
  closeModal: () => void;
  surgicalAppointmentId: string;
}

const CancelSurgicalAppointmentModal = ({
  isOtAdmin,
  startDatetime,
  closeModal,
  surgicalAppointmentId,
}: CancelSurgicalAppointmentModalProps) => {
  const { t } = useTranslation();
  const { otFreezeWindowDaysInAdvance }: Config = useConfig();
  const { mutate } = useSWRConfig();

  const {
    editSurgicalAppointment,
    isEditing,
    error: editAppointmentError,
  } = useEditSurgicalAppointment(surgicalAppointmentId);
  const [voidReason, setVoidReason] = React.useState('');

  const { otfreeze, setOtFreeze } = useStore(otGlobalStore);

  const cancelSurgicalAppointment = async () => {
    if (!surgicalAppointmentId) return;

    try {
      const payload = { status: 'CANCELLED', notes: voidReason };

      const response = await editSurgicalAppointment(payload);

      if (response?.status === 200) {
        showSnackbar({
          title: t('surgical-appintment-cancelled', 'Surgical appointment cancelled'),
          subtitle: t(
            'surgical-appointemnt-cancelled-successfully',
            'The surgical appointment has been cancelled successfully',
          ),
          kind: 'success',
          isLowContrast: true,
        });
        await revalidateOtData(mutate);
        closeModal();
      }
    } catch (error) {
      showSnackbar({
        title: t('error-cancelling-surgical-appointment', 'Error cancelling surgical appointment'),
        subtitle: t(
          'surgical-appointment-cancel-error-message',
          'An error occurred while cancelling the surgical appointment. Please try again.',
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
      setOtFreeze(handleFreeze(startDatetime, otFreezeWindowDaysInAdvance));
    }
  }, []);

  return (
    <>
      <ModalHeader title="Cancel Surgical Appointments" closeModal={closeModal} />
      <fieldset disabled={otfreeze}>
        <ModalBody>
          <p>
            {t('confirm-cancel-surgical-appointment', 'Are you sure you want to cancel this surgical appointment?')}
          </p>
          <hr />
          <TextInput
            onChange={(e) => {
              setVoidReason(e.currentTarget.value);
            }}
            id="voidReason"
            labelText={null}
            placeholder={t('enter-reason-for-cancellation', 'Enter reason for cancellation')}
          />
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={closeModal}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button kind="primary" onClick={cancelSurgicalAppointment} disabled={isEditing || voidReason.trim() === ''}>
            {t('confirm', 'Confirm')}
          </Button>
        </ModalFooter>
      </fieldset>
    </>
  );
};

const CancelSurgicalAppointmentModalWrapper = withOtFreeze(CancelSurgicalAppointmentModal);
export default CancelSurgicalAppointmentModalWrapper;
  