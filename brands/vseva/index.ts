import type { Brand } from '../types';
import { getMeta } from './meta';
import logo from '../../assets/vseva-logo-420.png'; // 420 px copy of vseva-logo-removebg-preview.png (90 KB): same look, 14 KB
import partnerLogo from '../../assets/vsg.jpg';

export const BRAND: Brand = {
  ...getMeta(import.meta.env),
  logo,
  logoFull: logo,
  logoPadded: true,
  partnerLogo,
};
