import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type Persona = 'mother' | 'monitor';

export interface SessionState {
  persona?: Persona;
  sessionId?: string;
}

const initialState: SessionState = {};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setPersona: (state, action: PayloadAction<Persona>) => {
      state.persona = action.payload;
    },
    setSessionId: (state, action: PayloadAction<string>) => {
      state.sessionId = action.payload;
    },
  },
});

export const sessionActions = sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;
