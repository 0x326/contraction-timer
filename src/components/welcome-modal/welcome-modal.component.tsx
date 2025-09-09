/* eslint-disable sort-imports */
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Modal } from '../modal/modal.component';
import { modalActions } from '../../store/modal/modal.slice';
import { history } from '../../history';

export const WelcomeModal: React.FC = () => {
  const dispatch = useDispatch();
  const [lobbies, setLobbies] = useState<string[]>([]);
  const [lobby, setLobby] = useState('');
  const [role, setRole] = useState<'recorder' | 'monitor'>('recorder');

  useEffect(() => {
    fetch('http://localhost:3001/lobbies')
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
      heading="Join a lobby"
      primaryButtonText="Join"
      primaryButtonOnClick={handleJoin}
      primaryButtonDisabled={!lobby}
      secondaryButtonText="Cancel"
      secondaryButtonOnClick={handleCancel}
    >
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label htmlFor="lobby-input">Lobby</label>
      <input
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

      {lobbies.length > 0 && (
        <ul>
          {lobbies.map((l) => (
            <li key={l}>
              <button type="button" onClick={() => setLobby(l)}>{l}</button>
            </li>
          ))}
        </ul>
      )}

      <fieldset>
        <legend>Role</legend>
        <label htmlFor="role-recorder">
          <input
            id="role-recorder"
            type="radio"
            value="recorder"
            checked={role === 'recorder'}
            onChange={() => setRole('recorder')}
          />
          Recorder
        </label>
        <label htmlFor="role-monitor">
          <input
            id="role-monitor"
            type="radio"
            value="monitor"
            checked={role === 'monitor'}
            onChange={() => setRole('monitor')}
          />
          Monitor
        </label>
      </fieldset>
    </Modal>
  );
};

