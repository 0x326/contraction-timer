/* eslint-disable sort-imports, consistent-return */
import React, { useEffect } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import io from 'socket.io-client';
import { sessionSelectors } from '../../store/session/session.selectors';
import { timerActions, TimerState } from '../../store/timer/timer.slice';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:4000';

export const SyncManager: React.FC = () => {
  const persona = useSelector(sessionSelectors.getPersona);
  const sessionId = useSelector(sessionSelectors.getSessionId);
  const store = useStore();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!persona || !sessionId) {
      return;
    }

    const socket = io(SERVER_URL, { autoConnect: true });

    socket.on('connect', () => {
      socket.emit('join', { sessionId, persona });
      if (persona === 'mother') {
        const state: TimerState = (store.getState() as any).timer;
        socket.emit('sync', { sessionId, state });
      }
    });

    socket.on('sync', (state: TimerState) => {
      dispatch(timerActions.setFromServer(state));
    });

    const unsubscribe = store.subscribe(() => {
      if (persona === 'mother' && socket.connected) {
        const state: TimerState = (store.getState() as any).timer;
        socket.emit('sync', { sessionId, state });
      }
    });

    return () => {
      unsubscribe();
      socket.disconnect();
    };
  }, [dispatch, persona, sessionId, store]);

  return null;
};
