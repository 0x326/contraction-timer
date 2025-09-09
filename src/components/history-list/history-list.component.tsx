/* eslint-disable sort-imports */
import { ModalType } from '../../models/modal-type.model';
import { modalActions } from '../../store/modal/modal.slice';
import { AppState } from '../../store/root.reducer';
import { timerSelectors } from '../../store/timer/timer.selectors';
import { Break } from './break/break.component';
import { Contraction } from './contraction/contraction.component';
import { Interval } from './interval/interval.component';
import { useDispatch, useSelector } from 'react-redux';
import React from 'react';

export const HistoryList: React.FC = () => {
  const dispatch = useDispatch();
  const reversedContractions = useSelector(timerSelectors.getReversedCompletedContractionsWithIntervals);
  const maxIndex = reversedContractions.length - 1;
  const isLeader = useSelector((state: AppState) => state.leader.isLeader);

  return (
    <ol aria-label="Contraction history">
      {reversedContractions.map((contraction, index) => (
        <React.Fragment key={contraction.start}>
          <Contraction
            start={contraction.start}
            duration={contraction.duration}
            onDelete={() => dispatch(modalActions.open(ModalType.DeleteContraction, contraction.start))}
            disableDelete={!isLeader}
          />
          {contraction.interval && <Interval duration={contraction.interval} />}
          {index < maxIndex && !contraction.interval && <Break />}
        </React.Fragment>
      ))}
    </ol>
  );
};
