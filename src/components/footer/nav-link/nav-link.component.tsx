/* eslint-disable sort-imports */
import React from 'react';
import { useLocation } from 'react-router-dom';
import { IconSize } from '../../../models/icon-size.model';
import { IconType } from '../../../models/icon-type.model';
import { Icon } from '../../icon/icon.component';
import { StyledIcon, StyledNavLink } from './nav-link.styles';

interface Props {
  to: string;
  icon: IconType;
  label: string;
}

export const NavLink: React.FC<Props> = ({ to, icon, label }) => {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);
  const lobby = segments[0] && segments[0] !== 'history' ? segments[0] : undefined;
  const role = segments[1] && segments[1] !== 'history' ? segments[1] : undefined;
  const base = [lobby, role].filter(Boolean).join('/');
  const prefix = base ? `/${base}` : '';
  const target = to === '/' ? (prefix || '/') : `${prefix}${to}`;

  return (
    <StyledNavLink to={target} exact>
      <StyledIcon>
        <Icon type={icon} size={IconSize.Medium} />
      </StyledIcon>

      {label}
    </StyledNavLink>
  );
};
