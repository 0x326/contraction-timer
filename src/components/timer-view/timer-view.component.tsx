/* eslint-disable sort-imports */
import React from 'react';
import { Averages } from '../averages/averages.component';
import { Controls } from '../controls/controls.component';
import { SessionSetup } from '../session-setup/session-setup.component';
import { Timer } from '../timer/timer.component';
import { StyledAverages, StyledContainer, StyledTimerView } from './timer-view.styles';

export const TimerView: React.FC = () => (
  <StyledTimerView>
    <StyledContainer>
      <section>
        <SessionSetup />
        <Timer />
      </section>

      <StyledAverages>
        <Averages />
      </StyledAverages>

      <section>
        <Controls />
      </section>
    </StyledContainer>
  </StyledTimerView>
);
