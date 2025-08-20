/* eslint-disable sort-imports */
import React from 'react';
import { useFocusOutlines } from '../../hooks/focus-outlines.hook';
import { Layout } from '../layout/layout.component';
import { ModalRenderer } from '../modal-renderer/modal-renderer.component';
import { SyncManager } from '../sync-manager/sync-manager.component';
import { BaseCss, NormalizeCss } from './app.styles';

export const App: React.FC = () => {
  useFocusOutlines();

  return (
    <>
      <NormalizeCss />
      <BaseCss />

      <Layout />
      <ModalRenderer />
      <SyncManager />
    </>
  );
};
