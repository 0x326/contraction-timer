/* eslint-disable sort-imports */
import { FunctionComponent } from 'react';
import { ClearHistoryModal } from '../components/clear-history-modal/clear-history-modal.component';
import { ModalType } from '../models/modal-type.model';
import { WelcomeModal } from '../components/welcome-modal/welcome-modal.component';
import { DeleteContractionModal } from '../components/delete-contraction-modal/delete-contraction-modal.component';

export const MODAL_TYPE_TO_COMPONENT_MAP: Record<ModalType, FunctionComponent> = {
  [ModalType.ClearHistory]: ClearHistoryModal,
  [ModalType.Welcome]: WelcomeModal,
  [ModalType.DeleteContraction]: DeleteContractionModal,
};
