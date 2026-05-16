import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { motion, AnimatePresence } from 'motion/react';
import { Map, Key, Lock, Trophy, ArrowRight, Loader2, AlertCircle, Clock, CheckCircle2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import BroadcastNotifier from '../components/BroadcastNotifier';

export default function TreasureHunt() {
  const { user, profile } = useAuth();
  const [activeGame, setActiveGame] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [allProgress, setAllProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [teamNameInput, setTeamNameInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const lockTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      // 1. Fetch game config
      const qHunt = query(collection(db, 'treasure_hunts'), where('isActive', '==', true), limit(1));
      const unsubConfig = onSnapshot(qHunt, (snap) => {
        if (!snap.empty) {
          setActiveGame({ id: snap.docs[0].id, ...snap.docs[0].data() });
        } else {
          setActiveGame(null);
        }
        setLoading(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'treasure_hunts');
      });

      // 2. Fetch user progress
      const progressRef = doc(db, 'treasure_hunt_progress', user.uid);
      const unsubProgress = onSnapshot(progressRef, (snap) => {
        if (snap.exists()) {
          setProgress(snap.data());
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, `treasure_hunt_progress/${user.uid}`);
      });

      // 3. Fetch all progress for leaderboard
      const unsubAll = onSnapshot(collection(db, 'treasure_hunt_progress'), (snap) => {
        setAllProgress(snap.docs.map(d => d.data()));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'treasure_hunt_progress');
      });

      return () => {
        unsubConfig();
        unsubProgress();
        unsubAll();
        if (lockTimerRef.current) clearInterval(lockTimerRef.current);
      };
    }
  }, [user]);

  useEffect(() => {
    if (progress?.lockedUntil) {
      const lockDate = new Date(progress.lockedUntil).getTime();
      const checkLock = () => {
        const now = new Date().getTime();
        const diff = Math.max(0, Math.ceil((lockDate - now) / 1000));
        setTimeLeft(diff);
        if (diff <= 0 && lockTimerRef.current) {
          clearInterval(lockTimerRef.current);
          setError(null);
        }
      };
      
      checkLock();
      lockTimerRef.current = setInterval(checkLock, 1000);
    }
    return () => {
      if (lockTimerRef.current) clearInterval(lockTimerRef.current);
    };
  }, [progress?.lockedUntil]);

  const handleStartHunt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamNameInput.trim()) return;

    // Check if team name exists
    const q = query(collection(db, 'treasure_hunt_progress'), where('teamName', '==', teamNameInput.trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setError("This team name is already taken. Choose another.");
      return;
    }

    // Generate shuffled sequence for the user after index 0
    // Actually the user said "shufful the question for participant after 1 pin"
    // I'll keep index 0 as same for all, and shuffle the rest
    const numClues = activeGame?.clues?.length || 0;
    let sequence = [0];
    if (numClues > 1) {
      const remaining = Array.from({ length: numClues - 1 }, (_, i) => i + 1);
      // Simple shuffle
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      sequence = [...sequence, ...remaining];
    }

    const initialProgress = {
      userId: user!.uid,
      userName: profile?.name || 'Hunter',
      teamName: teamNameInput.trim(),
      huntId: activeGame.id,
      clueSequence: sequence,
      currentClueIndex: 0,
      lockedUntil: null,
      isCompleted: false
    };

    await setDoc(doc(db, 'treasure_hunt_progress', user!.uid), initialProgress);
    setProgress(initialProgress);
    setError(null);
  };

  const currentClue = useMemo(() => {
    if (!activeGame || !progress || !progress.clueSequence) return null;
    const actualClueIndex = progress.clueSequence[progress.currentClueIndex];
    return activeGame.clues[actualClueIndex];
  }, [activeGame, progress]);

  const handleSubmitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGame || !progress || timeLeft > 0 || !currentClue) return;
    if (pin.length !== 5) {
      setError("Enter a 5-digit PIN");
      return;
    }

    if (pin === currentClue.code) {
      // Correct!
      const nextIndex = progress.currentClueIndex + 1;
      const isFinished = nextIndex >= (progress.clueSequence?.length || 0);
      
      await setDoc(doc(db, 'treasure_hunt_progress', user!.uid), {
        ...progress,
        currentClueIndex: nextIndex,
        isCompleted: isFinished,
        completedAt: isFinished ? new Date().toISOString() : null,
        lockedUntil: null
      });
      setPin('');
      setError(null);
    } else {
      // Wrong! Use penaltyTime from config or default to 5 minutes
      const penaltySeconds = activeGame?.penaltyTime || 300;
      const lockUntil = new Date(Date.now() + penaltySeconds * 1000).toISOString();
      await setDoc(doc(db, 'treasure_hunt_progress', user!.uid), {
        ...progress,
        lockedUntil: lockUntil
      });
      setError(`Incorrect PIN. System locked for ${Math.floor(penaltySeconds/60)} minutes.`);
      setPin('');
    }
  };

  if (loading) {
    return (
      <div className="pt-32 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-4" />
        <p className="text-text-muted font-bold tracking-widest uppercase text-xs text-center">Encrypting Clues...</p>
      </div>
    );
  }

  if (!activeGame?.isActive && !progress?.isCompleted) {
    return (
      <div className="pt-32 pb-20 max-w-2xl mx-auto px-4 text-center">
        <div className="glass-card p-12 rounded-[3rem]">
          <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Lock className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="text-3xl font-serif text-brand-dark mb-4">The Gate is Sealed</h1>
          <p className="text-text-muted mb-8 leading-relaxed">The Treasure Hunt hasn't officially started yet. The Admin will release the signal soon!</p>
          <Link to="/dashboard" className="btn-secondary py-3 px-8">Back to Safety</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 bg-bg-paper min-h-screen">
      <div className="max-w-6xl mx-auto px-4">
        {!progress?.teamName ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto"
          >
            <div className="glass-card p-10 rounded-[3rem] text-center border-t-8 border-brand-primary">
              <div className="w-16 h-16 bg-brand-soft rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="text-brand-primary w-8 h-8" />
              </div>
              <h1 className="text-3xl font-serif text-brand-dark mb-2">Form Your Team</h1>
              <p className="text-text-muted mb-8 text-sm">Choose a unique identity for your quest.</p>
              
              <form onSubmit={handleStartHunt} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1 text-left block">Team Name</label>
                  <input 
                    type="text"
                    value={teamNameInput}
                    onChange={(e) => setTeamNameInput(e.target.value)}
                    placeholder="e.g. Alchemists Elite"
                    className="input-field text-center font-bold"
                  />
                </div>
                {error && (
                  <p className="text-xs text-red-600 font-bold flex items-center justify-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {error}
                  </p>
                )}
                <button type="submit" className="btn-primary w-full py-4 flex items-center justify-center gap-2">
                  Assemble Team <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {progress?.isCompleted ? (
                  <motion.div
                    key="completed"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                  >
                    <div className="glass-card p-12 rounded-[3.5rem] border-t-8 border-amber-500 overflow-hidden relative">
                       <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <Trophy className="w-64 h-64 text-brand-dark" />
                      </div>
                      
                      <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-8">
                        <Trophy className="w-12 h-12 text-amber-600" />
                      </div>
                      <h1 className="text-4xl font-serif text-brand-dark mb-4">Game Over! U Win</h1>
                      <p className="text-text-muted mb-10 text-lg">Go to the start point to claim your discovery.</p>
                      
                      <div className="bg-brand-soft rounded-3xl p-10 max-w-sm mx-auto mb-10 border border-brand-primary/10 shadow-inner">
                        <p className="text-[10px] uppercase font-bold text-brand-primary tracking-widest mb-4">Quest Outcome</p>
                        <p className="text-3xl font-serif text-brand-dark mb-2 italic">distillation complete</p>
                        <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mt-4" />
                      </div>

                      <Link to="/dashboard" className="btn-primary py-4 px-12 inline-flex items-center gap-2">
                        To the Dashboard <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="active"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-brand-primary/10">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-brand-soft rounded-2xl flex items-center justify-center">
                          <Map className="w-8 h-8 text-brand-primary" />
                        </div>
                        <div>
                          <h1 className="text-3xl font-serif text-brand-dark leading-tight">Clue #{progress.currentClueIndex + 1}</h1>
                          <p className="text-text-muted text-sm font-medium">Team: {progress.teamName}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex flex-wrap gap-2">
                          {activeGame?.clues?.map((_: any, i: number) => (
                            <div 
                              key={i}
                              className={`w-3 h-3 rounded-full transition-all duration-500 ${i < progress.currentClueIndex ? 'bg-green-500' : i === progress.currentClueIndex ? 'bg-brand-primary scale-125' : 'bg-gray-200'}`}
                            />
                          ))}
                        </div>
                        <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">
                          Progress: {Math.round((progress.currentClueIndex / activeGame?.clues?.length) * 100)}%
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(progress.currentClueIndex / activeGame?.clues?.length) * 100}%` }}
                        className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary"
                      />
                    </div>

                    {/* Clue Content */}
                    <div className="glass-card p-10 md:p-16 rounded-[3rem] text-center">
                      <div className="max-w-2xl mx-auto">
                        <p className="text-[10px] uppercase font-bold text-brand-primary tracking-widest mb-8">Current Mystery</p>
                        <h2 className="text-2xl md:text-3xl font-serif text-brand-dark mb-12 leading-snug italic">
                          "{currentClue?.clue}"
                        </h2>
                        
                        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-12" />

                        <form onSubmit={handleSubmitPin} className="space-y-8">
                          <div className="space-y-4">
                            <label className="text-sm font-bold text-text-muted uppercase tracking-widest flex items-center justify-center gap-2">
                              <Key className="w-4 h-4 text-brand-primary" />
                              Enter 5-Digit PIN to Progress
                            </label>
                            <div className="relative max-w-xs mx-auto">
                              <input 
                                type="text"
                                maxLength={5}
                                value={pin}
                                disabled={timeLeft > 0}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                placeholder="00000"
                                className={`input-field text-center font-mono text-3xl tracking-[0.5em] py-6 rounded-2xl ${timeLeft > 0 ? 'bg-gray-100 opacity-50 cursor-not-allowed' : 'focus:ring-brand-primary'}`}
                              />
                              {timeLeft > 0 && (
                                <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] rounded-2xl flex items-center justify-center">
                                  <div className="flex items-center gap-2 text-red-600 font-bold bg-white px-4 py-2 rounded-full shadow-lg border border-red-100">
                                     <Clock className="w-4 h-4 animate-pulse" />
                                     {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <button 
                            type="submit"
                            disabled={pin.length !== 5 || timeLeft > 0}
                            className="btn-primary py-5 px-16 text-lg tracking-widest uppercase flex items-center justify-center gap-3 mx-auto disabled:opacity-50 disabled:grayscale transition-all hover:scale-105 active:scale-95"
                          >
                            Authenticate Point <ArrowRight className="w-5 h-5" />
                          </button>

                          {error && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center justify-center gap-2 text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100 text-sm font-medium"
                            >
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              {error}
                            </motion.div>
                          )}
                        </form>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sidebar Leaderboard */}
            <div className="lg:col-span-1">
              <div className="glass-card p-8 rounded-[2.5rem] sticky top-24">
                <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                   <Trophy className="text-amber-500 w-5 h-5" />
                   <h3 className="text-xl font-serif text-brand-dark">Live Hunt Tracker</h3>
                </div>
                <div className="space-y-4">
                  {allProgress
                    .sort((a, b) => b.currentClueIndex - a.currentClueIndex)
                    .slice(0, 10)
                    .map((p, i) => (
                      <div key={p.userId} className={`flex items-center justify-between p-3 rounded-xl transition-all ${p.userId === user?.uid ? 'bg-brand-soft border border-brand-primary/20 scale-[1.02]' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-3">
                           <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-500'}`}>
                             {i + 1}
                           </span>
                           <div className="overflow-hidden">
                             <p className="text-xs font-bold text-brand-dark truncate">{p.teamName || 'Anonymous'}</p>
                             <div className="flex items-center gap-1">
                               <div className="w-20 h-1 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-brand-primary" 
                                    style={{ width: `${(p.currentClueIndex / (activeGame?.clues?.length || 1)) * 100}%` }}
                                  />
                               </div>
                               <span className="text-[8px] font-bold text-text-muted">{p.currentClueIndex} solved</span>
                             </div>
                           </div>
                        </div>
                        {p.isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                      </div>
                    ))}
                  {allProgress.length === 0 && (
                    <p className="text-center py-10 text-text-muted italic text-xs">No hunters detected yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <BroadcastNotifier />
    </div>
  );
}
