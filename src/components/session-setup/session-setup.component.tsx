/* eslint-disable sort-imports */
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { sessionSelectors } from '../../store/session/session.selectors';
import { Persona, sessionActions } from '../../store/session/session.slice';

export const SessionSetup: React.FC = () => {
  const dispatch = useDispatch();
  const persona = useSelector(sessionSelectors.getPersona);
  const sessionId = useSelector(sessionSelectors.getSessionId);

  useEffect(() => {
    if (!sessionId) {
      const { hash } = window.location;
      const query = hash.split('?')[1];
      if (query) {
        const params = new URLSearchParams(query);
        const id = params.get('session');
        if (id) {
          dispatch(sessionActions.setSessionId(id));
        }
      }
    }
  }, [dispatch, sessionId]);

  const handlePersona = (p: Persona) => {
    dispatch(sessionActions.setPersona(p));
    if (p === 'mother' && !sessionId) {
      const id = Math.random().toString(36).substring(2, 8);
      dispatch(sessionActions.setSessionId(id));
    }
  };

  useEffect(() => {
    if (persona === 'mother' && sessionId) {
      window.history.replaceState(null, '', `#/?session=${sessionId}`);
    }
  }, [persona, sessionId]);

  if (!persona) {
    return (
      <div>
        <p>Who are you?</p>
        <button type="button" onClick={() => handlePersona('mother')}>Mother</button>
        <button type="button" onClick={() => handlePersona('monitor')}>Monitor</button>
      </div>
    );
  }

  if (persona === 'mother') {
    return (
      <div>
        <p>Share this link with your monitor:</p>
        <p>{`${window.location.origin}${window.location.pathname}#/?session=${sessionId}`}</p>
      </div>
    );
  }

  if (!sessionId) {
    return <p>No session ID provided.</p>;
  }

  return <p>Monitoring session {sessionId}</p>;
};
