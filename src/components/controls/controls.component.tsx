/* eslint-disable sort-imports */
import { StyledControls, StyledPrimary } from './controls.styles';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '../button/button.component';
import { IconType } from '../../models/icon-type.model';
import { PrimaryControl } from './primary-control/primary-control.component';
import { PrimaryControlType } from '../../models/primary-control-type.model';
import React from 'react';
import { Status } from '../../models/status.model';
import { sessionSelectors } from '../../store/session/session.selectors';
import { timerActions } from '../../store/timer/timer.slice';
import { timerSelectors } from '../../store/timer/timer.selectors';

export const Controls: React.FC = () => {
  const dispatch = useDispatch();
  const status = useSelector(timerSelectors.getStatus);
  const persona = useSelector(sessionSelectors.getPersona);
  const primaryType = status === Status.Contraction ? PrimaryControlType.Stop : PrimaryControlType.Start;
  const isMonitor = persona === 'monitor';
  const primaryDisabled = isMonitor;
  const secondaryDisabled = status === Status.Ready || isMonitor;

  const handlePrimaryClick = () => {
    if (isMonitor) {
      return;
    }
    dispatch(timerActions.toggleContraction());
  };

  const handleSecondaryClick = () => {
    if (isMonitor) {
      return;
    }
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
