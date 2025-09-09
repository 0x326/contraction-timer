/* eslint-disable sort-imports */
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Modal } from '../modal/modal.component';
import { Copy } from '../copy/copy.component';
import { modalActions } from '../../store/modal/modal.slice';
import { leaderActions } from '../../store/leader/leader.slice';
import { AppState } from '../../store/root.reducer';

export const RequestLeadershipModal: React.FC = () => {
  const dispatch = useDispatch();
  const isLeader = useSelector((state: AppState) => state.leader.isLeader);
  const [requesting, setRequesting] = useState(false);

  const handleConfirmClick = () => {
    dispatch(leaderActions.requestLeadership());
    setRequesting(true);
  };

  const handleCancelClick = () => {
    dispatch(modalActions.close());
  };

  useEffect(() => {
    if (requesting && isLeader) {
      dispatch(modalActions.close());
    }
  }, [requesting, isLeader, dispatch]);

  return (
    <Modal
      heading="Take leadership"
      primaryButtonText={requesting ? 'Taking leadership...' : 'Take leadership'}
      primaryButtonOnClick={handleConfirmClick}
      primaryButtonDisabled={requesting}
      secondaryButtonText="Cancel"
      secondaryButtonOnClick={handleCancelClick}
    >
      <Copy>
        <p>Would you like to request leadership? Doing so will take leadership away from the current leader.</p>
      </Copy>
    </Modal>
  );
};
