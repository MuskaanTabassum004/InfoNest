import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { 
  MessageCircle, 
  Send, 
  Search, 
  Users, 
  Plus,
  MoreVertical,
  Smile,
  Paperclip,
  Phone,
  Video
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: Date;
  type: "text" | "image" | "file";
}

interface ChatRoom {
  id: string;
  name: string;
  participants: string[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  type: "direct" | "group";
}

export const ChatsPage: React.FC = () => {
  const { userProfile, loading: authLoading } = useAuth();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Mock data - in real implementation, this would come from Firestore
  const [chatRooms] = useState<ChatRoom[]>([
    {
      id: "1",
      name: "General Discussion",
      participants: ["user1", "user2", "user3"],
      lastMessage: {
        id: "msg1",
        senderId: "user2",
        senderName: "John Doe",
        content: "Hey everyone! How's the new documentation system working for you?",
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        type: "text"
      },
      unreadCount: 2,
      type: "group"
    },
    {
      id: "2",
      name: "InfoWriter Support",
      participants: ["user1", "admin1"],
      lastMessage: {
        id: "msg2",
        senderId: "admin1",
        senderName: "Admin User",
        content: "Your writer application has been approved!",
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        type: "text"
      },
      unreadCount: 1,
      type: "direct"
    },
    {
      id: "3",
      name: "Tech Team",
      participants: ["user1", "dev1", "dev2"],
      lastMessage: {
        id: "msg3",
        senderId: "dev1",
        senderName: "Developer",
        content: "The new search feature is now live!",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        type: "text"
      },
      unreadCount: 0,
      type: "group"
    }
  ]);

  const [messages] = useState<ChatMessage[]>([
    {
      id: "1",
      senderId: "user2",
      senderName: "John Doe",
      content: "Hey everyone! How's the new documentation system working for you?",
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      type: "text"
    },
    {
      id: "2",
      senderId: userProfile?.uid || "current-user",
      senderName: userProfile?.displayName || "You",
      content: "It's working great! Much easier to find what I need now.",
      timestamp: new Date(Date.now() - 1000 * 60 * 3),
      type: "text"
    },
    {
      id: "3",
      senderId: "user3",
      senderName: "Jane Smith",
      content: "I agree! The search functionality is really helpful.",
      timestamp: new Date(Date.now() - 1000 * 60 * 1),
      type: "text"
    }
  ]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedChat) return;

    // In real implementation, this would send the message to Firestore
    console.log("Sending message:", message, "to chat:", selectedChat);
    setMessage("");
  };

  const filteredChats = chatRooms.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-200px)]">
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 overflow-hidden h-full flex">
        {/* Chat List Sidebar */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <MessageCircle className="h-5 w-5" />
              <span>Chats</span>
            </h1>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat.id)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedChat === chat.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      {chat.type === "group" ? (
                        <Users className="h-5 w-5 text-white" />
                      ) : (
                        <MessageCircle className="h-5 w-5 text-white" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {chat.name}
                      </h3>
                      {chat.lastMessage && (
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(chat.lastMessage.timestamp, { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    
                    {chat.lastMessage && (
                      <p className="text-sm text-gray-600 truncate mt-1">
                        <span className="font-medium">{chat.lastMessage.senderName}:</span>{" "}
                        {chat.lastMessage.content}
                      </p>
                    )}
                  </div>
                  
                  {chat.unreadCount > 0 && (
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-blue-600 rounded-full">
                        {chat.unreadCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* New Chat Button */}
          <div className="p-4 border-t border-gray-200">
            <button className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all">
              <Plus className="h-4 w-4" />
              <span>New Chat</span>
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {chatRooms.find(c => c.id === selectedChat)?.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {chatRooms.find(c => c.id === selectedChat)?.participants.length} participants
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                    <Phone className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                    <Video className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderId === userProfile?.uid ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.senderId === userProfile?.uid
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {msg.senderId !== userProfile?.uid && (
                        <p className="text-xs font-medium mb-1 opacity-75">{msg.senderName}</p>
                      )}
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${
                        msg.senderId === userProfile?.uid ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="bg-white border-t border-gray-200 p-4">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                  <button
                    type="button"
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                    >
                      <Smile className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={!message.trim()}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a chat to start messaging</h3>
                <p className="text-gray-500">Choose a conversation from the sidebar to begin chatting.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
