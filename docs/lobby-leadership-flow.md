# Lobby leadership and event flow

This document describes how WebSocket events coordinate lobby leadership in the contraction timer.

## Connection sequence
1. A client connects to the socket server and joins a lobby.
2. The client asks the server to `check-leadership`.
3. The server responds with `leadership-info` describing whether the client is the current leader and the last known sequence number. If a timer state exists it is also sent.
4. Non‑leaders receive `timer-state` broadcasts from the leader whenever the timer changes.

## Single leader
When no leader exists, the first client to request leadership becomes the leader:
1. Client emits `request-leadership` with its sequence number.
2. Server records the client as leader and echoes `leadership-info` (`isLeader: true`).
3. The leader broadcasts `timer-state` updates to all other sockets.

## Transitioning leaders
1. A new client emits `request-leadership`.
2. Server asks the current leader to `transfer-leadership` and temporarily marks all of that leader's sockets as non‑leaders.
3. The old leader sends `final-timer-state` with the latest timer value.
4. Server promotes the new client and emits `leadership-info` to it and `timer-state` to the rest of the lobby.

## Multiple leadership requests
If multiple clients request leadership simultaneously, the server tracks the latest `sequenceNumber`. The client with the most recent sequence number and confirmed transfer becomes leader; others receive `leadership-info` with `isLeader: false`.

## Multiple sockets for one client
A single client may open several tabs. During `check-leadership` the server ensures only one socket belonging to that client retains leadership. Other sockets with the same client ID receive `leadership-info` indicating they are not the leader.

## Inactivity
If all sockets leave a lobby, the lobby state persists for 24 hours before being cleared.
