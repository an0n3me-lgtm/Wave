import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ChatView from '../components/ChatView';
import { useChatStore } from '../store/chatStore';

export default function ChatLayout() {
  const { activeConversationId } = useChatStore();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [mobileView, setMobileView] = useState('sidebar');

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // When a conversation is selected on mobile, switch to chat view
  useEffect(() => {
    if (isMobile && activeConversationId) {
      setMobileView('chat');
    }
  }, [activeConversationId, isMobile]);

  if (isMobile) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {mobileView === 'sidebar'
          ? <Sidebar />
          : <ChatView onBack={() => setMobileView('sidebar')} />
        }
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      <ChatView />
    </div>
  );
}
