import { useUIStore } from "./store/ui";
import { useTauriEvents } from "./hooks/useTauriEvents";
import Sidebar from "./components/layout/Sidebar";
import HomePage from "./pages/HomePage";
import TopicDetailPage from "./pages/TopicDetailPage";
import ArchivePage from "./pages/ArchivePage";
import SettingsPage from "./pages/SettingsPage";
import StatisticsPage from "./pages/StatisticsPage";
import CreateTopicModal from "./components/modals/CreateTopicModal";
import ChatDrawer from "./components/chat/ChatDrawer";

export default function App() {
  const { currentPage, selectedTopicId, createModalOpen } = useUIStore();

  useTauriEvents();

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />

      <main style={{ flex: 1, overflow: "auto", position: "relative" }}>
        {currentPage === "home" && <HomePage />}
        {currentPage === "topic" && selectedTopicId && (
          <TopicDetailPage topicId={selectedTopicId} />
        )}
        {currentPage === "archive" && <ArchivePage />}
        {currentPage === "settings" && <SettingsPage />}
        {currentPage === "statistics" && <StatisticsPage />}
      </main>

      <ChatDrawer />

      {createModalOpen && <CreateTopicModal />}
    </div>
  );
}
