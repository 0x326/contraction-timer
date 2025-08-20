/* eslint-disable sort-imports */
import { Copy } from '../copy/copy.component';
import { Modal } from '../modal/modal.component';
import { modalActions } from '../../store/modal/modal.slice';
import { sessionSelectors } from '../../store/session/session.selectors';
import { timerActions } from '../../store/timer/timer.slice';
import { useDispatch, useSelector } from 'react-redux';
import React from 'react';

export const ClearHistoryModal: React.FC = () => {
  const dispatch = useDispatch();
  const persona = useSelector(sessionSelectors.getPersona);
  const isMonitor = persona === 'monitor';

  const closeModal = () => {
    dispatch(modalActions.close());
  };

  const handleConfirmClick = () => {
    if (isMonitor) {
      return;
    }
    dispatch(timerActions.clearComplete());
    closeModal();
  };

  const handleCancelClick = () => {
    closeModal();
  };

  return (
    <Modal
      heading="Clear history"
      primaryButtonText="Confirm"
      primaryButtonOnClick={handleConfirmClick}
      primaryButtonDisabled={isMonitor}
      secondaryButtonText="Cancel"
      secondaryButtonOnClick={handleCancelClick}
    >
      <Copy>
        <p>Are you sure you want to clear your contraction history?</p>
      </Copy>
    </Modal>
  );
};
