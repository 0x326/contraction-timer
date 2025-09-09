import { Route, Switch } from 'react-router-dom';
import { Container } from '../container/container.component';
import { HistoryView } from '../history-view/history-view.component';
import React from 'react';
import { StyledContent } from './content.styles';
import { TimerView } from '../timer-view/timer-view.component';

export const Content: React.FC = () => (
  <StyledContent>
    <Container fullHeight padded>
      <Switch>
        <Route path="/:lobby?/:role?/history" exact>
          <HistoryView />
        </Route>

        <Route path="/:lobby?/:role?" exact>
          <TimerView />
        </Route>
      </Switch>
    </Container>
  </StyledContent>
);
