import { AppState } from '../root.reducer';

export const sessionSelectors = {
  getPersona: (state: AppState) => state.session.persona,
  getSessionId: (state: AppState) => state.session.sessionId,
};
