import Chat from '@components/Chat/Chat';
import ChatTabs from '@components/ChatTabs/ChatTabs';
import { ChatSession, LLMMessage } from '@types';
import React from 'react';

interface ChatLayoutProps {
  chats: ChatSession[];
  activeChatId: string;
  onNewChat: (model: string) => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onUpdateMessages: (id: string, messages: LLMMessage[]) => void;
  onLoadingChange?: (loading: boolean) => void;
  selectedModel: string;
  disabled?: boolean;
  models: string[];
}

const ChatLayout: React.FC<ChatLayoutProps> = ({
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onUpdateMessages,
  onLoadingChange,
  disabled,
  models,
}) => {
  const activeChat = chats.find((chat) => chat.id === activeChatId)!;

  return (
    <div className="container">
      <aside className="sidebar">
        <ChatTabs
          chats={chats}
          activeChatId={activeChatId}
          onNewChat={onNewChat}
          onSelectChat={onSelectChat}
          onDeleteChat={onDeleteChat}
          disabled={disabled}
          models={models}
        />
      </aside>
      <main className="chatArea" key={activeChatId}>
        <Chat
          settings={activeChat.settings}
          chatId={activeChat.id}
          initialMessages={activeChat.messages}
          onUpdateMessages={(messages) =>
            onUpdateMessages(activeChat.id, messages)
          }
          onLoadingChange={onLoadingChange}
          selectedModel={activeChat.model}
          models={models}
        />
      </main>
    </div>
  );
};

export default ChatLayout;
