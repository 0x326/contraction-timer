/* eslint-disable sort-imports */
import { StyledContent, StyledLayout } from './layout.styles';
import { Content } from '../content/content.component';
import { Footer } from '../footer/footer.component';
import { Header } from '../header/header.component';
import React from 'react';
import { timerSelectors } from '../../store/timer/timer.selectors';
import { useSelector } from 'react-redux';
import { AppState } from '../../store/root.reducer';

export const Layout: React.FC = () => {
  const status = useSelector(timerSelectors.getStatus);
  const isLeader = useSelector((state: AppState) => state.leader.isLeader);
  const connected = useSelector((state: AppState) => state.connection.connected);

  return (
    <StyledLayout status={status} offline={!connected && !isLeader} data-testid="layout">
      <section>
        <Header />
      </section>

      <StyledContent>
        <Content />
      </StyledContent>

      <section>
        <Footer />
      </section>
    </StyledLayout>
  );
};
