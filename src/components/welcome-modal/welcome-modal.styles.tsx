import {
  borderRadius,
  borderWidth,
  color,
  fontSize,
  pxToRem,
  spacing,
  transitionDuration,
} from '../../theme/helpers/theme.helpers';
import styled from 'styled-components';

export const StyledContent = styled.div`
  display: flex;
  flex-direction: column;

  > * + * {
    margin-top: ${spacing('l')};
  }
`;

export const StyledField = styled.div`
  display: flex;
  flex-direction: column;

  > * + * {
    margin-top: ${spacing('s')};
  }
`;

export const StyledLabel = styled.label`
  color: ${color('neutralMid2')};
  font-weight: bold;
`;

export const StyledInput = styled.input`
  width: 100%;
  padding: ${spacing('s')} ${spacing('m')};
  transition: border-color ${transitionDuration('m')}, box-shadow ${transitionDuration('m')};
  border: ${borderWidth('s')} solid ${color('neutralMax25')};
  border-radius: ${borderRadius('s')};
  background-color: ${color('neutralMin')};
  color: ${color('neutralMid2')};

  &:hover {
    border-color: ${color('rest')};
  }

  &:focus-visible {
    border-color: ${color('rest')};
    outline: none;
    box-shadow: 0 0 0 ${borderWidth('s')} ${color('rest')};
  }
`;

export const StyledLobbySection = styled.section`
  padding: ${spacing('m')};
  border: ${borderWidth('s')} solid ${color('neutralMax25')};
  border-radius: ${borderRadius('m')};
  background-color: ${color('neutralMin')};
  box-shadow: 0 ${pxToRem(4)} ${pxToRem(12)} ${color('neutralMax25')};

  > * + * {
    margin-top: ${spacing('m')};
  }
`;

export const StyledLobbySectionHeading = styled.p`
  margin: 0;
  color: ${color('neutralMid1')};
  font-size: ${fontSize('s')};
  font-weight: bold;
  letter-spacing: ${pxToRem(1)};
  text-transform: uppercase;
`;

export const StyledLobbyList = styled.ul`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(${pxToRem(140)}, 1fr));
  gap: ${spacing('s')};
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const StyledLobbyListItem = styled.li`
  display: flex;
`;

type LobbyButtonProps = {
  $selected: boolean;
};

export const StyledLobbyButton = styled.button<LobbyButtonProps>`
  flex: 1;
  padding: ${spacing('m')};
  transition: border-color ${transitionDuration('m')}, box-shadow ${transitionDuration('m')}, transform ${transitionDuration('m')};
  border: ${borderWidth('s')} solid ${({ theme, $selected }) => ($selected ? theme.color.rest : theme.color.neutralMax25)};
  border-radius: ${borderRadius('m')};
  background-color: ${({ theme, $selected }) => ($selected ? theme.color.neutralMin75 : theme.color.neutralMin)};
  box-shadow: ${({ theme, $selected }) => ($selected ? `0 ${pxToRem(4)} ${pxToRem(12)} ${theme.color.neutralMax25}` : 'none')};
  color: ${color('neutralMid2')};
  font-weight: bold;
  text-align: center;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    transform: translateY(-${pxToRem(2)});
    border-color: ${({ theme }) => theme.color.rest};
    outline: none;
    box-shadow: 0 ${pxToRem(4)} ${pxToRem(12)} ${({ theme }) => theme.color.neutralMax25};
  }

  &:active {
    transform: translateY(0);
  }
`;

export const StyledRoleFieldset = styled.fieldset`
  margin: 0;
  padding: ${spacing('m')};
  border: ${borderWidth('s')} solid ${color('neutralMax25')};
  border-radius: ${borderRadius('m')};
  background-color: ${color('neutralMin')};
`;

export const StyledRoleLegend = styled.legend`
  margin: 0 0 ${spacing('s')};
  color: ${color('neutralMid2')};
  font-weight: bold;
`;

export const StyledRoleOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing('s')};
`;

type RoleLabelProps = {
  $selected: boolean;
};

export const StyledRoleLabel = styled.label<RoleLabelProps>`
  display: inline-flex;
  align-items: center;
  gap: ${spacing('s')};
  padding: ${spacing('s')} ${spacing('m')};
  transition: border-color ${transitionDuration('m')}, background-color ${transitionDuration('m')};
  border: ${borderWidth('s')} solid ${({ theme, $selected }) => ($selected ? theme.color.rest : theme.color.neutralMax25)};
  border-radius: ${borderRadius('xl')};
  background-color: ${({ theme, $selected }) => ($selected ? theme.color.neutralMin75 : theme.color.neutralMin)};
  color: ${color('neutralMid2')};
  cursor: pointer;

  input {
    margin: 0;
  }

  &:hover,
  &:focus-within {
    border-color: ${({ theme }) => theme.color.rest};
  }
`;
