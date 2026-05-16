import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Megaphone, 
  MessageCircle, 
  ShieldCheck, 
  Clock, 
  Plus,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';

export default function Community() {
  const { user, profile, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'chat' | 'announcements'>('announcements');
  
// Chat state
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Announcement state
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [newAnnounce, setNewAnnounce] = useState({ title: '', content: '' });
  const [submitting, setSubmitting] = useState(false);

  // Listen for messages
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      
      // Auto scroll to bottom
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });
    return unsubscribe;
  }, [user]);

  // Listen for announcements
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'announcements'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const anns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(anns);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'announcements');
    });
    return unsubscribe;
  }, [user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    setNewMessage('');
    try {
      await addDoc(collection(db, 'messages'), {
        userId: user.uid,
        userName: profile?.name || user.displayName || 'Anonymous',
        text: newMessage.trim(),
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!isAdmin) return;
    if (!id) {
      console.warn("No message ID for deletion");
      return;
    }
    if (!window.confirm("ARE YOU SURE? Delete this message FOREVER?")) return;
    try {
      await deleteDoc(doc(db, 'messages', id));
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `messages/${id}`);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!isAdmin) return;
    if (!id) return;
    if (!window.confirm("ARE YOU SURE? Delete this announcement FOREVER?")) return;
    try {
      await deleteDoc(doc(db, 'announcements', id));
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `announcements/${id}`);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newAnnounce.title.trim() || !newAnnounce.content.trim()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        ...newAnnounce,
        author: profile?.name || user?.displayName || 'Admin',
        timestamp: serverTimestamp()
      });
      setShowAnnounceModal(false);
      setNewAnnounce({ title: '', content: '' });
    } catch (error) {
      console.error("Error posting announcement:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="pt-32 pb-20 text-center">
        <h2 className="text-2xl font-serif text-brand-dark mb-4">Please sign in to join the community</h2>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 bg-bg-paper min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-serif text-brand-dark mb-2">Fest Community</h1>
            <p className="text-text-muted">Stay updated and connect with fellow participants</p>
          </div>
          
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 self-start md:self-auto overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('announcements')}
              className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'announcements' 
                  ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                  : 'text-text-muted hover:bg-gray-50'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              Announcements
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === 'chat' 
                  ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                  : 'text-text-muted hover:bg-gray-50'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              Community Chat
            </button>
          </div>
        </div>

        <div className="relative">
          <AnimatePresence mode="wait">
            {activeTab === 'announcements' ? (
              <motion.div
                key="announcements"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {isAdmin && (
                  <button
                    onClick={() => setShowAnnounceModal(true)}
                    className="w-full py-4 border-2 border-dashed border-brand-primary/30 rounded-2xl text-brand-primary font-medium hover:bg-brand-soft transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Post New Announcement
                  </button>
                )}

                {announcements.length === 0 ? (
                  <div className="glass-card p-12 text-center rounded-[2rem]">
                    <Megaphone className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-text-muted text-lg font-serif">No announcements yet. Stay tuned!</p>
                  </div>
                ) : (
                  announcements.map((ann) => (
                    <div key={ann.id} className="glass-card p-8 rounded-[2rem] border-l-4 border-l-brand-primary relative overflow-hidden group">
                      {isAdmin && (
                        <button 
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="absolute top-4 right-4 z-10 p-2 bg-red-50 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:text-white"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <ShieldCheck className="w-24 h-24 text-brand-primary" />
                      </div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-brand-soft text-brand-primary px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5 shadow-sm border border-brand-primary/10">
                          <ShieldCheck className="w-3 h-3" />
                          Official Broadcast
                        </div>
                        <span className="text-[10px] text-text-muted uppercase font-bold tracking-tighter flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {ann.timestamp?.toDate() ? format(ann.timestamp.toDate(), 'MMM d, h:mm a') : 'Just now'}
                        </span>
                      </div>
                      <h3 className="text-2xl font-serif text-brand-dark mb-3">{ann.title}</h3>
                      <p className="text-text-muted leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                      <div className="mt-6 pt-6 border-t border-gray-50 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand-soft flex items-center justify-center text-brand-primary text-xs font-bold ring-2 ring-white">
                          {ann.author?.[0]}
                        </div>
                        <span className="text-sm font-medium text-brand-dark">{ann.author}</span>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-card rounded-[2.5rem] flex flex-col h-[600px] overflow-hidden shadow-2xl relative"
              >
                {/* Chat Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-brand-soft/30 to-transparent pointer-events-none" />
                
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4" ref={chatScrollRef}>
                  {messages.map((msg, i) => {
                    const isMe = msg.userId === user?.uid;
                    return (
                      <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group/msg relative`}>
                        {!isMe && (
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-3 mb-1">
                            {msg.userName}
                          </span>
                        )}
                        <div className="flex items-center gap-2 max-w-[95%]">
                          {isAdmin && isMe && (
                            <button 
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1 text-red-400 opacity-0 group-hover/msg:opacity-100 transition-opacity hover:text-red-600"
                              title="Delete message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <div className={`p-3 md:p-4 rounded-2xl text-sm relative transition-all hover:scale-[1.02] ${
                            isMe 
                              ? 'bg-brand-primary text-white rounded-tr-none shadow-xl shadow-brand-primary/20' 
                              : 'bg-white text-brand-dark shadow-sm border border-brand-soft rounded-tl-none'
                          }`}>
                            {msg.text}
                          </div>
                          {isAdmin && !isMe && (
                            <button 
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1 text-red-400 opacity-0 group-hover/msg:opacity-100 transition-opacity hover:text-red-600"
                              title="Delete message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <span className="text-[9px] text-text-muted mt-1 px-1">
                          {msg.timestamp?.toDate() ? format(msg.timestamp.toDate(), 'h:mm a') : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={handleSendMessage} className="p-4 md:p-6 bg-white/50 backdrop-blur-md border-t border-brand-soft flex gap-2 md:gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-white px-4 md:px-6 py-3 rounded-2xl border border-gray-100 focus:border-brand-primary outline-none text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-brand-primary text-white p-3 md:p-4 rounded-2xl hover:bg-brand-dark transition-all disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Announcement Modal */}
      <AnimatePresence>
        {showAnnounceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAnnounceModal(false)}
              className="absolute inset-0 bg-brand-dark/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative glass-card w-full max-w-lg p-8 rounded-[2.5rem] shadow-3xl bg-white"
            >
              <h2 className="text-3xl font-serif text-brand-dark mb-6">Post Announcement</h2>
              <form onSubmit={handlePostAnnouncement} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-brand-primary uppercase tracking-widest ml-1">Title</label>
                  <input
                    type="text"
                    required
                    value={newAnnounce.title}
                    onChange={(e) => setNewAnnounce({ ...newAnnounce, title: e.target.value })}
                    placeholder="e.g. Schedule Update"
                    className="input-field"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-brand-primary uppercase tracking-widest ml-1">Content</label>
                  <textarea
                    required
                    rows={4}
                    value={newAnnounce.content}
                    onChange={(e) => setNewAnnounce({ ...newAnnounce, content: e.target.value })}
                    placeholder="Enter announcement details..."
                    className="input-field resize-none"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAnnounceModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary flex-1"
                  >
                    {submitting ? 'Posting...' : 'Post Now'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
