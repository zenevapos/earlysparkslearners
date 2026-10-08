import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ActiveChildState {
  childId: string | null;
  setChildId: (id: string | null) => void;
}

export const useActiveChild = create<ActiveChildState>()(
  persist(
    (set) => ({
      childId: null,
      setChildId: (id) => set({ childId: id }),
    }),
    { name: 'littlesparks-active-child' },
  ),
);