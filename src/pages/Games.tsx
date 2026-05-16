import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Brain, Map, Clock, ArrowRight, Lock, Sparkles, Loader2 } from 'lucide-react';

export default function Games() {
  const { user } = useAuth();
  const [quizLive, setQuizLive] = useState<any>(null);
  const [treasureLive, setTreasureLive] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const qQuiz = query(collection(db, 'quizzes'), where('isActive', '==', true), limit(1));
    const unsubQuiz = onSnapshot(qQuiz, (snap) => {
      if (!snap.empty) {
        setQuizLive({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setQuizLive(null);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'quizzes');
    });
    
    const qHunt = query(collection(db, 'treasure_hunts'), where('isActive', '==', true), limit(1));
    const unsubTreasure = onSnapshot(qHunt, (snap) => {
      if (!snap.empty) {
        setTreasureLive({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setTreasureLive(null);
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'treasure_hunts');
    });

    return () => {
      unsubQuiz();
      unsubTreasure();
    };
  }, [user]);

  const noGamesLive = !quizLive?.isActive && !treasureLive?.isActive;

  if (loading) {
    return (
      <div className="pt-32 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-4" />
        <p className="text-text-muted font-bold tracking-widest uppercase text-xs">Scanning Arena...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="pt-32 pb-20 max-w-xl mx-auto px-4 text-center">
        <div className="glass-card p-12 rounded-[2.5rem]">
          <h2 className="text-3xl font-serif text-brand-dark mb-4">Laboratory Access Restricted</h2>
          <p className="text-text-muted mb-8">Please sign in to view and participate in live events.</p>
          <Link to="/" className="btn-primary py-3 px-8">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 bg-bg-paper min-h-screen">
      <div className="max-w-7xl mx-auto px-4">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-serif text-brand-dark mb-4">Rasayan Gaming Arena</h1>
          <p className="text-text-muted max-w-2xl mx-auto italic">
            Test your knowledge and survival instincts in our exclusive fest-themed games.
          </p>
        </header>

        {noGamesLive ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-16 rounded-[4rem] text-center border-2 border-dashed border-gray-200"
          >
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <Clock className="w-12 h-12 text-text-muted animate-pulse" />
            </div>
            <h2 className="text-3xl font-serif text-brand-dark mb-4">No Games Live Right Now</h2>
            <p className="text-text-muted mb-8 text-lg">The arena is currently being prepared for the next round of competition.</p>
            <div className="inline-flex items-center gap-2 px-6 py-2 bg-brand-soft text-brand-primary rounded-full text-xs font-bold uppercase tracking-widest shadow-inner">
               <Sparkles className="w-3 h-3" /> Coming Soon: Chemical Chaos 2.0
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Quiz Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`glass-card p-10 rounded-[3.5rem] relative overflow-hidden group border-2 transition-all ${quizLive?.isActive ? 'border-amber-500 bg-amber-50/10' : 'border-gray-100 opacity-60'}`}
            >
               <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Brain className="w-48 h-48 text-brand-dark" />
              </div>
              
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${quizLive?.isActive ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                  <Brain className="w-8 h-8" />
                </div>
                {quizLive?.isActive ? (
                  <span className="px-4 py-1 bg-green-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full animate-pulse shadow-lg shadow-green-500/20">
                    Live Now
                  </span>
                ) : (
                  <span className="px-4 py-1 bg-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                )}
              </div>

              <div className="relative z-10">
                <h3 className="text-3xl font-serif text-brand-dark mb-2">{quizLive?.title || "Chemistry Quiz"}</h3>
                <p className="text-text-muted mb-8 leading-relaxed h-12 overflow-hidden line-clamp-2 italic">
                  {quizLive?.description || "Think fast! The periodic table won't save you here."}
                </p>

                {quizLive?.isActive ? (
                  <Link 
                    to="/quiz" 
                    className="w-full btn-primary py-4 rounded-2xl bg-amber-600 hover:bg-amber-700 flex items-center justify-center gap-3 transition-transform group-hover:scale-[1.02]"
                  >
                    Enter the Lab <ArrowRight className="w-5 h-5" />
                  </Link>
                ) : (
                  <div className="w-full bg-gray-100 text-gray-400 py-4 rounded-2xl font-bold uppercase tracking-widest text-center text-sm border border-gray-200">
                    Returning Soon
                  </div>
                )}
              </div>
            </motion.div>

            {/* Treasure Hunt Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`glass-card p-10 rounded-[3.5rem] relative overflow-hidden group border-2 transition-all ${treasureLive?.isActive ? 'border-brand-primary bg-brand-soft/20' : 'border-gray-100 opacity-60'}`}
            >
               <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Map className="w-48 h-48 text-brand-dark" />
              </div>
              
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${treasureLive?.isActive ? 'bg-brand-soft text-brand-primary' : 'bg-gray-100 text-gray-400'}`}>
                  <Map className="w-8 h-8" />
                </div>
                {treasureLive?.isActive ? (
                  <span className="px-4 py-1 bg-brand-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-full animate-pulse shadow-lg shadow-brand-primary/20">
                    Live Now
                  </span>
                ) : (
                  <span className="px-4 py-1 bg-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                )}
              </div>

              <div className="relative z-10">
                <h3 className="text-3xl font-serif text-brand-dark mb-2">{treasureLive?.title || "Treasure Hunt"}</h3>
                <p className="text-text-muted mb-8 leading-relaxed h-12 overflow-hidden line-clamp-2 italic">
                  {treasureLive?.description || "Follow the chemical trail across the campus."}
                </p>

                {treasureLive?.isActive ? (
                  <Link 
                    to="/treasure-hunt" 
                    className="w-full btn-primary py-4 rounded-2xl bg-brand-primary hover:bg-brand-dark flex items-center justify-center gap-3 transition-transform group-hover:scale-[1.02]"
                  >
                    Start the Hunt <ArrowRight className="w-5 h-5" />
                  </Link>
                ) : (
                  <div className="w-full bg-gray-100 text-gray-400 py-4 rounded-2xl font-bold uppercase tracking-widest text-center text-sm border border-gray-200">
                    Coming Soon
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
