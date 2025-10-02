/* eslint-disable sort-imports */
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Modal } from '../modal/modal.component';
import { modalActions } from '../../store/modal/modal.slice';
import { history } from '../../history';
import { Copy } from '../copy/copy.component';
import { buildBackendUrl } from '../../config/backend';
import {
  StyledContent,
  StyledField,
  StyledInput,
  StyledLabel,
  StyledLobbyButton,
  StyledLobbyList,
  StyledLobbyListItem,
  StyledLobbySection,
  StyledLobbySectionHeading,
  StyledRoleFieldset,
  StyledRoleLabel,
  StyledRoleLegend,
  StyledRoleOptions,
} from './welcome-modal.styles';

export const WelcomeModal: React.FC = () => {
  const dispatch = useDispatch();
  const [lobbies, setLobbies] = useState<string[]>([]);
  const [lobby, setLobby] = useState('');
  const [role, setRole] = useState<'recorder' | 'monitor'>('recorder');

  useEffect(() => {
    fetch(buildBackendUrl('/lobbies'))
      .then((res) => res.json())
      .then((data) => setLobbies(data))
      .catch(() => setLobbies([]));
  }, []);

  const handleJoin = () => {
    if (!lobby) return;
    history.push(`/${lobby}/${role}`);
    window.location.reload();
  };

  const handleCancel = () => {
    dispatch(modalActions.close());
  };

  return (
    <Modal
      heading="Choose a patient"
      primaryButtonText="Select"
      primaryButtonOnClick={handleJoin}
      primaryButtonDisabled={!lobby}
      secondaryButtonText="Cancel"
      secondaryButtonOnClick={handleCancel}
    >
      <Copy>
        <StyledContent>
          <StyledRoleFieldset>
            <StyledRoleLegend>Your role</StyledRoleLegend>
            <StyledRoleOptions>
              <StyledRoleLabel htmlFor="role-recorder" $selected={role === 'recorder'}>
                <input
                  id="role-recorder"
                  type="radio"
                  value="recorder"
                  checked={role === 'recorder'}
                  onChange={() => setRole('recorder')}
                />
                Data recorder
              </StyledRoleLabel>
              <StyledRoleLabel htmlFor="role-monitor" $selected={role === 'monitor'}>
                <input
                  id="role-monitor"
                  type="radio"
                  value="monitor"
                  checked={role === 'monitor'}
                  onChange={() => setRole('monitor')}
                />
                Monitor
              </StyledRoleLabel>
            </StyledRoleOptions>
          </StyledRoleFieldset>

          {lobbies.length > 0 && (
            <StyledLobbySection>
              <StyledLobbySectionHeading>
                Choose from an existing patient
              </StyledLobbySectionHeading>

              <StyledLobbyList>
                {lobbies.map((l) => (
                  <StyledLobbyListItem key={l}>
                    <StyledLobbyButton
                      type="button"
                      onClick={() => setLobby(l)}
                      $selected={lobby === l}
                      aria-pressed={lobby === l}
                    >
                      {l}
                    </StyledLobbyButton>
                  </StyledLobbyListItem>
                ))}
              </StyledLobbyList>
            </StyledLobbySection>
          )}

          <StyledField>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <StyledLabel htmlFor="lobby-input">
              {lobbies.length === 0 ? (
                <>
                  Enter a new patient name
                </>
              ) : (
                <>
                  Or enter a new patient name
                </>
              )}
            </StyledLabel>
            <StyledInput
              id="lobby-input"
              value={lobby}
              onChange={(e) => setLobby(e.target.value)}
              list="lobbies"
            />
            <datalist id="lobbies">
              {lobbies.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </datalist>
          </StyledField>
        </StyledContent>
      </Copy>
    </Modal>
  );
};

