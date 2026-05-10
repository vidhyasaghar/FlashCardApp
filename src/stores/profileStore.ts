import { create } from 'zustand';
import { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Profile } from '../types';
import { getAllProfiles } from '../db/queries/profiles';

interface ProfileState {
  profiles: Profile[];
  activeProfile: Profile | null;
  isUnlocked: boolean;
}

interface ProfileActions {
  loadProfiles: (db: SQLiteDatabase) => Promise<void>;
  setActiveProfile: (profile: Profile) => void;
  lockProfile: () => void;
  unlockProfile: (pin: string, profile: Profile) => Promise<void>;
}

export const useProfileStore = create<ProfileState & ProfileActions>((set) => ({
  profiles: [],
  activeProfile: null,
  isUnlocked: false,

  loadProfiles: async (db) => {
    const profiles = await getAllProfiles(db);
    set({ profiles });
  },

  setActiveProfile: (profile) => {
    set({ activeProfile: profile, isUnlocked: false });
  },

  lockProfile: () => {
    set({ isUnlocked: false });
  },

  unlockProfile: async (pin, profile) => {
    if (profile.pin_hash === null) {
      set({ activeProfile: profile, isUnlocked: true });
      return;
    }
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin
    );
    if (hash === profile.pin_hash) {
      set({ activeProfile: profile, isUnlocked: true });
    }
  },
}));
