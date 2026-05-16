import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot, limit } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { EVENTS } from '../constants/events';
import { motion } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Calendar, Award, Settings, User as UserIcon, Check, Clock, XCircle, Info, Brain, Map, Shield, Trophy, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import BroadcastNotifier from '../components/BroadcastNotifier';

export default function Dashboard() {
  const { user, profile, isAdmin } = useAuth();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', college: '', phone: '' });
  const [quizActive, setQuizActive] = useState(false);
  const [treasureActive, setTreasureActive] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (user) {
      const fetchRegs = async () => {
        const q = query(collection(db, 'registrations'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        setRegistrations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      };
      fetchRegs();

      // Listen for Announcements
      const unsubAnnouncements = onSnapshot(collection(db, 'announcements'), (snap) => {
        setAnnouncements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => b.timestamp < a.timestamp ? -1 : 1));
      });

      // Listen for Live Quiz status
      const qQuiz = query(collection(db, 'quizzes'), where('isActive', '==', true), limit(1));
      const unsubQuiz = onSnapshot(qQuiz, (snap) => {
        setQuizActive(!snap.empty);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'quizzes');
      });

      // Listen for Treasure Hunt status
      const qHunt = query(collection(db, 'treasure_hunts'), where('isActive', '==', true), limit(1));
      const unsubTreasure = onSnapshot(qHunt, (snap) => {
        setTreasureActive(!snap.empty);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'treasure_hunts');
      });

      return () => {
        unsubAnnouncements();
        unsubQuiz();
        unsubTreasure();
      };
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      setEditForm(prev => {
        if (prev.name === profile.name && prev.college === profile.college && prev.phone === profile.phone) {
          return prev;
        }
        return { 
          name: profile.name || '', 
          college: profile.college || '', 
          phone: profile.phone || '' 
        };
      });
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), editForm);
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="pt-32 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 bg-bg-paper min-h-screen">
      <div className="max-w-7xl mx-auto px-4">
        {location.state?.registered && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-8 bg-brand-primary text-white rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 shadow-xl shadow-brand-primary/20 border-2 border-white/20"
          >
            <div className="bg-white/20 p-4 rounded-3xl shrink-0">
              <Sparkles className="w-10 h-10" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="font-bold text-2xl mb-1">Registration Complete!</p>
              <p className="opacity-90">Welcome to Rasayan 2026. Your unique participant ID is:</p>
            </div>
            <div className="bg-white text-brand-primary px-8 py-4 rounded-[2rem] font-mono text-4xl font-bold tracking-[0.2em] shadow-inner shadow-brand-primary/20">
              {location.state?.uniqueCode || '-----'}
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {quizActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 rounded-[2.5rem] shadow-2xl shadow-orange-500/20"
            >
              <div className="bg-white rounded-[2.4rem] p-6 pr-8 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative min-h-[160px]">
                 <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Brain className="w-40 h-40 text-brand-dark" />
                </div>
                <div className="flex items-center gap-6 relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-3xl flex items-center justify-center shrink-0">
                    <Brain className="w-8 h-8 text-orange-600 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif text-brand-dark leading-tight">Live Quiz is Active!</h3>
                    <p className="text-text-muted text-xs mt-1">Compete now and win prizes.</p>
                  </div>
                </div>
                <Link 
                  to="/quiz" 
                  className="btn-primary py-3 px-8 bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-xl hover:shadow-orange-600/30 transition-shadow relative z-10 text-sm"
                >
                  Enter Lab
                </Link>
              </div>
            </motion.div>
          )}

          {treasureActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-1 bg-gradient-to-r from-brand-primary via-indigo-600 to-purple-700 rounded-[2.5rem] shadow-2xl shadow-brand-primary/20"
            >
              <div className="bg-white rounded-[2.4rem] p-6 pr-8 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative min-h-[160px]">
                 <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Map className="w-40 h-40 text-brand-dark" />
                </div>
                <div className="flex items-center gap-6 relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-brand-soft to-indigo-100 rounded-3xl flex items-center justify-center shrink-0">
                    <Map className="w-8 h-8 text-brand-primary animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif text-brand-dark leading-tight">Treasure Hunt LIVE!</h3>
                    <p className="text-text-muted text-xs mt-1">Decrypt clues and find the prize.</p>
                  </div>
                </div>
                <Link 
                  to="/treasure-hunt" 
                  className="btn-primary py-3 px-8 bg-gradient-to-r from-brand-primary to-indigo-600 text-white shadow-xl hover:shadow-brand-primary/30 transition-shadow relative z-10 text-sm"
                >
                  Start Hunt
                </Link>
              </div>
            </motion.div>
          )}
        </div>

        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 p-1 bg-gradient-to-r from-amber-200 to-amber-300 rounded-[2.5rem] shadow-xl shadow-amber-200/20"
          >
            <div className="bg-white rounded-[2.4rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center shrink-0 border border-amber-100">
                  <Shield className="w-8 h-8 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-xl font-serif text-amber-900 leading-tight">Admin Console Access</h3>
                  <p className="text-amber-700 text-xs mt-1 font-medium italic">You are logged in with an authorized administrative account.</p>
                </div>
              </div>
              <Link 
                to="/admin" 
                className="btn-primary py-3 px-8 bg-amber-600 text-white shadow-xl shadow-amber-600/20 hover:bg-amber-700 transition-all flex items-center gap-2 text-sm"
              >
                Launch Panel
                <Brain className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        )}

        {announcements.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-serif text-brand-dark mb-6 flex items-center gap-3">
              <Sparkles className="text-brand-primary" />
              Latest Announcements
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {announcements.map((ann, idx) => (
                <motion.div
                  key={ann.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass-card p-6 rounded-[2rem] border-t-4 border-brand-primary/20 relative group overflow-hidden"
                >
                  <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform">
                    <Info className="w-32 h-32" />
                  </div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-brand-soft text-brand-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      Update
                    </span>
                    <span className="text-[10px] font-mono text-text-muted">
                      {new Date(ann.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-brand-dark mb-2 leading-tight">{ann.title}</h3>
                  <p className="text-sm text-text-muted leading-relaxed">{ann.content}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Profile Info */}
          <div className="lg:col-span-1">
            <div className="glass-card p-8 rounded-[2.5rem] sticky top-24">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-brand-soft p-4 rounded-3xl">
                  <UserIcon className="text-brand-primary w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-2xl font-serif text-brand-dark">{profile?.name}</h2>
                  <p className="text-text-muted text-sm">{profile?.email}</p>
                </div>
              </div>

              {editing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <input
                    className="input-field"
                    value={editForm.name}
                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Name"
                  />
                  <input
                    className="input-field"
                    value={editForm.college}
                    onChange={e => setEditForm(prev => ({ ...prev, college: e.target.value }))}
                    placeholder="College"
                  />
                  <input
                    className="input-field"
                    value={editForm.phone}
                    onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone"
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary py-2 px-4 flex-1">Save</button>
                    <button type="button" onClick={() => setEditing(false)} className="btn-secondary py-2 px-4">Cancel</button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-brand-primary mb-1">Affiliation</p>
                    <p className="text-brand-dark font-medium">{profile?.college || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-brand-primary mb-1">Contact</p>
                    <p className="text-brand-dark font-medium">{profile?.phone || 'Not specified'}</p>
                  </div>
                  <button onClick={() => setEditing(true)} className="flex items-center gap-2 text-sm font-bold text-brand-primary hover:text-brand-dark transition-colors">
                    <Settings className="w-4 h-4" />
                    Edit Profile
                  </button>
                </div>
              )}

              <div className="mt-10 p-4 bg-brand-soft rounded-[2rem] border border-brand-primary/10">
                <p className="text-[10px] uppercase tracking-widest font-bold text-brand-primary mb-2 text-center">Status</p>
                <div className="flex items-center justify-center gap-2 text-brand-dark font-bold italic">
                  <Award className="w-4 h-4" />
                  Chemistry Enthusiast
                </div>
              </div>
            </div>
          </div>

          {/* Registrations List */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-3xl font-serif text-brand-dark mb-8">My Event Arena</h2>
            
            {registrations.length === 0 ? (
              <div className="glass-card p-12 rounded-[3rem] text-center">
                <Calendar className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                <h3 className="text-xl font-bold text-brand-dark mb-2">No Registrations Yet</h3>
                <p className="text-text-muted mb-8">You haven't registered for any events yet. Science awaits you!</p>
                <Link to="/register" className="btn-primary">Register Now</Link>
              </div>
            ) : (
              registrations.map((reg) => (
                <div key={reg.id} className="glass-card p-8 rounded-[2.5rem] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Award className="w-32 h-32 text-brand-dark" />
                  </div>
                  <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <h3 className="text-xl font-bold text-brand-dark font-serif">Registration Details</h3>
                        <div className="bg-brand-primary/10 text-brand-primary px-3 py-1 rounded-lg font-mono text-sm font-bold">
                          ID: {reg.uniqueCode || '-----'}
                        </div>
                      </div>

                      {reg.paymentStatus === 'approved' && (
                        <div className="mb-4 p-4 bg-green-50 border border-green-100 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Trophy className="w-5 h-5 text-green-600" />
                            <p className="text-xs font-bold text-green-800">Your registration is confirmed!</p>
                          </div>
                          <button 
                            onClick={() => {
                              const doc = new jsPDF('l', 'mm', 'a4') as any;
                              doc.setDrawColor(220, 38, 38); 
                              doc.setLineWidth(2);
                              doc.rect(10, 10, 277, 190);
                              doc.setFontSize(40);
                              doc.text("RASAYAN 2026", 148, 60, { align: 'center' });
                              doc.setFontSize(20);
                              doc.text("CERTIFICATE OF PARTICIPATION", 148, 80, { align: 'center' });
                              doc.setFontSize(14);
                              doc.text("This is to certify that", 148, 100, { align: 'center' });
                              doc.setFontSize(24);
                              doc.text(reg.userName || 'Participant', 148, 115, { align: 'center' });
                              doc.setFontSize(14);
                              doc.text("has registered for Rasayan 2026", 148, 130, { align: 'center' });
                              doc.text("ID: #" + reg.uniqueCode, 148, 150, { align: 'center' });
                              doc.save(`Rasayan_Pass_${reg.uniqueCode}.pdf`);
                            }}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-green-700 transition-all flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" /> Download Pass
                          </button>
                        </div>
                      )}
                      
                      {reg.paymentMethod === 'upi' && reg.paymentStatus === 'pending' && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2 text-amber-700 text-xs font-medium">
                          <Clock className="w-4 h-4" />
                          Your payment status will be updated after 24 hours of verification.
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mb-6">
                        {reg.eventIds.map((eid: string) => {
                          const evt = EVENTS.find(e => e.id === eid);
                          return (
                            <span key={eid} className="bg-brand-soft text-brand-primary border border-brand-primary/10 text-xs px-4 py-1.5 rounded-full font-bold">
                              {evt?.name}
                            </span>
                          );
                        })}
                      </div>
                      <div className="p-4 bg-white/50 rounded-2xl border border-white italic text-brand-primary text-sm shadow-inner">
                        "{reg.confirmationMessage}"
                      </div>
                    </div>
                     <div className="text-right flex flex-col justify-between items-end gap-4">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest leading-none mb-1">Fee Amount</p>
                          <p className="text-xl font-bold text-brand-dark">₹{reg.totalAmount || 0}</p>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1">
                          <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest leading-none mb-1">Payment Status</p>
                          {reg.paymentStatus === 'approved' ? (
                            <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full inline-flex items-center gap-1.5 border border-green-200">
                              <Check className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">Approved</span>
                            </div>
                          ) : reg.paymentStatus === 'rejected' ? (
                            <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full inline-flex items-center gap-1.5 border border-red-200">
                              <XCircle className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">Rejected</span>
                            </div>
                          ) : (
                            <div className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full inline-flex items-center gap-1.5 border border-amber-200">
                              <Clock className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">Pending</span>
                            </div>
                          )}
                        </div>

                        {reg.paymentStatus !== 'approved' && (
                          <div className="bg-blue-50 text-blue-700 p-2 rounded-lg flex items-start gap-2 text-[10px] max-w-[150px] text-left">
                            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <p>Admin will verify your Transaction ID soon.</p>
                          </div>
                        )}
                      </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <BroadcastNotifier />
    </div>
  );
}
