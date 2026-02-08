import { create } from 'zustand'
import type { User as DBUser } from '@/types/database'

interface AuthState {
  profile: DBUser | null
  setProfile: (profile: DBUser | null) => void
  updateProfile: (updates: Partial<DBUser>) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  updateProfile: (updates) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...updates } : null,
    })),
}))
