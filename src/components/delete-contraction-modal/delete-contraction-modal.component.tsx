/* eslint-disable sort-imports */
import { Copy } from '../copy/copy.component';
import { Modal } from '../modal/modal.component';
import { modalActions } from '../../store/modal/modal.slice';
import React from 'react';
import { timerActions } from '../../store/timer/timer.slice';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from '../../store/root.reducer';

export const DeleteContractionModal: React.FC = () => {
  const dispatch = useDispatch();
  const isLeader = useSelector((state: AppState) => state.leader.isLeader);
  const start = useSelector((state: AppState) => state.modal.contractionStart);

  const closeModal = () => {
    dispatch(modalActions.close());
  };

  const handleConfirmClick = () => {
    if (isLeader && typeof start === 'number') {
      dispatch(timerActions.deleteContraction(start));
    }
    closeModal();
  };

  const handleCancelClick = () => {
    closeModal();
  };

  return (
    <Modal
      heading="Delete contraction"
      primaryButtonText="Confirm"
      primaryButtonOnClick={handleConfirmClick}
      primaryButtonDisabled={!isLeader}
      secondaryButtonText="Cancel"
      secondaryButtonOnClick={handleCancelClick}
    >
      <Copy>
        <p>Are you sure you want to delete this contraction?</p>
      </Copy>
    </Modal>
  );
};
