import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface LeaderState {
  isLeader: boolean;
}

const initialState: LeaderState = {
  isLeader: false,
};

const leaderSlice = createSlice({
  name: 'leader',
  initialState,
  reducers: {
    setLeader: (state, action: PayloadAction<boolean>) => {
      state.isLeader = action.payload;
    },
    requestLeadership: (state) => state,
  },
});

export const leaderActions = leaderSlice.actions;
export const leaderReducer = leaderSlice.reducer;
