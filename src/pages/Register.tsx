import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EVENTS } from '../constants/events';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ClipboardList, Send, AlertCircle, Loader2 } from 'lucide-react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, user: any) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: user?.uid,
      email: user?.email,
      emailVerified: user?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return new Error(`Registration failed: ${errInfo.error}`);
}

const COLLEGES = [
  "K J Somaiya College of Science and Commerce (KJSSC)",
  "Wilson College",
  "Elphinstone College",
  "Mithibai College",
  "St. Xavier's College",
  "Jai Hind College",
  "Sophia College",
  "Other"
];

export default function Register() {
  const { user, profile, loading, login, isAuthenticating } = useAuth();
  const navigate = useNavigate();
  
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [teamDetails, setTeamDetails] = useState<{[key: string]: string[]}>({});
  const [phone, setPhone] = useState('');
  const [college, setCollege] = useState('');
  const [collegeOption, setCollegeOption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cash'>('upi');
  const [transactionId, setTransactionId] = useState('');

  const totalAmount = selectedEvents.reduce((acc, id) => {
    const event = EVENTS.find(e => e.id === id);
    return acc + (event?.price || 0);
  }, 0);

  // Load persisted form data on mount
  useEffect(() => {
    const saved = localStorage.getItem('registration_form');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.selectedEvents) setSelectedEvents(data.selectedEvents);
        if (data.teamDetails) setTeamDetails(data.teamDetails);
        if (data.phone) setPhone(data.phone);
        if (data.college) setCollege(data.college);
        if (data.collegeOption) setCollegeOption(data.collegeOption);
        if (data.step) setStep(data.step);
      } catch (e) {
        console.error("Error loading saved form", e);
      }
    }
  }, []);

  // Sync profile data if phone/college aren't manually entered yet
  useEffect(() => {
    if (profile) {
      if (!phone) setPhone(profile.phone || '');
      
      const initialCollege = profile.college || '';
      if (!college && !collegeOption && initialCollege) {
        if (COLLEGES.includes(initialCollege)) {
          setCollegeOption(initialCollege);
          setCollege(initialCollege);
        } else {
          setCollegeOption('Other');
          setCollege(initialCollege);
        }
      }
    }
    // We only want this to run when profile loads initially
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // Persist form data on changes
  useEffect(() => {
    const formToSave = { selectedEvents, teamDetails, phone, college, collegeOption, step };
    localStorage.setItem('registration_form', JSON.stringify(formToSave));
  }, [selectedEvents, teamDetails, phone, college, collegeOption, step]);

  const toggleEvent = (id: string) => {
    setSelectedEvents(prev => {
      const exists = prev.includes(id);
      if (exists) {
        const newDetails = { ...teamDetails };
        delete newDetails[id];
        setTeamDetails(newDetails);
        return prev.filter(e => e !== id);
      } else {
        const event = EVENTS.find(e => e.id === id);
        if (event?.isTeam) {
          const size = event.maxTeamSize || 1;
          setTeamDetails({ ...teamDetails, [id]: Array(size).fill('').map((_, i) => i === 0 ? (profile?.name || user?.displayName || '') : '') });
        }
        return [...prev, id];
      }
    });
  };

  const updateTeamMember = (eventId: string, index: number, value: string) => {
    setTeamDetails(prev => ({
      ...prev,
      [eventId]: prev[eventId].map((m, i) => i === index ? value : m)
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (selectedEvents.length === 0) {
      alert("Please select at least one event.");
      return;
    }
    if (phone.length !== 10) {
      alert("Please enter a valid 10-digit phone number.");
      return;
    }
    if (paymentMethod === 'upi' && !transactionId.trim()) {
      alert("Transaction ID / UTR is required for UPI payment verification.");
      return;
    }

    setSubmitting(true);
    try {
      // Update user profile with phone and college
      const userProfileUpdate = {
        userId: user.uid,
        name: profile?.name || user.displayName || 'Participant',
        email: user.email || '',
        phone,
        college,
        createdAt: profile?.createdAt || new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'users', user.uid), userProfileUpdate, { merge: true });
      } catch (err: any) {
        console.error("Profile update error:", err);
        throw new Error("Failed to update user profile. Please try again.", { cause: err });
      }

      const uniqueMessages = [
        "Welcome to the elemental storm! Your registration is a confirmed catalytic reaction.",
        "Quantum registration achieved! Your presence in Rasayan is now inevitable.",
        "Your participation is the missing element we needed for equilibrium.",
        "The bonds are formed! See you at the epicenter of chemistry.",
        "Reaction started! Your registration flux is now stable."
      ];
      const randomMsg = uniqueMessages[Math.floor(Math.random() * uniqueMessages.length)];
      const uniqueCode = Math.floor(10000 + Math.random() * 90000).toString();

      const registrationData = {
        userId: user.uid,
        userEmail: user.email || '',
        userName: profile?.name || user.displayName || 'Participant',
        eventIds: selectedEvents,
        teamDetails: teamDetails || {},
        phone,
        college,
        totalAmount,
        paymentMethod,
        transactionId: paymentMethod === 'cash' ? 'PAY_AT_DESK' : transactionId.trim(),
        paymentStatus: 'pending',
        confirmationMessage: randomMsg,
        uniqueCode,
        registrationTime: new Date().toISOString()
      };

      console.log("Submitting registration:", JSON.stringify(registrationData));
      try {
        await addDoc(collection(db, 'registrations'), registrationData);
      } catch (err: any) {
        console.error("Registration write error detail:", err);
        const fbError = handleFirestoreError(err, OperationType.CREATE, 'registrations', user);
        throw fbError;
      }

      localStorage.removeItem('registration_form');

      // Notify admin and user via API (await but ignore error to not block user)
      const eventsForEmail = selectedEvents.map(id => {
        const event = EVENTS.find(e => e.id === id);
        return { eventName: event?.name, type: event?.type, college };
      });

      try {
        await fetch('/api/notify-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            registrationData: eventsForEmail,
            userName: profile?.name || user.displayName || 'Participant',
            userEmail: user.email,
            uniqueCode
          })
        });
      } catch (err) {
        console.warn("Notification skipped:", err);
      }

      navigate('/dashboard', { state: { registered: true, uniqueCode } });
    } catch (error: any) {
      console.error("Critical registration error:", error);
      alert(error.message || "An unexpected error occurred. Please check your data and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-32 pb-20 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-4" />
        <p className="text-brand-dark font-serif text-xl">Loading your vault...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="pt-32 pb-20 max-w-xl mx-auto px-4 text-center">
        <div className="glass-card p-12 rounded-[2.5rem]">
          <div className="bg-brand-soft w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <AlertCircle className="text-brand-primary w-10 h-10" />
          </div>
          <h2 className="text-3xl font-serif text-brand-dark mb-4">Authentication Required</h2>
          <p className="text-text-muted mb-8">Please sign in to access the multi-event registration system.</p>
          <button 
            onClick={login} 
            disabled={isAuthenticating}
            className="btn-primary w-full py-4 text-lg disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            {isAuthenticating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In with Google'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 bg-bg-paper">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-serif text-brand-dark mb-2">Registration Portal</h1>
            <p className="text-text-muted">Step {step} of 3</p>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-2 w-12 rounded-full transition-all ${step === s ? 'bg-brand-primary' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        <form onSubmit={handleRegister}>
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="glass-card p-8 rounded-[2rem]">
                  <h2 className="text-2xl font-serif text-brand-dark mb-6 flex items-center gap-2">
                    <ClipboardList className="text-brand-primary" />
                    Select Your Events
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {EVENTS.map(event => (
                      <div
                        key={event.id}
                        onClick={() => toggleEvent(event.id)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                          selectedEvents.includes(event.id)
                            ? 'bg-brand-soft border-brand-primary shadow-inner'
                            : 'bg-white border-transparent hover:border-brand-soft shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${selectedEvents.includes(event.id) ? 'bg-brand-primary text-white' : 'bg-gray-100 text-text-muted'}`}>
                            {selectedEvents.includes(event.id) ? <Check className="w-4 h-4" /> : <div className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-bold text-brand-dark text-sm">{event.name}</p>
                            <p className="text-[10px] uppercase text-text-muted font-bold tracking-widest">{event.type}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedEvents.length === 0) {
                        alert("Please select at least one event to participate in.");
                        return;
                      }
                      setStep(2);
                    }}
                    className="btn-primary group flex items-center gap-2"
                  >
                    Next Step
                    <motion.div animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity }}>
                      <Send className="w-4 h-4" />
                    </motion.div>
                  </button>
                </div>
              </motion.div>
            ) : step === 2 ? (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="glass-card p-8 rounded-[2rem]">
                  <h2 className="text-2xl font-serif text-brand-dark mb-6">Personal Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-brand-primary uppercase tracking-widest ml-1">Name</label>
                      <input type="text" value={profile?.name} disabled className="input-field bg-gray-50 opacity-70" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-brand-primary uppercase tracking-widest ml-1">Email</label>
                      <input type="email" value={profile?.email} disabled className="input-field bg-gray-50 opacity-70" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-brand-primary uppercase tracking-widest ml-1">Phone Number</label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val.length <= 10) setPhone(val);
                        }}
                        placeholder="e.g. 9876543210"
                        className={`input-field ${phone.length > 0 && phone.length < 10 ? 'border-red-300 ring-red-100' : ''}`}
                      />
                      {phone.length > 0 && phone.length < 10 && (
                        <p className="text-[10px] text-red-500 font-bold ml-1">Please enter a valid 10-digit number</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-brand-primary uppercase tracking-widest ml-1">College/Organization</label>
                      <select
                        required
                        value={collegeOption}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCollegeOption(val);
                          if (val !== 'Other') {
                            setCollege(val);
                          } else {
                            setCollege('');
                          }
                        }}
                        className="input-field"
                      >
                        <option value="" disabled>Select your college</option>
                        {COLLEGES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    {collegeOption === 'Other' && (
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-bold text-brand-primary uppercase tracking-widest ml-1">Specify College Name</label>
                        <input
                          type="text"
                          required
                          value={college}
                          onChange={(e) => setCollege(e.target.value)}
                          placeholder="Enter your college name"
                          className="input-field"
                        />
                      </div>
                    )}
                  </div>

                  {selectedEvents.some(id => EVENTS.find(e => e.id === id)?.isTeam) && (
                    <div className="space-y-8 pt-8 border-t border-gray-100">
                      <h3 className="text-xl font-serif text-brand-dark">Team Members</h3>
                      {selectedEvents.map(id => {
                        const event = EVENTS.find(e => e.id === id);
                        if (!event?.isTeam) return null;
                        return (
                          <div key={id} className="space-y-4">
                            <p className="text-sm font-bold text-brand-primary uppercase tracking-widest">{event.name} Team</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {teamDetails[id]?.map((member, idx) => (
                                <div key={idx} className="space-y-2">
                                  <label className="text-[10px] font-bold text-text-muted uppercase">Member {idx + 1} {idx === 0 && '(Leader)'}</label>
                                  <input
                                    type="text"
                                    required
                                    value={member}
                                    onChange={(e) => updateTeamMember(id, idx, e.target.value)}
                                    placeholder={`Name of member ${idx + 1}`}
                                    className="input-field"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="glass-card p-8 rounded-[2rem] bg-brand-dark text-white">
                  <h3 className="text-xl font-serif mb-4 flex justify-between items-center">
                    <span>Registration Summary</span>
                    <span className="text-brand-primary">Total: ₹{totalAmount}</span>
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {selectedEvents.map(id => (
                      <span key={id} className="bg-white/10 text-xs px-3 py-1 rounded-full">{EVENTS.find(e => e.id === id)?.name}</span>
                    ))}
                  </div>
                  <p className="text-sm opacity-70 italic mb-4">* Please ensure all rules are understood before proceeding.</p>
                </div>

                <div className="flex justify-between items-center">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                    Back to Selection
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!phone || phone.length !== 10) {
                        alert("Please enter a valid 10-digit mobile number.");
                        return;
                      }
                      if (!college) {
                        alert("Please provide your college or organization name.");
                        return;
                      }
                      // Check team members
                      for (const eventId of selectedEvents) {
                        const event = EVENTS.find(e => e.id === eventId);
                        if (event?.isTeam) {
                          const members = teamDetails[eventId] || [];
                          if (members.some(m => !m.trim())) {
                            alert(`Please fill in all team member names for ${event.name}.`);
                            return;
                          }
                        }
                      }
                      setStep(3);
                    }}
                    className="btn-primary"
                  >
                    Next: Payment
                  </button>
                </div>
              </motion.div>
            ) : step === 3 ? (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="glass-card p-8 rounded-[2rem] border-2 border-brand-primary/20">
                  <h2 className="text-2xl font-serif text-brand-dark mb-6">Payment and Verification</h2>
                  
                  <div className="space-y-6 mb-8">
                    <p className="text-xs font-bold text-brand-primary uppercase tracking-widest ml-1">Select Payment Method</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div 
                        onClick={() => setPaymentMethod('upi')}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'upi' ? 'border-brand-primary bg-brand-soft' : 'border-gray-200 bg-white'}`}
                      >
                        <p className="font-bold text-sm">Online (UPI)</p>
                        <p className="text-[10px] text-text-muted">Instant Verification</p>
                      </div>
                      <div 
                        onClick={() => setPaymentMethod('cash')}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'cash' ? 'border-brand-primary bg-brand-soft' : 'border-gray-200 bg-white'}`}
                      >
                        <p className="font-bold text-sm">Cash at Desk</p>
                        <p className="text-[10px] text-text-muted">Pay at Venue</p>
                      </div>
                    </div>
                  </div>

                  {paymentMethod === 'upi' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div className="space-y-6">
                        <div className="bg-brand-soft p-6 rounded-2xl">
                          <p className="text-xs font-bold text-brand-primary uppercase tracking-widest mb-2">Registration Total</p>
                          <p className="text-4xl font-bold text-brand-dark">₹{totalAmount}</p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-brand-primary uppercase tracking-widest ml-1">Transaction ID / UTR</label>
                          <input
                            type="text"
                            required
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            placeholder="Enter the 12-digit transaction ID"
                            className="input-field"
                          />
                          <p className="text-[10px] text-text-muted italic ml-1">Important: Registration will be verified by admin after checking details.</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl shadow-sm border border-gray-100">
                        <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4">Scan to Pay via UPI</p>
                        <div className="w-48 h-48 bg-gray-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-brand-primary/20">
                           <div className="text-center p-4">
                             <div className="w-32 h-32 bg-brand-dark rounded-xl mx-auto mb-2 flex items-center justify-center">
                                <span className="text-white text-[10px] font-bold">UPI QR<br/>PLACEHOLDER</span>
                             </div>
                             <p className="text-[10px] text-brand-dark font-bold">rasayan2026@upi</p>
                           </div>
                        </div>
                        <p className="text-[10px] text-center text-text-muted mt-4">Accepted: GPay, PhonePe, Paytm, Any UPI app</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-brand-soft p-8 rounded-3xl text-center">
                      <h3 className="text-xl font-bold text-brand-primary mb-2">Pay Cash at Registration Desk</h3>
                      <p className="text-sm text-brand-dark mb-4">Please note down your unique code after registration and pay the total amount at the desk on the event day.</p>
                      <div className="text-3xl font-bold text-brand-dark">₹{totalAmount}</div>
                      <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest mt-1">Pending Admin Confirmation</p>
                    </div>
                  )}
                </div>

                <div className="glass-card p-8 rounded-[2rem] bg-brand-dark text-white">
                  <h3 className="text-xl font-serif mb-4">Final Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs opacity-80 mb-6">
                    <div>
                      <p className="font-bold uppercase tracking-widest mb-1">Participant</p>
                      <p>{profile?.name}</p>
                    </div>
                    <div>
                      <p className="font-bold uppercase tracking-widest mb-1">Events</p>
                      <p>{selectedEvents.length} Selected</p>
                    </div>
                  </div>
                  <p className="text-[10px] opacity-70 italic">* Upon clicking "Complete Registration", your data will be sent for verification.</p>
                </div>

                <div className="flex justify-between items-center">
                  <button type="button" onClick={() => setStep(2)} className="btn-secondary">
                    Back to Info
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary min-w-[200px] flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Complete Registration'
                    )}
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}
