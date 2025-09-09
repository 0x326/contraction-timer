/* eslint-disable sort-imports */
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { StyledControls, StyledPrimary } from './controls.styles';
import { Button } from '../button/button.component';
import { PrimaryControl } from './primary-control/primary-control.component';
import { IconType } from '../../models/icon-type.model';
import { PrimaryControlType } from '../../models/primary-control-type.model';
import { Status } from '../../models/status.model';
import { AppState } from '../../store/root.reducer';
import { timerActions } from '../../store/timer/timer.slice';
import { timerSelectors } from '../../store/timer/timer.selectors';

export const Controls: React.FC = () => {
  const dispatch = useDispatch();
  const status = useSelector(timerSelectors.getStatus);
  const isLeader = useSelector((state: AppState) => state.leader.isLeader);
  const primaryType = status === Status.Contraction ? PrimaryControlType.Stop : PrimaryControlType.Start;
  const primaryDisabled = !isLeader;
  const secondaryDisabled = status === Status.Ready || !isLeader;

  const handlePrimaryClick = () => {
    dispatch(timerActions.toggleContraction());
  };

  const handleSecondaryClick = () => {
    dispatch(timerActions.stop());
  };

  return (
    <StyledControls>
      <StyledPrimary>
        <PrimaryControl type={primaryType} onClick={handlePrimaryClick} disabled={primaryDisabled} />
      </StyledPrimary>

      <li>
        <Button label="Take a break" icon={IconType.Pause} disabled={secondaryDisabled} onClick={handleSecondaryClick} />
      </li>
    </StyledControls>
  );
};
