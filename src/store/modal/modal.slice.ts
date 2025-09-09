import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ModalType } from '../../models/modal-type.model';

export interface ModalState {
  active?: ModalType;
  contractionStart?: number;
}

const initialState: ModalState = {};

const modalSlice = createSlice({
  name: 'modal',
  initialState,
  reducers: {
    close: (state) => {
      state.active = undefined;
      state.contractionStart = undefined;
    },
    open: {
      prepare: (modal: ModalType, contractionStart?: number) => ({
        payload: { modal, contractionStart },
      }),
      reducer: (state, action: PayloadAction<{ modal: ModalType; contractionStart?: number }>) => {
        state.active = action.payload.modal;
        state.contractionStart = action.payload.contractionStart;
      },
    },
  },
});

export const modalActions = modalSlice.actions;
export const modalReducer = modalSlice.reducer;
