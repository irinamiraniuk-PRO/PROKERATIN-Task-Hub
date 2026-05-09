import type { User, UserRole } from '../types';

export interface ProfileSeed {
  login: string;
  name: string;
  role: UserRole;
  color: string;
}

export const PROFILE_SEEDS: ProfileSeed[] = [
  { login: 'irina', name: 'Ирина Миранюк', role: 'director', color: '#BE185D' },
  { login: 'ulyana', name: 'Ульяна', role: 'employee', color: '#0891B2' },
  { login: 'natali', name: 'Натали', role: 'employee', color: '#EA580C' },
  { login: 'marina', name: 'Марина', role: 'employee', color: '#16A34A' },
];

export const PROFILE_SEEDS_BY_LOGIN: Record<string, ProfileSeed> = PROFILE_SEEDS.reduce<Record<string, ProfileSeed>>((acc, seed) => {
  acc[seed.login] = seed;
  return acc;
}, {});

export const FALLBACK_USERS: User[] = PROFILE_SEEDS.map(seed => ({
  id: seed.login,
  login: seed.login,
  name: seed.name,
  role: seed.role,
  color: seed.color,
}));

export const PROFILE_SEED_USERS: User[] = FALLBACK_USERS;
