import { StyledAverages, StyledContainer, StyledTimerView } from './timer-view.styles';
import { Averages } from '../averages/averages.component';
import { Controls } from '../controls/controls.component';
import { LeaderButton } from '../leader-button/leader-button.component';
import React from 'react';
import { Timer } from '../timer/timer.component';

export const TimerView: React.FC = () => (
  <StyledTimerView>
    <StyledContainer>
      <LeaderButton />
      <section>
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
