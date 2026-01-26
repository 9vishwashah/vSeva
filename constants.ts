import { AreaRoute, Organization, UserProfile, UserRole, ViharEntry } from './types';

export const MOCK_ORG: Organization = {
  id: 'org_1',
  name: 'Vashi Jain Sangh',
  code: 'VASHI'
};

export const MOCK_USERS: UserProfile[] = [
  {
    id: 'admin_1',
    role: UserRole.ORG_ADMIN,
    name: 'Jay Arihant',
    username: 'admin@vihar.com',
    organization_id: 'org_1',
    mobile: '9999999999'
  },
  {
    id: 'sevak_1',
    role: UserRole.SEVAK,
    name: 'Vishwa Shah',
    username: 'vishwashah@vsevak.in',
    organization_id: 'org_1',
    mobile: '9594503214',
    gender: 'Male'
  },
  {
    id: 'sevak_2',
    role: UserRole.SEVAK,
    name: 'Kavita Jain',
    username: 'kavitajain@vsevak.in',
    organization_id: 'org_1',
    mobile: '9876543210',
    gender: 'Female'
  }
];

export const MOCK_ROUTES: AreaRoute[] = [
  { id: 1, from_name: "Sector 9", to_name: "Sector 14", distance_km: 1.2 },
  { id: 2, from_name: "Sector 9", to_name: "Vashi Bridge", distance_km: 4.5 },
  { id: 3, from_name: "Sector 14", to_name: "Koparkhairane", distance_km: 3.8 },
  { id: 4, from_name: "Turbhe", to_name: "Sanpada", distance_km: 2.5 },
  { id: 5, from_name: "Nerul", to_name: "Belapur", distance_km: 6.0 },
];

export const MOCK_ENTRIES: ViharEntry[] = [
  {
    id: 101,
    vihar_date: '2023-10-25',
    vihar_type: 'Morning',
    group_sadhu: true,
    group_sadhvi: false,
    no_sadhubhagwan: 2,
    vihar_from: "Sector 9",
    vihar_to: "Sector 14",
    sevaks: ["Vishwa Shah", "Kavita Jain"],
    wheelchair: false,
    distance_km: 1.2,
    organization_id: 'org_1'
  },
  {
    id: 102,
    vihar_date: '2023-10-26',
    vihar_type: 'Morning',
    group_sadhu: true,
    group_sadhvi: true,
    no_sadhubhagwan: 2,
    no_sadhvijibhagwan: 3,
    vihar_from: "Sector 14",
    vihar_to: "Koparkhairane",
    sevaks: ["Vishwa Shah"],
    wheelchair: true,
    distance_km: 3.8,
    organization_id: 'org_1'
  },
    {
    id: 103,
    vihar_date: '2023-10-28',
    vihar_type: 'Evening',
    group_sadhu: false,
    group_sadhvi: true,
    no_sadhvijibhagwan: 4,
    vihar_from: "Turbhe",
    vihar_to: "Sanpada",
    sevaks: ["Vishwa Shah", "Amit Jain"],
    wheelchair: false,
    distance_km: 2.5,
    organization_id: 'org_1'
  }
];

export const PRELISTED_AREAS = [
  "Sector 9", "Sector 14", "Vashi Bridge", "Koparkhairane", "Turbhe", "Sanpada", "Nerul", "Belapur"
];