/* eslint-disable sort-imports */
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '../button/button.component';
import { IconType } from '../../models/icon-type.model';
import { leaderActions } from '../../store/leader/leader.slice';
import { AppState } from '../../store/root.reducer';
import { StyledLeaderButton } from './leader-button.styles';

export const LeaderButton: React.FC = () => {
  const dispatch = useDispatch();
  const isLeader = useSelector((state: AppState) => state.leader.isLeader);

  const handleClick = () => {
    dispatch(leaderActions.requestLeader());
  };

  return (
    <StyledLeaderButton>
      <Button label={isLeader ? 'Leader' : 'Become leader'} icon={IconType.Timer} disabled={isLeader} onClick={handleClick} />
    </StyledLeaderButton>
  );
};
