import { StyledContraction, StyledDate, StyledDeleteButton, StyledDuration } from './contraction.styles';
import { formatDuration } from '../../../utils/format-duration.util';
import { formatTimeAndDate } from '../../../utils/format-time-and-date.util';
import { Icon } from '../../icon/icon.component';
import { IconSize } from '../../../models/icon-size.model';
import { IconType } from '../../../models/icon-type.model';
import React from 'react';

interface Props {
  start: number;
  duration: number;
  onDelete: () => void;
  disableDelete?: boolean;
}

export const Contraction: React.FC<Props> = ({ start, duration, onDelete, disableDelete = false }) => (
  <StyledContraction>
    <StyledDuration>{formatDuration(duration)}</StyledDuration>
    <StyledDate>{formatTimeAndDate(start)}</StyledDate>
    <StyledDeleteButton aria-label="Delete" onClick={onDelete} disabled={disableDelete}>
      <Icon type={IconType.Clear} size={IconSize.Small} />
    </StyledDeleteButton>
  </StyledContraction>
);
