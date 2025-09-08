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
  const { search } = useLocation();
  return (
    <StyledNavLink to={{ pathname: to, search }} exact>
      <StyledIcon>
        <Icon type={icon} size={IconSize.Medium} />
      </StyledIcon>

      {label}
    </StyledNavLink>
  );
};
