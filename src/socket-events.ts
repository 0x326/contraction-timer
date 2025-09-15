import type { TimerState } from './store/timer/timer.slice';

export interface SyncTimeResponsePayload {
  serverTime: number;
}

export interface RequestLeadershipPayload {
  sequenceNumber: number;
}

export interface LeadershipInfoPayload {
  isLeader: boolean;
  sequenceNumber?: number;
  state?: TimerState;
}

export interface TimerStatePayload {
  state: TimerState;
}

export interface TimerStateUpdatePayload extends TimerStatePayload {
  sequenceNumber: number;
}
