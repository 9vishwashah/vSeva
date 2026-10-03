import type { Brand } from '../types';
import { getMeta } from './meta';
import logo from '../../assets/vseva-logo-removebg-preview.png';

export const BRAND: Brand = {
  ...getMeta(import.meta.env),
  logo,
  logoFull: logo,
  logoPadded: true,
};
