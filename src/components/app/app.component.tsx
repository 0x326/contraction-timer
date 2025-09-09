/* eslint-disable sort-imports */
import React, { useEffect } from 'react';
import { BaseCss, NormalizeCss } from './app.styles';
import { Layout } from '../layout/layout.component';
import { ModalRenderer } from '../modal-renderer/modal-renderer.component';
import { useFocusOutlines } from '../../hooks/focus-outlines.hook';
import { ModalType } from '../../models/modal-type.model';
import { modalActions } from '../../store/modal/modal.slice';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';

export const App: React.FC = () => {
  useFocusOutlines();
  const location = useLocation();
  const dispatch = useDispatch();

  useEffect(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments.length < 2) {
      dispatch(modalActions.open(ModalType.Welcome));
    }
  }, [location.pathname, dispatch]);

  return (
    <>
      <NormalizeCss />
      <BaseCss />

      <Layout />
      <ModalRenderer />
    </>
  );
};
