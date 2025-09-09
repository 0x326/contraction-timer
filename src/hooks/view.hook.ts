import { Path } from '../models/path.model';
import { PATH_TO_VIEW_MAP } from '../constants/path.constants';
import { useLocation } from 'react-router-dom';

export const useView = () => {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1] || '';
  const path = (`/${last}`) as Path;
  const safePath = Object.values(Path).includes(path) ? path : Path.Timer;

  return PATH_TO_VIEW_MAP[safePath];
};
