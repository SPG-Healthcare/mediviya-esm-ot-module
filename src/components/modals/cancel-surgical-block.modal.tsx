import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfig } from '@openmrs/esm-framework';
import { Button, ModalBody, ModalFooter, ModalHeader, TextInput } from '@carbon/react';
import { navigate, showSnackbar, useStore } from '@openmrs/esm-framework';
import { useSWRConfig } from 'swr';

import { useEditSurgicalBlock } from '../../hooks/useEditSurgicalBlock';
import { revalidateOtData } from '../../utils/revalidateOtData';
import withOtFreeze from '../../enhancers/withOtFreeze';
import { otGlobalStore } from '../../store/globalOtStore';
import { handleFreeze } from '../../utils/helpers';
import { type Config } from '../../config-schema';

interface CancelSurgicalBlockModalProps {
  closeModal: () => void;
  surgicalBlockId: string;
  onSuccess?: () => void;
  startDatetime?: string;
  isOtAdmin?: boolean;
}

const CancelSurgicalBlockModal = ({
  closeModal,
  surgicalBlockId,
  onSuccess,
  startDatetime,
  isOtAdmin,
}: CancelSurgicalBlockModalProps) => {
  const { t } = useTranslation();
  const { otFreezeWindowDaysInAdvance }: Config = useConfig();
  const { mutate } = useSWRConfig();

  const { editSurgicalBlock, isEditing, error: editError } = useEditSurgicalBlock(surgicalBlockId);
  const [voidReason, setVoidReason] = React.useState('');
  const { otfreeze, setOtFreeze } = useStore(otGlobalStore);

  const cancelSurgicalBlock = async () => {
    if (!surgicalBlockId) return;

    try {
      const payload = { voided: true, voidReason: voidReason };

      const response = await editSurgicalBlock(payload);

      if (response?.status === 200) {
        showSnackbar({
          title: t('surgical-block-cancelled', 'Surgical block cancelled'),
          subtitle: t('surgical-block-cancelled-successfully', 'The surgical block has been cancelled successfully'),
          kind: 'success',
          isLowContrast: true,
        });

        await revalidateOtData(mutate);
        closeModal();

        if (onSuccess) {
          onSuccess();
        } else {
          navigate({ to: `${window.spaBase}/home/operation-theater/ot-scheduling` });
        }
      }
    } catch (error) {
      showSnackbar({
        title: t('error-cancelling-surgical-block', 'Error cancelling surgical block'),
        subtitle: t(
          'surgical-block-cancel-error-message',
          'An error occurred while cancelling the surgical block. Please try again.',
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
      <ModalHeader closeModal={closeModal} title={'Cancel Surgical Block'} />
      <fieldset disabled={otfreeze}>
        <ModalBody>
          <p>{t('confirm-cancel-surgical-block', 'Are you sure you want to cancel this surgical block?')}</p>
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
          <Button kind="primary" onClick={cancelSurgicalBlock} disabled={isEditing || voidReason.trim() === ''}>
            {t('confirm', 'Confirm')}
          </Button>
        </ModalFooter>
      </fieldset>
    </>
  );
};

const CancelSurgicalBlockModalWrapper = withOtFreeze(CancelSurgicalBlockModal);
export default CancelSurgicalBlockModalWrapper;
