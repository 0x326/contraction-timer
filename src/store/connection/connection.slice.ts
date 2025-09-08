import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ConnectionState {
  connected: boolean;
}

const initialState: ConnectionState = {
  connected: true,
};

const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload;
    },
  },
});

export const connectionActions = connectionSlice.actions;
export const connectionReducer = connectionSlice.reducer;
