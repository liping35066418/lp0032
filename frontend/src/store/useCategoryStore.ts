import { create } from 'zustand';
import { categoriesApi, CategoryWithCount } from '../api';

export interface ScriptCategory {
  name: string;
  count: number;
}

interface CategoryState {
  categories: CategoryWithCount[];
  activeCategories: ScriptCategory[];
  isLoading: boolean;
  
  fetchAllCategories: (params?: { status?: 'active' | 'inactive' }) => Promise<void>;
  fetchActiveCategories: () => Promise<void>;
  refreshCategories: () => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  activeCategories: [],
  isLoading: false,
  
  fetchAllCategories: async (params) => {
    set({ isLoading: true });
    try {
      const res = await categoriesApi.getAllCategories(params);
      set({ categories: res.data });
    } finally {
      set({ isLoading: false });
    }
  },
  
  fetchActiveCategories: async () => {
    set({ isLoading: true });
    try {
      const res = await categoriesApi.getActiveCategories();
      set({ activeCategories: res.data });
    } finally {
      set({ isLoading: false });
    }
  },
  
  refreshCategories: async () => {
    await Promise.all([
      get().fetchAllCategories(),
      get().fetchActiveCategories()
    ]);
  }
}));
