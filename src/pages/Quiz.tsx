import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { onSnapshot, collection, query, where, getDocs, addDoc, orderBy, limit } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Clock, CheckCircle2, ChevronRight, Trophy, AlertCircle, Loader2, Award, TrendingUp, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import BroadcastNotifier from '../components/BroadcastNotifier';

export default function Quiz() {
  const { user, profile } = useAuth();
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userResponse, setUserResponse] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<'intro' | 'name_entry' | 'playing' | 'completed'>('intro');
  const [quizNameInput, setQuizNameInput] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showInterimLeaderboard, setShowInterimLeaderboard] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [totalResponseTime, setTotalResponseTime] = useState(0);
  const [lastPointsGained, setLastPointsGained] = useState(0);
  const [lastStreakBonus, setLastStreakBonus] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allResponses, setAllResponses] = useState<any[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs to allow handleNextQuestion to access current values without being recreated constantly
  const timeLeftRef = useRef(30);
  const scoreRef = useRef(0);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    if (user) {
      // 1. Check for live quiz config
      const qQuiz = query(collection(db, 'quizzes'), where('isActive', '==', true), limit(1));
      const unsubQuiz = onSnapshot(qQuiz, (snap) => {
        if (!snap.empty) {
          setActiveQuiz({ id: snap.docs[0].id, ...snap.docs[0].data() });
        } else {
          setActiveQuiz(null);
        }
        setLoading(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'quizzes');
      });

      // 2. Check if user already participated
      const fetchResponse = async () => {
        const q = query(collection(db, 'quiz_responses'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setUserResponse(snap.docs[0].data());
          setCurrentStep('completed');
        }
      };
      fetchResponse();

      // 3. Fetch all responses for live leaderboard
      const qResp = query(collection(db, 'quiz_responses'), orderBy('score', 'desc'), limit(10));
      const unsubResponses = onSnapshot(qResp, (snap) => {
        setAllResponses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'quiz_responses');
      });

      return () => {
        unsubQuiz();
        unsubResponses();
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [user]);

  const handleJoinQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizNameInput.trim()) return;

    setLoading(true);
    try {
      const q = query(collection(db, 'quiz_responses'), where('quizName', '==', quizNameInput.trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setError("This name is already taken. Try a different one!");
        setLoading(false);
        return;
      }
      setCurrentStep('playing');
      setError(null);
    } catch (err) {
      console.error("Error joining quiz:", err);
      setError("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = useCallback(async (answerIndex: number) => {
    if (submitting || showFeedback) return;

    const question = activeQuiz?.questions?.[currentQuestionIndex];
    if (!question) return;

    let pointsGained = 0;
    let bonusGained = 0;
    const isTimeout = answerIndex === -1;
    const isCorrect = !isTimeout && answerIndex === question.correctAnswer;
    
    let newStreak = streak;
    let currentResponseTime = 0;

    if (isCorrect) {
      const timeLimit = question.timeLimit || 30;
      currentResponseTime = timeLimit - timeLeftRef.current;
      setTotalResponseTime(prev => prev + currentResponseTime);

      // Scoring Formula
      const basePoints = 1000;
      const speedFactor = 1 - (currentResponseTime / timeLimit);
      let earnedPoints = Math.floor(basePoints * speedFactor);
      
      // Clamp minimum 100
      if (earnedPoints < 100) earnedPoints = 100;

      // Double points
      if (question.isDoublePoints) {
        earnedPoints *= 2;
      }

      // Streak Bonus
      newStreak += 1;
      if (newStreak >= 3) {
        bonusGained = 100 + (newStreak - 3) * 50;
      }
      
      pointsGained = earnedPoints + bonusGained;
      setScore(prev => prev + pointsGained);
      setStreak(newStreak);
      setMaxStreak(prev => Math.max(prev, newStreak));
    } else {
      newStreak = 0;
      setStreak(0);
    }

    setLastPointsGained(pointsGained);
    setLastStreakBonus(bonusGained);
    setLastAnswerCorrect(isCorrect);
    setShowFeedback(true);
    const updatedAnswers = [...answers, answerIndex];
    setAnswers(updatedAnswers);

    if (timerRef.current) clearInterval(timerRef.current);

    // Flow: Feedback (2.5s) -> Interim Leaderboard (5s) -> Next Question
    setTimeout(async () => {
      setShowFeedback(false);
      setShowInterimLeaderboard(true);
      
      setTimeout(async () => {
        setShowInterimLeaderboard(false);
        if (currentQuestionIndex < activeQuiz.questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
        } else {
          // Final submission
          setSubmitting(true);
          const finalScore = scoreRef.current + pointsGained;
          const correctCount = updatedAnswers.filter((a, idx) => a === activeQuiz.questions[idx].correctAnswer).length;
          
          const responseData = {
            userId: user?.uid,
            userName: profile?.name || 'User',
            quizName: quizNameInput,
            quizId: activeQuiz.id,
            score: finalScore,
            correctCount: correctCount,
            totalQuestions: activeQuiz.questions.length,
            answers: updatedAnswers,
            currentStreak: newStreak,
            highestStreak: Math.max(maxStreak, newStreak),
            averageResponseTime: (totalResponseTime + currentResponseTime) / (correctCount || 1),
            submittedAt: new Date().toISOString()
          };

          try {
            const q = query(collection(db, 'quiz_responses'), where('userId', '==', user?.uid));
            const snap = await getDocs(q);
            if (snap.empty) {
              await addDoc(collection(db, 'quiz_responses'), responseData);
            }
            setUserResponse(responseData);
            setCurrentStep('completed');
          } catch (err) {
            console.error("Error submitting quiz:", err);
          } finally {
            setSubmitting(false);
          }
        }
      }, 5000);
    }, 2500);
  }, [answers, currentQuestionIndex, activeQuiz, user, profile, submitting, showFeedback, quizNameInput, streak, maxStreak, totalResponseTime]);

  // Handle Timer Initialization
  useEffect(() => {
    if (currentStep === 'playing' && activeQuiz?.questions?.[currentQuestionIndex] && !showFeedback && !showInterimLeaderboard) {
      const q = activeQuiz.questions[currentQuestionIndex];
      setTimeLeft(q.timeLimit || 30);
    }
  }, [currentStep, currentQuestionIndex, activeQuiz, showFeedback, showInterimLeaderboard]);

  // Handle Timer Ticking
  useEffect(() => {
    if (currentStep === 'playing' && !showFeedback && !showInterimLeaderboard) {
      if (timerRef.current) clearInterval(timerRef.current);
      
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleNextQuestion(-1); // -1 means no answer given (timeout)
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentStep, showFeedback, showInterimLeaderboard, handleNextQuestion]);

  if (loading) {
    return (
      <div className="pt-32 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-4" />
        <p className="text-text-muted font-bold tracking-widest uppercase text-xs">Calibrating Lab Equipment...</p>
      </div>
    );
  }

  if (!activeQuiz?.isActive && currentStep !== 'completed') {
    return (
      <div className="pt-32 pb-20 max-w-2xl mx-auto px-4 text-center">
        <div className="glass-card p-12 rounded-[3rem]">
          <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="text-3xl font-serif text-brand-dark mb-4">Quiz Lab is Idle</h1>
          <p className="text-text-muted mb-8 leading-relaxed">The admin hasn't activated the live quiz yet. Keep an eye on your dashboard for the "Active" signal!</p>
          <Link to="/dashboard" className="btn-secondary py-3 px-8">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 bg-bg-paper min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <AnimatePresence mode="wait">
          {currentStep === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="glass-card p-12 rounded-[3rem] border-t-8 border-brand-primary">
                <div className="flex justify-center mb-8">
                  <div className="relative">
                    <Brain className="w-20 h-20 text-brand-primary" />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }} 
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute -top-2 -right-2 bg-orange-500 text-white p-2 rounded-full"
                    >
                      <Trophy className="w-5 h-5" />
                    </motion.div>
                  </div>
                </div>
                <h1 className="text-4xl font-serif text-brand-dark mb-4">Rasayan Live Quiz</h1>
                <p className="text-text-muted mb-8 text-lg max-w-lg mx-auto">
                  Test your chemical intuition in this high-speed live event! 
                  {activeQuiz.questions?.length} questions await. Be fast, be precise.
                </p>
                <div className="flex flex-col md:flex-row gap-4 justify-center items-center mb-10">
                  <div className="px-6 py-3 bg-gray-50 rounded-2xl flex items-center gap-2">
                    <Clock className="w-5 h-5 text-brand-primary" />
                    <span className="font-bold text-brand-dark">Timed Questions</span>
                  </div>
                  <div className="px-6 py-3 bg-gray-50 rounded-2xl flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-brand-primary" />
                    <span className="font-bold text-brand-dark">Instant Submission</span>
                  </div>
                </div>
                <button 
                  onClick={() => setCurrentStep('name_entry')}
                  className="btn-primary py-4 px-12 text-lg shadow-xl shadow-brand-primary/20 flex items-center gap-3 mx-auto"
                >
                  Initiate Reaction <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 'name_entry' && (
            <motion.div
              key="name_entry"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto"
            >
              <div className="glass-card p-10 rounded-[2.5rem] border-t-8 border-brand-primary">
                <h2 className="text-2xl font-serif text-brand-dark mb-2">Participant ID</h2>
                <p className="text-sm text-text-muted mb-8">Enter your unique handle for the leaderboard.</p>
                
                <form onSubmit={handleJoinQuiz} className="space-y-6">
                  <div>
                    <input 
                      type="text"
                      value={quizNameInput}
                      onChange={(e) => setQuizNameInput(e.target.value)}
                      placeholder="e.g. CarbonKing"
                      className="input-field text-center text-xl font-serif"
                      maxLength={15}
                      required
                    />
                  </div>
                  {error && (
                    <p className="text-red-500 text-xs font-bold text-center bg-red-50 py-2 rounded-lg">{error}</p>
                  )}
                  <button 
                    type="submit"
                    className="w-full btn-primary py-4 text-lg"
                  >
                    Enter Arena
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {currentStep === 'playing' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-8"
            >
              <AnimatePresence mode="wait">
                {showInterimLeaderboard ? (
                  <motion.div
                    key="interim-leaderboard"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="glass-card p-10 rounded-[3rem] border-t-8 border-amber-500 bg-brand-dark text-white"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-3xl font-serif">Standings</h2>
                        <p className="text-xs text-white/50 uppercase tracking-widest font-bold">After Question {currentQuestionIndex + 1}</p>
                      </div>
                      <Trophy className="w-12 h-12 text-amber-500" />
                    </div>

                    <div className="space-y-4 max-w-xl mx-auto">
                      {allResponses.slice(0, 5).map((res, i) => (
                        <motion.div 
                          key={res.id}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: i * 0.1 }}
                          className={`flex items-center justify-between p-4 rounded-2xl ${res.userId === user?.uid ? 'bg-brand-primary text-white scale-105 shadow-xl' : 'bg-white/5 border border-white/10'}`}
                        >
                          <div className="flex items-center gap-4">
                            <span className={`text-xl font-serif ${i === 0 ? 'text-amber-400' : 'text-white/30'}`}>{i + 1}</span>
                            <span className="font-medium">{res.quizName || res.userName}</span>
                            {res.userId === user?.uid && <span className="bg-white/20 text-[8px] px-2 py-0.5 rounded-full uppercase font-black tracking-widest border border-white/20">YOU</span>}
                          </div>
                          <span className="text-xl font-bold font-mono">{res.score}</span>
                        </motion.div>
                      ))}
                    </div>

                    <div className="mt-12 text-center">
                      <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 animate-pulse">
                        Prepare for Next Inquiry <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="question-content" className="space-y-8">
                    {/* Progress Header */}
                    <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Scientific Inquiry</span>
                        <span className="text-2xl font-serif text-brand-dark">Question {currentQuestionIndex + 1} <span className="text-text-muted text-lg">/ {activeQuiz.questions.length}</span></span>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs font-bold text-brand-primary">Score: {score}</span>
                          <div className="h-4 w-px bg-gray-200" />
                          <span className="text-xs font-bold text-orange-500 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Streak: {streak}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {streak >= 3 && (
                          <motion.div 
                            key={streak}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border border-orange-200"
                          >
                            {streak} FIRE!
                          </motion.div>
                        )}
                        <div className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-mono text-xl font-bold transition-all ${timeLeft < 10 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-brand-soft text-brand-primary'}`}>
                          <Clock className="w-5 h-5" />
                          {timeLeft}s
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100}%` }}
                        className="h-full bg-brand-primary"
                      />
                    </div>

                    {/* Question Card */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2">
                          <div className="glass-card p-10 rounded-[3rem] relative overflow-hidden">
                            {showFeedback && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`absolute inset-0 z-10 flex flex-col items-center justify-center ${lastAnswerCorrect ? 'bg-green-500' : 'bg-red-500'} text-white shadow-2xl`}
                              >
                                <motion.div
                                  initial={{ y: 20 }}
                                  animate={{ y: 0 }}
                                  className="text-center"
                                >
                                  {lastAnswerCorrect ? (
                                    <>
                                      <CheckCircle2 className="w-20 h-20 mx-auto mb-4" />
                                      <h3 className="text-4xl font-serif mb-2">Excellent!</h3>
                                      <div className="space-y-1">
                                        <p className="text-2xl font-bold">+ {lastPointsGained - lastStreakBonus} pts</p>
                                        {lastStreakBonus > 0 && (
                                          <motion.p 
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            className="text-amber-200 text-sm font-bold tracking-widest uppercase"
                                          >
                                            + {lastStreakBonus} Streak Bonus!
                                          </motion.p>
                                        )}
                                        <p className="text-xs opacity-70 uppercase tracking-widest mt-2">{streak} Question Streak</p>
                                      </div>
                                    </>
                                  ) : timeLeft === 0 ? (
                                    <>
                                      <Clock className="w-20 h-20 mx-auto mb-4 animate-bounce" />
                                      <h3 className="text-4xl font-serif mb-2">Time's Up!</h3>
                                      <p className="text-xl opacity-90">Too slow for this reaction!</p>
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-20 h-20 mx-auto mb-4" />
                                      <h3 className="text-4xl font-serif mb-2">Incorrect</h3>
                                      <p className="text-xl opacity-90">Better luck next time!</p>
                                    </>
                                  )}
                                </motion.div>
                              </motion.div>
                            )}
                            <h2 className="text-2xl md:text-3xl font-serif text-brand-dark mb-10 leading-snug">
                              {activeQuiz.questions[currentQuestionIndex].text}
                            </h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activeQuiz.questions[currentQuestionIndex].options.map((option: string, i: number) => (
                              <button
                                key={i}
                                onClick={() => handleNextQuestion(i)}
                                className="p-6 text-left rounded-2xl border-2 border-gray-100 hover:border-brand-primary hover:bg-brand-soft/30 transition-all group flex items-center gap-4 bg-white shadow-sm"
                              >
                                <span className="w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-brand-primary group-hover:text-white flex items-center justify-center font-bold text-text-muted transition-colors">
                                  {String.fromCharCode(65 + i)}
                                </span>
                                <span className="text-lg font-medium text-brand-dark">{option}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-1">
                        <div className="glass-card p-8 rounded-[2.5rem] bg-brand-dark text-white">
                          <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                            <TrendingUp className="text-brand-primary w-5 h-5" />
                            <h3 className="text-xl font-serif">Quick Leaderboard</h3>
                          </div>
                          <div className="space-y-4">
                            {allResponses.map((res, i) => (
                              <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-amber-500' : 'bg-white/10'}`}>
                                    {i + 1}
                                  </span>
                                  <span className="text-xs truncate max-w-[100px]">{res.quizName || res.userName}</span>
                                </div>
                                <span className="text-xs font-bold text-brand-primary">{res.score} pts</span>
                              </div>
                            ))}
                            {allResponses.length === 0 && (
                              <p className="text-center py-4 text-[10px] opacity-50 italic">No submissions yet.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {currentStep === 'completed' && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="glass-card p-12 rounded-[3.5rem] border-t-8 border-green-500 overflow-hidden relative">
                 <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Award className="w-64 h-64 text-brand-dark" />
                </div>
                
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h1 className="text-4xl font-serif text-brand-dark mb-4">Quiz Completed!</h1>
                <p className="text-text-muted mb-10 text-lg">The distillation process has finished. Your results are logged.</p>
                
                <div className="bg-brand-soft rounded-3xl p-8 max-w-sm mx-auto mb-10 border border-brand-primary/10 shadow-inner">
                  <p className="text-[10px] uppercase font-bold text-brand-primary tracking-widest mb-2">Final Efficiency Score</p>
                  <p className="text-6xl font-serif text-brand-dark mb-1">
                    {userResponse?.score} <span className="text-xl text-text-muted">pts</span>
                  </p>
                  <p className="text-sm font-bold text-brand-primary mb-4">
                    {userResponse?.correctCount} / {userResponse?.totalQuestions} Correct
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-brand-primary/10">
                    <div className="text-center">
                      <p className="text-[8px] uppercase font-bold text-text-muted">Max Streak</p>
                      <p className="text-lg font-serif text-orange-600">{userResponse?.highestStreak || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] uppercase font-bold text-text-muted">Avg Speed</p>
                      <p className="text-lg font-serif text-brand-primary">{(userResponse?.averageResponseTime || 0).toFixed(1)}s</p>
                    </div>
                  </div>

                  <div className="w-full h-1 bg-brand-primary/20 rounded-full mt-6">
                    <div 
                      className="h-full bg-brand-primary rounded-full" 
                      style={{ width: `${(userResponse?.correctCount / (userResponse?.totalQuestions || 1)) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-center mb-10 text-text-muted bg-gray-50 py-3 px-6 rounded-2xl w-fit mx-auto">
                   <AlertCircle className="w-4 h-4" />
                   <p className="text-xs font-bold uppercase tracking-wider">Results sent to Admin Panel</p>
                </div>

                <Link to="/dashboard" className="btn-primary py-4 px-12 inline-flex items-center gap-2">
                  Return to Dashboard
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BroadcastNotifier />
    </div>
  );
}
