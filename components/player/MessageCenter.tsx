"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { 
  MessageSquare, 
  Send, 
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  Mail,
  MailOpen,
  Search,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageGallery } from "@/components/ui/ImageGallery";

interface Message {
  id: string;
  subject: string;
  content: string;
  priority: string;
  status: string;
  is_read: boolean;
  created_at: string;
  sender: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  attachments?: Array<{
    id: string;
    file_name: string;
    file_path: string;
    thumbnail_path?: string;
    file_size: number;
    file_type: string;
    width?: number;
    height?: number;
  }>;
}

export function PlayerMessageCenter() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  
  // Compose form state
  const [composeData, setComposeData] = useState({
    recipient_id: "",
    subject: "",
    content: "",
    priority: "normal"
  });
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Fetch available users for messaging
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      if (data.users) {
        setAvailableUsers(data.users);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const response = await fetch("/api/messages");
      const data = await response.json();
      
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages);
        setUnreadCount(data.messages.filter((msg: Message) => !msg.is_read).length);
      } else {
        // Fallback to sample data if API fails or no data
        const sampleMessages = getSampleMessages();
        setMessages(sampleMessages);
        setUnreadCount(sampleMessages.filter((msg: Message) => !msg.is_read).length);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      // Use sample data on error
      const sampleMessages = getSampleMessages();
      setMessages(sampleMessages);
      setUnreadCount(sampleMessages.filter((msg: Message) => !msg.is_read).length);
    } finally {
      setLoading(false);
    }
  };

  // Sample messages for demonstration
  const getSampleMessages = (): Message[] => [
    {
      id: "1",
      subject: "Welcome to BLTZ Platform!",
      content: "Welcome to the BLTZ platform! We're excited to have you join our community of athletes and fans. If you have any questions, feel free to reach out to our support team.",
      priority: "normal",
      status: "read",
      is_read: true,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      sender: {
        id: "admin-1",
        username: "admin",
        full_name: "BLTZ Admin",
        avatar_url: "/images/Headshot.png"
      }
    },
    {
      id: "2",
      subject: "Account Verification Required",
      content: "Please verify your email address to complete your account setup and start using all platform features. Check your inbox for the verification email.",
      priority: "high",
      status: "delivered",
      is_read: false,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      sender: {
        id: "admin-1",
        username: "admin",
        full_name: "BLTZ Admin",
        avatar_url: "/images/Headshot.png"
      }
    },
    {
      id: "3",
      subject: "Platform Update - New Features Available",
      content: "We're excited to share some important updates about the BLTZ platform. New features include enhanced video uploads, improved analytics, and better team management tools.",
      priority: "normal",
      status: "sent",
      is_read: false,
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      sender: {
        id: "admin-1",
        username: "admin",
        full_name: "BLTZ Admin",
        avatar_url: "/images/Headshot.png"
      }
    },
    {
      id: "4",
      subject: "Important: Account Security Notice",
      content: "We've noticed some unusual activity on your account. Please review your recent login activity and contact us if you didn't authorize these actions.",
      priority: "urgent",
      status: "sent",
      is_read: false,
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      sender: {
        id: "admin-1",
        username: "admin",
        full_name: "BLTZ Admin",
        avatar_url: "/images/Headshot.png"
      }
    }
  ];

  useEffect(() => {
    fetchMessages();
    fetchUsers();
    
    // Refresh messages every 30 seconds
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      return isValidType && isValidSize;
    });
    
    setSelectedImages(prev => [...prev, ...validFiles]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (messageId: string) => {
    if (selectedImages.length === 0) return [];

    setUploadingImages(true);
    const uploadPromises = selectedImages.map(async (file) => {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('messageId', messageId);

      const response = await fetch('/api/messages/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error('Failed to upload image');
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      console.error('Error uploading images:', error);
      return [];
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(composeData),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Upload images if any
        if (selectedImages.length > 0) {
          await uploadImages(data.message.id);
        }

        setComposeData({
          recipient_id: "",
          subject: "",
          content: "",
          priority: "normal"
        });
        setSelectedImages([]);
        setShowCompose(false);
        fetchMessages();
      } else {
        const errorData = await response.json();
        console.error("Error sending message:", errorData.error);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleThreadMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const messageText = (formData.get('threadMessage') as string)?.trim() || '';
    
    if (!messageText && selectedImages.length === 0) return;
    if (!selectedMessage) return;

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient_id: selectedMessage.sender.id,
          subject: `Re: ${selectedMessage.subject}`,
          content: messageText || "Sent images",
          priority: "normal"
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Upload images if any
        if (selectedImages.length > 0) {
          await uploadImages(data.message.id);
        }

        // Create the new message object for immediate display
        const newMessage: Message = {
          id: data.message.id,
          subject: `Re: ${selectedMessage.subject}`,
          content: messageText || "Sent images",
          priority: "normal",
          status: "sent",
          is_read: false,
          created_at: new Date().toISOString(),
          sender: {
            id: "current-user", // This would be the current user's ID
            username: "You",
            full_name: "You",
            avatar_url: "/images/Headshot.png"
          },
          attachments: selectedImages.length > 0 ? [] : undefined
        };

        // Add the new message to the thread immediately
        setThreadMessages(prev => [...prev, newMessage]);

        // Auto-scroll to bottom to show the new message
        setTimeout(() => {
          const scrollContainer = document.querySelector('.message-center-scroll');
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }
        }, 100);

        (e.currentTarget as HTMLFormElement).reset();
        setSelectedImages([]);
        fetchMessages();
      } else {
        const errorData = await response.json();
        console.error("Error sending thread message:", errorData.error);
      }
    } catch (error) {
      console.error("Error sending thread message:", error);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      await fetch(`/api/messages/${messageId}/read`, {
        method: "PUT",
      });
      fetchMessages();
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500/10 text-red-400 border-red-500/20";
      case "high": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case "normal": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "low": return "bg-gray-500/10 text-gray-400 border-gray-500/20";
      default: return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent": return <Clock className="h-4 w-4 text-blue-400" />;
      case "delivered": return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "read": return <CheckCircle className="h-4 w-4 text-green-400" />;
      default: return <AlertCircle className="h-4 w-4 text-yellow-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-neutral-800 bg-neutral-950">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#000CF5]/10 rounded-lg">
            <MessageSquare className="h-5 w-5 text-[#000CF5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">Messages</h3>
              <Badge className="bg-[#FFCA33]/10 text-[#FFCA33] border-[#FFCA33]/20 text-xs">
                Sample
              </Badge>
            </div>
            {unreadCount > 0 && (
              <Badge className="bg-[#FFCA33] text-black text-xs mt-1">
                {unreadCount} unread
              </Badge>
            )}
          </div>
        </div>
        <Button
          onClick={() => setShowCompose(true)}
          size="sm"
          className="bg-[#000CF5] hover:bg-[#000CF5]/80 text-white"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin message-center-scroll">
        {loading ? (
          <div className="text-center py-4 text-neutral-400 text-sm">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-4 text-neutral-400 text-sm">No messages yet</div>
        ) : (
          <div className="space-y-1 p-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-neutral-800/50",
                  selectedMessage?.id === message.id && "bg-[#000CF5]/10 border border-[#000CF5]/30",
                  !message.is_read && "bg-[#FFCA33]/5 border border-[#FFCA33]/20"
                )}
                onClick={() => {
                  setSelectedMessage(message);
                  setThreadMessages([]); // Clear thread messages when selecting a new message
                  if (!message.is_read) {
                    handleMarkAsRead(message.id);
                  }
                }}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={message.sender.avatar_url} />
                  <AvatarFallback className="bg-[#000CF5]/10 text-[#000CF5] text-xs">
                    {message.sender.full_name?.charAt(0) || message.sender.username?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-white text-sm truncate">
                      {message.sender.full_name || message.sender.username}
                    </h4>
                    <div className="flex items-center gap-2">
                      {!message.is_read && (
                        <div className="w-2 h-2 bg-[#FFCA33] rounded-full"></div>
                      )}
                      <span className="text-xs text-neutral-500">
                        {new Date(message.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-neutral-300 truncate mb-1">
                    {message.subject}
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs", getPriorityColor(message.priority))}>
                      {message.priority}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-neutral-500">
                      {getStatusIcon(message.status)}
                      <span>{message.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl h-[80vh] bg-neutral-900 border border-neutral-800 rounded-lg flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950 rounded-t-lg">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedMessage.sender.avatar_url} />
                  <AvatarFallback className="bg-[#000CF5]/10 text-[#000CF5]">
                    {selectedMessage.sender.full_name?.charAt(0) || selectedMessage.sender.username?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-white">
                    {selectedMessage.sender.full_name || selectedMessage.sender.username}
                  </h3>
                  <p className="text-sm text-neutral-400">Admin • last seen recently</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white">
                  <Star className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white">
                  <Search className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMessage(null)}
                  className="text-neutral-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Message Content */}
            <div className="flex-1 p-4 overflow-y-auto scrollbar-thin message-center-scroll">
              <div className="space-y-4">
                {/* Date Separator */}
                <div className="text-center text-sm text-neutral-500 py-2">
                  {new Date(selectedMessage.created_at).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>

                {/* Original Message Bubble */}
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedMessage.sender.avatar_url} />
                    <AvatarFallback className="bg-[#000CF5]/10 text-[#000CF5] text-xs">
                      {selectedMessage.sender.full_name?.charAt(0) || selectedMessage.sender.username?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-neutral-800 rounded-lg p-3 max-w-md">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={cn("text-xs", getPriorityColor(selectedMessage.priority))}>
                          {selectedMessage.priority}
                        </Badge>
                        <span className="text-xs text-neutral-400">{selectedMessage.subject}</span>
                      </div>
                        <p className="text-white text-sm leading-relaxed">
                          {selectedMessage.content}
                        </p>
                        
                        {/* Display images if any */}
                        {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                          <div className="mt-3">
                            <ImageGallery 
                              attachments={selectedMessage.attachments} 
                              className="mt-2"
                            />
                          </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                      <span>{new Date(selectedMessage.created_at).toLocaleTimeString()}</span>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(selectedMessage.status)}
                        <span>{selectedMessage.status}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Thread Messages */}
                {threadMessages.map((message, index) => (
                  <div key={message.id || `thread-${index}`} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.sender.avatar_url} />
                      <AvatarFallback className="bg-[#FFCA33]/10 text-[#FFCA33] text-xs">
                        {message.sender.full_name?.charAt(0) || message.sender.username?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-[#000CF5]/10 border border-[#000CF5]/30 rounded-lg p-3 max-w-md">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={cn("text-xs", getPriorityColor(message.priority))}>
                            {message.priority}
                          </Badge>
                          <span className="text-xs text-neutral-400">{message.subject}</span>
                        </div>
                        <p className="text-white text-sm leading-relaxed">
                          {message.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                        <span>{new Date(message.created_at).toLocaleTimeString()}</span>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(message.status)}
                          <span>{message.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-950 rounded-b-lg">
              <form onSubmit={handleThreadMessage} className="flex items-center gap-2">
                <Button variant="ghost" size="sm" type="button" className="text-neutral-400 hover:text-white">
                  <Plus className="h-4 w-4" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    name="threadMessage"
                    placeholder="Write your message..."
                    className="bg-neutral-800 border-neutral-700 text-white pr-16"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                      id="thread-image-upload"
                    />
                    <label
                      htmlFor="thread-image-upload"
                      className="cursor-pointer p-1 text-neutral-400 hover:text-white transition-colors hover:bg-neutral-700 rounded flex items-center justify-center"
                      title="Attach images"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                      </svg>
                    </label>
                    <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white p-1">
                      <Star className="h-4 w-4" />
                    </Button>
                        <Button type="submit" variant="ghost" size="sm" className="text-neutral-400 hover:text-white p-1">
                          <Send className="h-4 w-4" />
                        </Button>
                  </div>
                </div>
              
              {/* Selected Images Preview for Thread */}
              {selectedImages.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-neutral-400">Attached images:</span>
                    <span className="text-xs text-neutral-500">({selectedImages.length})</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto">
                    {selectedImages.map((file, index) => (
                      <div key={index} className="relative group flex-shrink-0">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-1 rounded-b-lg">
                          {(file.size / 1024 / 1024).toFixed(1)}MB
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl bg-neutral-900 border-neutral-800">
            <CardHeader>
              <CardTitle className="text-white">Send Message</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-neutral-300 mb-2 block">
                    To
                  </label>
                  <select
                    value={composeData.recipient_id}
                    onChange={(e) => setComposeData({ ...composeData, recipient_id: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                    required
                  >
                    <option value="">Select recipient...</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.username} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-neutral-300 mb-2 block">
                    Subject
                  </label>
                  <input
                    value={composeData.subject}
                    onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                    placeholder="Enter message subject"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400"
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-neutral-300 mb-2 block">
                    Message
                  </label>
                  <textarea
                    value={composeData.content}
                    onChange={(e) => setComposeData({ ...composeData, content: e.target.value })}
                    placeholder="Enter your message"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 min-h-32"
                    required
                  />
                </div>

                {/* Image Upload Section */}
                <div>
                  <label className="text-sm font-medium text-neutral-300 mb-2 block">
                    Images (Optional)
                  </label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="flex items-center justify-center w-full h-20 border-2 border-dashed border-neutral-600 rounded-lg cursor-pointer hover:border-[#000CF5] transition-colors"
                    >
                      <div className="text-center">
                        <Plus className="h-6 w-6 text-neutral-400 mx-auto mb-1" />
                        <p className="text-sm text-neutral-400">Click to add images</p>
                        <p className="text-xs text-neutral-500">Max 5MB per image</p>
                      </div>
                    </label>
                    
                    {/* Selected Images Preview */}
                    {selectedImages.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {selectedImages.map((file, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                            <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                              {(file.size / 1024 / 1024).toFixed(1)}MB
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCompose(false)}
                    className="border-neutral-700 text-neutral-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={uploadingImages}
                    className="bg-[#000CF5] hover:bg-[#000CF5]/80 text-white disabled:opacity-50"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {uploadingImages ? "Uploading..." : "Send Message"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

