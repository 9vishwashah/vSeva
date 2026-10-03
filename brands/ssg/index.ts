import type { Brand } from '../types';
import { getMeta } from './meta';
import logo from './assets/ssg-emblem.png';
import logoFull from './assets/ssg-logo-full.png';

export const BRAND: Brand = {
  ...getMeta(import.meta.env),
  logo,
  logoFull,
  logoPadded: false,
};
