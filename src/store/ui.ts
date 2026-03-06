import { create } from "zustand";

type Page = "home" | "topic" | "archive" | "settings" | "statistics";

interface UIStore {
  currentPage: Page;
  selectedTopicId: string | null;
  topicsMenuOpen: boolean;
  chatDrawerOpen: boolean;
  createModalOpen: boolean;
  sidebarCollapsed: boolean;
  /** Set of topic IDs currently being fetched (FetchNow or cron) */
  fetchingTopics: Set<string>;
  setPage: (page: Page, topicId?: string) => void;
  toggleTopicsMenu: () => void;
  toggleChatDrawer: () => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  toggleSidebar: () => void;
  setTopicFetching: (topicId: string, fetching: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  currentPage: "home",
  selectedTopicId: null,
  topicsMenuOpen: true,
  chatDrawerOpen: false,
  createModalOpen: false,
  sidebarCollapsed: false,
  fetchingTopics: new Set(),

  setPage: (page, topicId) =>
    set({
      currentPage: page,
      selectedTopicId: topicId ?? null,
      chatDrawerOpen: false,
    }),

  toggleTopicsMenu: () => set((s) => ({ topicsMenuOpen: !s.topicsMenuOpen })),

  toggleChatDrawer: () => set((s) => ({ chatDrawerOpen: !s.chatDrawerOpen })),

  openCreateModal: () => set({ createModalOpen: true }),
  closeCreateModal: () => set({ createModalOpen: false }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setTopicFetching: (topicId, fetching) =>
    set((s) => {
      const next = new Set(s.fetchingTopics);
      if (fetching) next.add(topicId);
      else next.delete(topicId);
      return { fetchingTopics: next };
    }),
}));
