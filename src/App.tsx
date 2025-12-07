import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from '@/components/layout/RootLayout';
import { OverlayLayout } from '@/components/layout/OverlayLayout';

// Pages - lazy loaded for better performance
import { HomePage } from '@/pages/HomePage';
import { OverlayPage } from '@/pages/OverlayPage';
import { ChatPage } from '@/pages/ChatPage';
import { GoalsPage } from '@/pages/GoalsPage';
import { DropGamePage } from '@/pages/DropGamePage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ProfileLoginPage } from '@/pages/ProfileLoginPage';
import { VoiceListPage } from '@/pages/VoiceListPage';
import { CommandsPage } from '@/pages/CommandsPage';
import { DropGameRulesPage } from '@/pages/DropGameRulesPage';
import { AdminPage } from '@/pages/AdminPage';
import { WikiPage } from '@/pages/WikiPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'profile-login', element: <ProfileLoginPage /> },
      { path: 'profile/:username', element: <ProfilePage /> },
      { path: 'voicelist', element: <VoiceListPage /> },
      { path: 'commands', element: <CommandsPage /> },
      { path: 'drop-game-rules', element: <DropGameRulesPage /> },
      { path: 'admin', element: <AdminPage /> },
      { path: 'wiki', element: <WikiPage /> },
    ],
  },
  {
    path: '/overlay',
    element: <OverlayLayout />,
    children: [
      { index: true, element: <OverlayPage /> },
      { path: 'chat', element: <ChatPage /> },
      { path: 'goals', element: <GoalsPage /> },
      { path: 'dropgame', element: <DropGamePage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
