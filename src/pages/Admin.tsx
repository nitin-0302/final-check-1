import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, getDocs, orderBy, query, doc, updateDoc, onSnapshot, setDoc, writeBatch, deleteDoc, addDoc } from 'firebase/firestore';
import { EVENTS } from '../constants/events';
import { motion } from 'motion/react';
import { Shield, Users, Filter, Download, FileText, Table as TableIcon, CheckCircle, XCircle, Clock, CreditCard, Brain, Trash2, Plus, Save, Play, Square, Map, Key, Trophy, MessageSquare, Headphones } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';

export default function Admin() {
  const { isAdmin, isCoAdmin, loading: authLoading } = useAuth();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'registrations' | 'quiz' | 'treasure' | 'announcements' | 'support'>('registrations');

  const isAtLeastCoAdmin = isAdmin || isCoAdmin;
  const isReadOnly = isCoAdmin && !isAdmin;

  // Support Chat State
  const [allSupportMessages, setAllSupportMessages] = useState<any[]>([]);
  const [selectedUserChat, setSelectedUserChat] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Quiz State
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [quizConfig, setQuizConfig] = useState<any>(null);
  const [quizResponses, setQuizResponses] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState({ text: '', options: ['', '', '', ''], correctAnswer: 0, timeLimit: 30, isDoublePoints: false });
  const [quizMetadata, setQuizMetadata] = useState({ title: '', description: '' });
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);

  // Treasure Hunt State
  const [hunts, setHunts] = useState<any[]>([]);
  const [selectedHuntId, setSelectedHuntId] = useState<string | null>(null);
  const [treasureConfig, setTreasureConfig] = useState<any>(null);
  const [treasureProgress, setTreasureProgress] = useState<any[]>([]);
  const [newClue, setNewClue] = useState({ clue: '', code: '' });
  const [treasureMetadata, setTreasureMetadata] = useState({ title: '', description: '', penaltyTime: 300 });
  const [editingClueIndex, setEditingClueIndex] = useState<number | null>(null);

  // Announcements State
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [announcementType, setAnnouncementType] = useState<'info' | 'success' | 'warning' | 'error'>('info');

  const sendAnnouncement = async () => {
    if (!announcementMsg.trim()) return;
    try {
      await addDoc(collection(db, 'announcements'), {
        message: announcementMsg.trim(),
        type: announcementType,
        createdAt: new Date().toISOString()
      });
      setAnnouncementMsg('');
      alert("Broadcast sent!");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'announcements');
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (isReadOnly) return;
    if (!window.confirm("Delete this broadcast history?")) return;
    try {
      await deleteDoc(doc(db, 'announcements', id));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `announcements/${id}`);
    }
  };

  // Registration Editing
  const [editingReg, setEditingReg] = useState<any>(null);
  const [fullscreenBoard, setFullscreenBoard] = useState<'none' | 'quiz' | 'treasure'>('none');

  useEffect(() => {
    if (isAtLeastCoAdmin) {
      // Basic registrations (Always needed for the dashboard stats)
      const q = query(collection(db, 'registrations'), orderBy('registrationTime', 'desc'));
      const unsubRegs = onSnapshot(q, (snap) => {
        setRegistrations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }, (err) => {
        console.error("Registrations Error:", err);
        setLoading(false);
      });

      const qAnnounce = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const unsubAnnounce = onSnapshot(qAnnounce, (snap) => {
        setAnnouncements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      return () => {
        unsubRegs();
        unsubAnnounce();
      };
    }
  }, [isAtLeastCoAdmin]);

  // Tab specific listeners for performance
  useEffect(() => {
    if (!isAtLeastCoAdmin) return;

    let unsubAnnouncements = () => {};
    let unsubQuizzes = () => {};
    let unsubHunts = () => {};
    let unsubRes = () => {};
    let unsubTreasureProgress = () => {};

    if (activeTab === 'announcements') {
      unsubAnnouncements = onSnapshot(collection(db, 'announcements'), (snap) => {
        setAnnouncements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => b.timestamp - a.timestamp));
      });
    }

    if (activeTab === 'quiz') {
      unsubQuizzes = onSnapshot(collection(db, 'quizzes'), (snap) => {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        setQuizzes(list);
        setSelectedQuizId(prev => {
          if (prev) return prev;
          if (list.length > 0) {
            const active = list.find(q => q.isActive);
            return active?.id || list[0].id;
          }
          return null;
        });
      });

      unsubRes = onSnapshot(collection(db, 'quiz_responses'), (snap) => {
        setQuizResponses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    if (activeTab === 'treasure') {
      unsubHunts = onSnapshot(collection(db, 'treasure_hunts'), (snap) => {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        setHunts(list);
        setSelectedHuntId(prev => {
          if (prev) return prev;
          if (list.length > 0) {
            const active = list.find(h => h.isActive);
            return active?.id || list[0].id;
          }
          return null;
        });
      });

      unsubTreasureProgress = onSnapshot(collection(db, 'treasure_hunt_progress'), (snap) => {
        setTreasureProgress(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const unsubSupport = onSnapshot(
        query(collection(db, 'support_messages'), orderBy('timestamp', 'asc')),
        (snap) => {
          setAllSupportMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      );

      return () => {
        unsubAnnouncements();
        unsubQuizzes();
        unsubHunts();
        unsubRes();
        unsubTreasureProgress();
        unsubSupport();
      };
    }
  }, [isAtLeastCoAdmin, activeTab]);

  useEffect(() => {
    if (selectedQuizId) {
      return onSnapshot(doc(db, 'quizzes', selectedQuizId), (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setQuizConfig(data);
          setQuizMetadata({ title: data.title || '', description: data.description || '' });
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, `quizzes/${selectedQuizId}`);
      });
    }
  }, [selectedQuizId]);

  useEffect(() => {
    if (selectedHuntId) {
      return onSnapshot(doc(db, 'treasure_hunts', selectedHuntId), (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setTreasureConfig(data);
          setTreasureMetadata({ 
            title: data.title || '', 
            description: data.description || '',
            penaltyTime: data.penaltyTime || 300
          });
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, `treasure_hunts/${selectedHuntId}`);
      });
    }
  }, [selectedHuntId]);

  if (authLoading || loading) {
    return (
      <div className="pt-32 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-brand-primary"></div>
      </div>
    );
  }

  if (!isAtLeastCoAdmin) {
    return (
      <div className="pt-32 text-center text-red-500 font-bold">
        Access Denied. Admins Only.
      </div>
    );
  }

  // Quiz Management Actions
  const createNewQuiz = async () => {
    const newQuiz = {
      title: 'New Quiz Event',
      description: 'Ready to test your skills?',
      questions: [],
      isActive: false,
      createdAt: new Date().toISOString()
    };
    try {
      const docRef = doc(collection(db, 'quizzes'));
      await setDoc(docRef, newQuiz);
      setSelectedQuizId(docRef.id);
      alert("New quiz created!");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'quizzes');
    }
  };

  const deleteQuiz = async () => {
    if (isReadOnly) return;
    if (!selectedQuizId) return;
    if (!window.confirm("Are you sure you want to delete this WHOLE quiz? All questions and metadata will be PERMANENTLY lost. (Responses will remain)")) return;
    try {
      await deleteDoc(doc(db, 'quizzes', selectedQuizId));
      setSelectedQuizId(null);
      alert("Quiz deleted successfully.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `quizzes/${selectedQuizId}`);
    }
  };

  const toggleQuizStatus = async () => {
    if (!selectedQuizId) return;
    try {
      const batch = writeBatch(db);
      // Deactivate all others first
      quizzes.forEach(q => {
        if (q.id !== selectedQuizId && q.isActive) {
          batch.update(doc(db, 'quizzes', q.id), { isActive: false });
        }
      });
      batch.update(doc(db, 'quizzes', selectedQuizId), { isActive: !quizConfig?.isActive });
      await batch.commit();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `quizzes/${selectedQuizId}`);
    }
  };

  const saveQuizMetadata = async () => {
    if (!selectedQuizId) return;
    try {
      const quizRef = doc(db, 'quizzes', selectedQuizId);
      await setDoc(quizRef, { ...quizConfig, ...quizMetadata }, { merge: true });
      alert("Quiz details updated!");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `quizzes/${selectedQuizId}`);
    }
  };

  const addQuestion = async () => {
    if (!selectedQuizId) return;
    if (!newQuestion.text || newQuestion.options.some(o => !o)) return;
    try {
      const quizRef = doc(db, 'quizzes', selectedQuizId);
      let updatedQuestions;
      if (editingQuestionIndex !== null) {
        updatedQuestions = [...(quizConfig?.questions || [])];
        updatedQuestions[editingQuestionIndex] = newQuestion;
        setEditingQuestionIndex(null);
      } else {
        updatedQuestions = [...(quizConfig?.questions || []), newQuestion];
      }
      await updateDoc(quizRef, { questions: updatedQuestions });
      setNewQuestion({ text: '', options: ['', '', '', ''], correctAnswer: 0, timeLimit: 30, isDoublePoints: false });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `quizzes/${selectedQuizId}`);
    }
  };

  const startEditQuestion = (index: number) => {
    setEditingQuestionIndex(index);
    setNewQuestion(quizConfig.questions[index]);
  };

  const deleteQuestion = async (index: number) => {
    if (isReadOnly) return;
    if (!selectedQuizId) return;
    if (!window.confirm("ARE YOU SURE? Delete this question?")) return;
    try {
      const quizRef = doc(db, 'quizzes', selectedQuizId);
      const updatedQuestions = quizConfig.questions.filter((_: any, i: number) => i !== index);
      await updateDoc(quizRef, { questions: updatedQuestions });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `quizzes/${selectedQuizId}`);
    }
  };

  const clearResponses = async () => {
    if (isReadOnly) return;
    if (!window.confirm("ARE YOU SURE? This will clear ALL results for ALL quizzes FOREVER! Proceed?")) return;
    try {
      const snap = await getDocs(collection(db, 'quiz_responses'));
      if (snap.empty) {
        alert("No quiz responses found to clear.");
        return;
      }
      
      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
      
      alert("All quiz responses cleared!");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, 'quiz_responses');
    }
  };

  // Treasure Hunt Actions
  const createNewHunt = async () => {
    const newHunt = {
      title: 'New Treasure Hunt',
      description: 'The search begins!',
      clues: [],
      isActive: false,
      penaltyTime: 300,
      createdAt: new Date().toISOString()
    };
    try {
      const docRef = doc(collection(db, 'treasure_hunts'));
      await setDoc(docRef, newHunt);
      setSelectedHuntId(docRef.id);
      alert("New treasure hunt created!");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'treasure_hunts');
    }
  };

  const deleteHunt = async () => {
    if (isReadOnly) return;
    if (!selectedHuntId) return;
    if (!window.confirm("Are you sure you want to delete this WHOLE treasure hunt? All clues and metadata will be PERMANENTLY lost.")) return;
    try {
      await deleteDoc(doc(db, 'treasure_hunts', selectedHuntId));
      setSelectedHuntId(null);
      alert("Treasure hunt deleted successfully.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `treasure_hunts/${selectedHuntId}`);
    }
  };

  const toggleTreasureStatus = async () => {
    if (!selectedHuntId) return;
    try {
      const batch = writeBatch(db);
      hunts.forEach(h => {
        if (h.id !== selectedHuntId && h.isActive) {
          batch.update(doc(db, 'treasure_hunts', h.id), { isActive: false });
        }
      });
      batch.update(doc(db, 'treasure_hunts', selectedHuntId), { isActive: !treasureConfig?.isActive });
      await batch.commit();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `treasure_hunts/${selectedHuntId}`);
    }
  };

  const saveTreasureMetadata = async () => {
    if (!selectedHuntId) return;
    try {
      const treasureRef = doc(db, 'treasure_hunts', selectedHuntId);
      await setDoc(treasureRef, { ...treasureConfig, ...treasureMetadata }, { merge: true });
      alert("Treasure Hunt details updated!");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `treasure_hunts/${selectedHuntId}`);
    }
  };

  const addClue = async () => {
    if (!selectedHuntId) return;
    if (!newClue.clue || !newClue.code) return;
    if (newClue.code.length !== 5) {
      alert("Code must be 5 digits");
      return;
    }
    try {
      const treasureRef = doc(db, 'treasure_hunts', selectedHuntId);
      let updatedClues;
      if (editingClueIndex !== null) {
        updatedClues = [...(treasureConfig?.clues || [])];
        updatedClues[editingClueIndex] = newClue;
        setEditingClueIndex(null);
      } else {
        updatedClues = [...(treasureConfig?.clues || []), newClue];
      }
      await updateDoc(treasureRef, { clues: updatedClues });
      setNewClue({ clue: '', code: '' });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `treasure_hunts/${selectedHuntId}`);
    }
  };

  const startEditClue = (index: number) => {
    setEditingClueIndex(index);
    setNewClue(treasureConfig.clues[index]);
  };

  const deleteClue = async (index: number) => {
    if (isReadOnly) return;
    if (!selectedHuntId) return;
    if (!window.confirm("ARE YOU SURE? Delete this clue?")) return;
    try {
      const treasureRef = doc(db, 'treasure_hunts', selectedHuntId);
      const updatedClues = treasureConfig.clues.filter((_: any, i: number) => i !== index);
      await updateDoc(treasureRef, { clues: updatedClues });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `treasure_hunts/${selectedHuntId}`);
    }
  };

  const clearTreasureProgress = async () => {
    if (isReadOnly) return;
    if (!window.confirm("ARE YOU SURE? This will clear ALL progress for ALL participants FOREVER! Proceed?")) return;
    try {
      const snap = await getDocs(collection(db, 'treasure_hunt_progress'));
      if (snap.empty) {
        alert("No treasure hunt progress found to clear.");
        return;
      }

      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();

      alert("All treasure hunt progress cleared!");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, 'treasure_hunt_progress');
    }
  };

  const deleteResponse = async (id: string) => {
    if (isReadOnly) return;
    if (!window.confirm("ARE YOU SURE? Delete this participant's result FOREVER?")) return;
    try {
      await deleteDoc(doc(db, 'quiz_responses', id));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `quiz_responses/${id}`);
    }
  };

  const deleteProgress = async (id: string) => {
    if (isReadOnly) return;
    if (!window.confirm("ARE YOU SURE? Delete this participant's treasure hunt progress FOREVER?")) return;
    try {
      await deleteDoc(doc(db, 'treasure_hunt_progress', id));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `treasure_hunt_progress/${id}`);
    }
  };

  const handleUpdateRegDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReg) return;
    try {
      await updateDoc(doc(db, 'registrations', editingReg.id), {
        userName: editingReg.userName,
        userEmail: editingReg.userEmail,
        phone: editingReg.phone,
        college: editingReg.college,
        transactionId: editingReg.transactionId,
        uniqueCode: editingReg.uniqueCode
      });
      setEditingReg(null);
      alert("Registration updated!");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `registrations/${editingReg.id}`);
    }
  };

  const filtered = registrations.filter(r => {
    const s = searchTerm.toLowerCase();
    const matchesEvent = !filter || r.eventIds?.includes(filter);
    const matchesSearch = !searchTerm || 
      (r.userName || '').toLowerCase().includes(s) || 
      (r.userEmail || '').toLowerCase().includes(s) ||
      (r.college || '').toLowerCase().includes(s) ||
      (r.phone || '').includes(searchTerm) ||
      (r.transactionId || '').toLowerCase().includes(s) ||
      (r.uniqueCode || '').toLowerCase().includes(s);
    return matchesEvent && matchesSearch;
  });

  const handleDeleteRegistration = async (id: string, name: string) => {
    if (isReadOnly) return;
    const isConfirmed = window.confirm(`Are you sure you want to permanently delete the registration for ${name}? This cannot be undone.`);
    if (!isConfirmed) return;

    try {
      await deleteDoc(doc(db, 'registrations', id));
      alert("Registration deleted successfully.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `registrations/${id}`);
    }
  };

  const clearAllRegistrations = async () => {
    if (isReadOnly) return;
    if (!window.confirm("CRITICAL: This will delete ALL participant registrations. This action CANNOT be undone. Proceed?")) return;
    if (!window.confirm("FINAL WARNING: Are you absolutely sure?")) return;
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      registrations.forEach((reg) => {
        batch.delete(doc(db, 'registrations', reg.id));
      });
      await batch.commit();
      alert("All registration data cleared successfully.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, 'registrations');
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (regId: string, status: 'approved' | 'rejected' | 'pending') => {
    try {
      await updateDoc(doc(db, 'registrations', regId), { paymentStatus: status });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `registrations/${regId}`);
    }
  };

  const toggleAttended = async (regId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'registrations', regId), { attended: !currentStatus });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `registrations/${regId}`);
    }
  };

  const sendSupportReply = async () => {
    if (!selectedUserChat || !replyText.trim()) return;
    try {
      await addDoc(collection(db, 'support_messages'), {
        userId: selectedUserChat,
        text: replyText.trim(),
        sender: 'admin',
        timestamp: serverTimestamp(),
        isRead: true // Admin reading/writing is always read
      });
      setReplyText('');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, 'support_messages');
    }
  };

  const deleteSupportChat = async (userId: string) => {
    if (isReadOnly) return;
    if (!window.confirm("ARE YOU SURE? Delete this entire chat history?")) return;
    try {
      const chatMsgs = allSupportMessages.filter(m => m.userId === userId);
      const batch = writeBatch(db);
      chatMsgs.forEach(m => {
        batch.delete(doc(db, 'support_messages', m.id));
      });
      await batch.commit();
      setSelectedUserChat(null);
      alert("Chat history deleted.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, 'support_messages');
    }
  };

  const totalRevenue = registrations
    .filter(r => r.paymentStatus === 'approved')
    .reduce((acc, r) => acc + (r.totalAmount || 0), 0);

  const pendingCount = registrations.filter(r => r.paymentStatus === 'pending' || !r.paymentStatus).length;

  const exportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Name", "Email", "Phone", "ID", "College", "Events", "Time"].join(",") + "\n"
      + filtered.map(r => [
          r.userName, 
          r.userEmail, 
          r.phone, 
          r.uniqueCode || '-',
          r.college, 
          r.eventIds.map((eid: string) => EVENTS.find(e => e.id === eid)?.name).join(" | "), 
          r.registrationTime
        ].join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "rasayan_registrations.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExcel = () => {
    const data = filtered.map(r => ({
      Name: r.userName,
      Email: r.userEmail,
      Phone: r.phone,
      RegID: r.uniqueCode || '-',
      College: r.college,
      Events: r.eventIds.map((eid: string) => EVENTS.find(e => e.id === eid)?.name).join(", "),
      RegisteredAt: new Date(r.registrationTime).toLocaleString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");
    XLSX.writeFile(workbook, "rasayan_registrations.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF() as any;
    doc.text("Rasayan 2026 Registration Report", 14, 15);
    
    const tableData = filtered.map(r => [
      r.userName,
      r.userEmail,
      r.uniqueCode || '-',
      r.college,
      r.eventIds.map((eid: string) => EVENTS.find(e => e.id === eid)?.name).join("\n"),
      new Date(r.registrationTime).toLocaleDateString()
    ]);

    doc.autoTable({
      head: [['Name', 'Email', 'ID', 'College', 'Events', 'Date']],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 38, 38] } // Red theme
    });

    doc.save("rasayan_registrations.pdf");
  };

  return (
    <div className="pt-24 pb-20 bg-bg-paper min-h-screen">
      <div className="max-w-7xl mx-auto px-4">
        {/* Quick Check-in Simulation */}
        <div className="mb-8 glass-card p-6 rounded-[2rem] border-l-8 border-brand-primary flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <h3 className="text-xl font-serif text-brand-dark mb-1">On-Desk Check-in</h3>
            <p className="text-xs text-text-muted">Enter Participant ID (e.g. 12345) to quickly mark attendance.</p>
          </div>
          <div className="flex-1 w-full flex gap-2">
            <input 
              type="text" 
              placeholder="Enter ID #..." 
              id="checkin_input"
              className="input-field text-center font-mono tracking-widest text-lg"
              maxLength={5}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value;
                  const reg = registrations.find(r => r.uniqueCode === val);
                  if (reg) {
                    await toggleAttended(reg.id, !!reg.attended);
                    alert(`Status updated for ${reg.userName}`);
                    (e.target as HTMLInputElement).value = '';
                  } else {
                    alert("ID not found!");
                  }
                }
              }}
            />
            <button 
              onClick={async () => {
                const el = document.getElementById('checkin_input') as HTMLInputElement;
                const reg = registrations.find(r => r.uniqueCode === el.value);
                if (reg) {
                  await toggleAttended(reg.id, !!reg.attended);
                  alert(`Status updated for ${reg.userName}`);
                  el.value = '';
                } else {
                  alert("ID not found!");
                }
              }}
              className="btn-primary whitespace-nowrap"
            >
              Check-in
            </button>
          </div>
        </div>

        {/* Header and Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-serif text-brand-dark flex items-center gap-3">
              <Shield className="text-red-600" />
              Admin Command Center
              {isReadOnly && <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-amber-200 ml-4">Limited Access Mode</span>}
            </h1>
            <div className="flex gap-4 mt-4">
              <button 
                onClick={() => setActiveTab('registrations')}
                className={`pb-2 px-1 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'registrations' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-muted hover:text-text-main'}`}
              >
                Registrations
              </button>
              <button 
                onClick={() => setActiveTab('quiz')}
                className={`pb-2 px-1 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'quiz' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-muted hover:text-text-main'}`}
              >
                Live Quiz Control
              </button>
              <button 
                onClick={() => setActiveTab('treasure')}
                className={`pb-2 px-1 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'treasure' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-muted hover:text-text-main'}`}
              >
                Treasure Hunt
              </button>
              <button 
                onClick={() => setActiveTab('announcements')}
                className={`pb-2 px-1 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'announcements' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-muted hover:text-text-main'}`}
              >
                Announcements
              </button>
              <button 
                onClick={() => setActiveTab('support')}
                className={`pb-2 px-1 text-sm font-bold uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${activeTab === 'support' ? 'border-amber-500 text-amber-600' : 'border-transparent text-text-muted hover:text-text-main'}`}
              >
                Support Chat
                {allSupportMessages.filter(m => !m.isRead && m.sender === 'user').length > 0 && (
                  <span className="bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] animate-pulse">
                    {allSupportMessages.filter(m => !m.isRead && m.sender === 'user').length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {activeTab === 'registrations' && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest text-right">Download Reports</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 py-2.5 px-5 text-sm">
                  <Download className="w-4 h-4" />
                  CSV
                </button>
                <button onClick={exportExcel} className="btn-secondary flex items-center gap-2 py-2.5 px-5 text-sm !border-green-600 !text-green-600 hover:bg-green-50">
                  <TableIcon className="w-4 h-4" />
                  Excel
                </button>
                <button onClick={exportPDF} className="btn-secondary flex items-center gap-2 py-2.5 px-5 text-sm !border-red-600 !text-red-600 hover:bg-red-50">
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
                <div className="w-px h-10 bg-gray-200 mx-2 hidden md:block" />
                {!isReadOnly && (
                  <button 
                    onClick={clearAllRegistrations}
                    className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    CLEAR ALL DATA
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {activeTab === 'registrations' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="glass-card p-6 rounded-3xl flex items-center gap-4">
                <div className="bg-brand-soft p-3 rounded-2xl"><Users className="text-brand-primary" /></div>
                <div>
                  <p className="text-2xl font-bold text-brand-dark">{registrations.length}</p>
                  <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest">Total Participants</p>
                </div>
              </div>
              <div className="glass-card p-6 rounded-3xl flex items-center gap-4 border-l-4 border-green-500">
                <div className="bg-green-100 p-3 rounded-2xl"><CreditCard className="text-green-600" /></div>
                <div>
                  <p className="text-2xl font-bold text-brand-dark">₹{totalRevenue}</p>
                  <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest">Confirmed Revenue</p>
                </div>
              </div>
              <div className="glass-card p-6 rounded-3xl flex items-center gap-4 border-l-4 border-amber-500">
                <div className="bg-amber-100 p-3 rounded-2xl"><Clock className="text-amber-600" /></div>
                <div>
                  <p className="text-2xl font-bold text-brand-dark">{pendingCount}</p>
                  <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest">Pending Verification</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-4 md:p-6 rounded-[2rem] mb-10 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="input-field"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-brand-primary shrink-0" />
                <select 
                  value={filter} 
                  onChange={e => setFilter(e.target.value)}
                  className="flex-1 md:w-auto px-4 py-2 rounded-lg border border-gray-200 outline-none focus:border-brand-primary transition-all text-sm font-medium"
                >
                  <option value="">All Events</option>
                  {EVENTS.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            </div>

            <div className="glass-card rounded-[2.5rem] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-text-muted tracking-widest">Participant & ID</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-text-muted tracking-widest">College</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-text-muted tracking-widest">Events & Revenue</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-text-muted tracking-widest">Payment Status</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-text-muted tracking-widest">Attendance</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-text-muted tracking-widest">Registered At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((reg) => (
                      <tr key={reg.id} className="hover:bg-brand-soft/20 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="font-bold text-brand-dark group-hover:text-brand-primary transition-colors">
                            {reg.userName} 
                            <span className="ml-2 px-1.5 py-0.5 bg-brand-soft text-[10px] text-brand-primary rounded border border-brand-primary/10">#{reg.uniqueCode || 'N/A'}</span>
                          </div>
                          <div className="text-xs text-text-muted">{reg.userEmail}</div>
                          <div className="text-xs text-text-muted">{reg.phone}</div>
                          <div className="mt-1">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${reg.paymentMethod === 'cash' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                              {reg.paymentMethod === 'cash' ? 'CASH AT DESK' : 'UPI ONLINE'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm font-medium text-text-main">{reg.college}</div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-wrap gap-2 mb-2">
                            {reg.eventIds.map((eid: string) => {
                              const event = EVENTS.find(e => e.id === eid);
                              const members = reg.teamDetails?.[eid];
                              return (
                                <div key={eid} className="group/item relative">
                                  <span className="bg-white px-2 py-0.5 rounded text-[10px] font-bold text-brand-primary border border-brand-primary/10 shadow-sm cursor-help">
                                    {event?.name}
                                    {members && <span className="ml-1 text-amber-600">({members.length})</span>}
                                  </span>
                                  {members && (
                                    <div className="absolute bottom-full left-0 mb-2 invisible group-hover/item:visible bg-brand-dark text-white text-[10px] p-2 rounded-lg shadow-xl z-10 w-40">
                                      <p className="font-bold border-b border-white/20 mb-1 pb-1 uppercase tracking-wider">Team Members</p>
                                      {members.map((m: string, i: number) => (
                                        <div key={i} className="truncate">• {m || 'Unnamed'}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <div className="text-[10px] font-bold text-brand-dark">Total Fee: ₹{reg.totalAmount || 0}</div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              {reg.paymentStatus === 'approved' ? (
                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Approved
                                </span>
                              ) : reg.paymentStatus === 'rejected' ? (
                                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                                  <XCircle className="w-3 h-3" /> Rejected
                                </span>
                              ) : (
                                <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Pending
                                </span>
                              )}
                            </div>
                            {reg.transactionId && (
                              <div className="text-[9px] font-mono text-text-muted bg-gray-50 p-1 rounded border border-gray-100">
                                 TXN: {reg.transactionId}
                              </div>
                            )}
                  <div className="flex gap-1 mt-2 flex-wrap">
                               {reg.paymentMethod === 'cash' && reg.paymentStatus !== 'approved' && (
                                <button 
                                  onClick={() => updatePaymentStatus(reg.id, 'approved')}
                                  className="p-1.5 bg-brand-primary text-white hover:bg-brand-dark rounded-lg transition-colors flex items-center gap-1 text-[9px] font-bold uppercase"
                                  title="Confirm Cash Paid"
                                >
                                  <CreditCard className="w-3.5 h-3.5" /> Mark Paid
                                </button>
                              )}
                              {reg.paymentStatus !== 'approved' && reg.paymentMethod === 'upi' && (
                                <button 
                                  onClick={() => updatePaymentStatus(reg.id, 'approved')}
                                  className="p-1.5 bg-green-100 text-green-700 hover:bg-green-600 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-[9px] font-bold uppercase"
                                  title="Approve Online Payment"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                                </button>
                              )}
                              {reg.paymentStatus !== 'pending' && (
                                <button 
                                  onClick={() => updatePaymentStatus(reg.id, 'pending')}
                                  className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white rounded-lg transition-colors"
                                  title="Reset to Pending"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button 
                                onClick={() => updatePaymentStatus(reg.id, 'rejected')}
                                className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-colors"
                                title="Reject / Cancel"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                              <div className="w-px h-6 bg-gray-200 mx-1" />
                              <button 
                                onClick={() => setEditingReg(reg)}
                                className="p-1.5 bg-brand-soft text-brand-primary hover:bg-brand-primary hover:text-white rounded-lg transition-colors"
                                title="Edit Details"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              {!isReadOnly && (
                                <button 
                                  onClick={() => handleDeleteRegistration(reg.id, reg.userName)}
                                  className="p-1.5 bg-red-100 text-red-700 hover:bg-red-700 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-[9px] font-bold uppercase"
                                  title="Delete Registration"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <button 
                            onClick={() => toggleAttended(reg.id, !!reg.attended)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${reg.attended ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-brand-soft hover:text-brand-primary'}`}
                          >
                            {reg.attended ? <CheckCircle className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-current" />}
                            {reg.attended ? 'Present' : 'Mark Present'}
                          </button>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-xs font-mono text-text-muted">
                            {new Date(reg.registrationTime).toLocaleString()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : activeTab === 'quiz' ? (
          <div className="space-y-12">
            {/* Quiz Library Selector */}
            <div className="glass-card p-6 rounded-[2rem] flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block mb-2 ml-2">Select Quiz to Manage</label>
                <div className="flex gap-2">
                  <select 
                    value={selectedQuizId || ''} 
                    onChange={(e) => setSelectedQuizId(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 outline-none focus:border-brand-primary font-serif"
                  >
                    <option value="">-- Choose a Quiz --</option>
                    {quizzes.map(q => (
                      <option key={q.id} value={q.id}>
                        {q.isActive ? '🟢 ' : '⚪️ '} {q.title || 'Untitled Quiz'} ({q.isActive ? 'ACTIVE' : 'DRAFT'})
                      </option>
                    ))}
                  </select>
                    <button onClick={createNewQuiz} className="btn-primary px-6 flex items-center gap-2">
                      <Plus className="w-4 h-4" /> New
                    </button>
                  {selectedQuizId && (
                    <>
                      <button 
                        onClick={async () => {
                          const name = prompt("Enter Quiz Name:", quizMetadata.title);
                          if (name) {
                            setQuizMetadata({...quizMetadata, title: name});
                            const quizRef = doc(db, 'quizzes', selectedQuizId);
                            await setDoc(quizRef, { ...quizConfig, title: name }, { merge: true });
                            alert("Quiz renamed!");
                          }
                        }}
                        className="bg-brand-soft text-brand-primary px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all flex items-center gap-2 border border-brand-primary/20"
                      >
                        <Plus className="w-3 h-3 rotate-45" /> Rename
                      </button>
                              <button 
                                onClick={() => deleteQuiz()} 
                                className={`bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 border border-red-200 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600 hover:text-white'}`}
                                disabled={isReadOnly}
                              >
                                <Trash2 className="w-4 h-4" /> Delete Entire Quiz Event
                              </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quiz Control Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1 space-y-6">
                <div className={`glass-card p-8 rounded-[2rem] border-2 transition-all ${quizConfig?.isActive ? 'border-green-500 bg-green-50/30' : 'border-red-500 bg-red-50/30'}`}>
                  <div className="flex justify-between items-start mb-6">
                    <Brain className={quizConfig?.isActive ? 'text-green-600' : 'text-red-600'} />
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${quizConfig?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {quizConfig?.isActive ? 'Status: Active' : 'Status: Off'}
                    </span>
                  </div>
                  <h3 className="text-2xl font-serif text-brand-dark mb-2">Quiz Control</h3>
                  <p className="text-[10px] text-text-muted mb-8 uppercase font-bold tracking-widest">Master switch for live participants</p>
                  <button 
                    onClick={toggleQuizStatus}
                    className={`w-full py-3 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${quizConfig?.isActive ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'}`}
                  >
                    {quizConfig?.isActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {quizConfig?.isActive ? 'Deactivate Quiz' : 'Activate Quiz'}
                  </button>
                </div>

                <div className="glass-card p-6 rounded-[2rem] bg-brand-soft/20 border border-brand-primary/10">
                  <h4 className="text-sm font-bold text-brand-dark mb-4 uppercase tracking-widest">Quiz Info</h4>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-text-muted uppercase ml-1">Display Title</label>
                      <input 
                        type="text" 
                        value={quizMetadata.title}
                        onChange={(e) => setQuizMetadata({...quizMetadata, title: e.target.value})}
                        placeholder="e.g. Chemical Chaos Quiz"
                        className="input-field text-xs py-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-text-muted uppercase ml-1">Description</label>
                      <textarea 
                        value={quizMetadata.description}
                        onChange={(e) => setQuizMetadata({...quizMetadata, description: e.target.value})}
                        placeholder="A short tagline for the quiz..."
                        className="input-field text-xs py-2 min-h-[60px]"
                      />
                    </div>
                    <button 
                      onClick={saveQuizMetadata}
                      className="w-full bg-brand-dark text-white py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-brand-primary transition-colors flex items-center justify-center gap-2"
                    >
                      <Save className="w-3 h-3" /> Save Details
                    </button>
                  </div>
                </div>
              </div>

              <div className="glass-card p-8 rounded-[2rem] md:col-span-3">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-serif text-brand-dark">Live Leaderboard</h3>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setFullscreenBoard('quiz')}
                      className="bg-brand-soft text-brand-primary px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all flex items-center gap-2 border border-brand-primary/20"
                    >
                      <Trophy className="w-3.5 h-3.5" /> Fullscreen Live Board
                    </button>
                    <button 
                      onClick={clearResponses} 
                      className={`bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 border border-red-200 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600 hover:text-white'}`}
                      disabled={isReadOnly}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Clear All Responses
                    </button>
                  </div>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {quizResponses.length > 0 ? (
                    quizResponses
                      .filter(res => res.quizId === selectedQuizId)
                      .sort((a, b) => b.score - a.score)
                      .map((res, i) => (
                        <div key={res.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-500'}`}>
                              {i + 1}
                            </span>
                            <div>
                              <p className="text-sm font-bold text-brand-dark">{res.quizName || res.userName || 'Anonymous Participant'}</p>
                              <p className="text-[10px] text-text-muted">{new Date(res.submittedAt).toLocaleTimeString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-lg font-bold text-brand-primary">{res.score}</p>
                              <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">{res.correctCount || 0}/{res.totalQuestions || 0} Correct</p>
                            </div>
                            {!isReadOnly && (
                              <button 
                                onClick={() => deleteResponse(res.id)}
                                className="text-red-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-10 text-text-muted italic">No responses received yet. Once the quiz starts, results will appear here in real-time.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Question Management */}
            <div className="glass-card p-8 rounded-[2rem]">
              <h3 className="text-2xl font-serif text-brand-dark mb-8 flex items-center gap-2">
                <Plus className="text-brand-primary" />
                Manage Questions
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Form to Add Question */}
                <div className="space-y-6">
                  <div className="p-6 bg-brand-soft/30 rounded-3xl border border-brand-primary/10">
                    <p className="text-[10px] uppercase font-bold text-brand-primary tracking-widest mb-4">
                      {editingQuestionIndex !== null ? 'Editing Question' : 'Add New Question'}
                    </p>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-muted uppercase ml-1">Question Text</label>
                        <textarea 
                          value={newQuestion.text}
                          onChange={(e) => setNewQuestion({...newQuestion, text: e.target.value})}
                          placeholder="What is the chemical symbol for Gold?"
                          className="input-field min-h-[80px]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {newQuestion.options.map((opt, i) => (
                          <div key={i} className="space-y-1">
                            <label className="text-[10px] font-bold text-text-muted uppercase ml-1 flex items-center gap-2">
                              Option {i + 1}
                              <input 
                                type="radio" 
                                name="correct"
                                checked={newQuestion.correctAnswer === i}
                                onChange={() => setNewQuestion({...newQuestion, correctAnswer: i})}
                              />
                            </label>
                            <input 
                              type="text" 
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...newQuestion.options];
                                newOpts[i] = e.target.value;
                                setNewQuestion({...newQuestion, options: newOpts});
                              }}
                              placeholder={`Option ${i + 1}`}
                              className="input-field py-2 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                          <label className="text-[10px] font-bold text-text-muted uppercase ml-1">Time Limit (Sec)</label>
                          <input 
                            type="number" 
                            value={newQuestion.timeLimit}
                            onChange={(e) => setNewQuestion({...newQuestion, timeLimit: parseInt(e.target.value)})}
                            className="input-field"
                          />
                        </div>
                        <div className="flex-1 flex items-end">
                          <label className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 transition-all cursor-pointer w-full bg-white ${newQuestion.isDoublePoints ? 'border-amber-500 bg-amber-50' : 'border-gray-100'}`}>
                            <input 
                              type="checkbox" 
                              checked={newQuestion.isDoublePoints}
                              onChange={(e) => setNewQuestion({...newQuestion, isDoublePoints: e.target.checked})}
                              className="w-5 h-5 accent-amber-500"
                            />
                            <div className="flex flex-col">
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${newQuestion.isDoublePoints ? 'text-amber-700' : 'text-text-muted'}`}>Double Points</span>
                              {newQuestion.isDoublePoints && <span className="text-[8px] text-amber-600 font-bold uppercase">x2 Multiplier</span>}
                            </div>
                          </label>
                        </div>
                        <div className="flex items-end gap-2">
                          {editingQuestionIndex !== null && (
                            <button 
                              onClick={() => {
                                setEditingQuestionIndex(null);
                                setNewQuestion({ text: '', options: ['', '', '', ''], correctAnswer: 0, timeLimit: 30, isDoublePoints: false });
                              }}
                              className="btn-secondary py-3 px-4 text-xs"
                            >
                              Cancel
                            </button>
                          )}
                          <button 
                            onClick={addQuestion}
                            className="btn-primary py-3 px-8 flex items-center gap-2"
                          >
                            <Save className="w-4 h-4" /> {editingQuestionIndex !== null ? 'Update' : 'Save'} Question
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Question List */}
                <div className="space-y-4">
                  <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest">Question Bank ({quizConfig?.questions?.length || 0})</p>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {quizConfig?.questions?.map((q: any, i: number) => (
                      <div key={i} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm relative group">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => startEditQuestion(i)}
                            className="text-brand-primary p-1 bg-brand-soft rounded"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          {!isReadOnly && (
                            <button 
                              onClick={() => deleteQuestion(i)}
                              className="text-red-500 p-1 bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <span className="shrink-0 w-6 h-6 rounded bg-brand-soft text-brand-primary flex items-center justify-center text-xs font-bold">{i + 1}</span>
                          <div className="space-y-2">
                            <p className="text-sm font-bold text-brand-dark pr-8">{q.text}</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                              {q.options.map((opt: string, oi: number) => (
                                <div key={oi} className={`text-[10px] ${q.correctAnswer === oi ? 'text-green-600 font-bold' : 'text-text-muted'}`}>
                                  {oi + 1}. {opt} {q.correctAnswer === oi && '✓'}
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-[10px] font-bold text-text-muted bg-gray-100 px-2 py-0.5 rounded tracking-widest">{q.timeLimit}S TIME</span>
                              {q.isDoublePoints && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded tracking-widest">DOUBLE POINTS</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!quizConfig?.questions || quizConfig.questions.length === 0) && (
                      <div className="text-center py-20 bg-gray-50 rounded-3xl text-text-muted italic border-2 border-dashed border-gray-200">
                        Start by adding your first question.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'treasure' ? (
          <div className="space-y-12">
            {/* Hunt Library Selector */}
            <div className="glass-card p-6 rounded-[2rem] flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block mb-2 ml-2">Select Treasure Hunt to Manage</label>
                <div className="flex gap-2">
                  <select 
                    value={selectedHuntId || ''} 
                    onChange={(e) => setSelectedHuntId(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 outline-none focus:border-brand-primary font-serif"
                  >
                    <option value="">-- Choose a Hunt --</option>
                    {hunts.map(h => (
                      <option key={h.id} value={h.id}>
                        {h.isActive ? '🟢 ' : '⚪️ '} {h.title || 'Untitled Hunt'} ({h.id.slice(0,5)})
                      </option>
                    ))}
                  </select>
                    <button onClick={createNewHunt} className="btn-primary px-6 flex items-center gap-2">
                      <Plus className="w-4 h-4" /> New
                    </button>
                  {selectedHuntId && (
                    <>
                      <button 
                        onClick={async () => {
                          const name = prompt("Enter Hunt Name:", treasureMetadata.title);
                          if (name) {
                            setTreasureMetadata({...treasureMetadata, title: name});
                            const huntRef = doc(db, 'treasure_hunts', selectedHuntId);
                            await setDoc(huntRef, { ...treasureConfig, title: name }, { merge: true });
                            alert("Hunt renamed!");
                          }
                        }}
                        className="bg-brand-soft text-brand-primary px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all flex items-center gap-2 border border-brand-primary/20"
                      >
                        <Plus className="w-3 h-3 rotate-45" /> Rename
                      </button>
                      <button 
                        onClick={() => deleteHunt()} 
                        className={`bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 border border-red-200 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600 hover:text-white'}`}
                        disabled={isReadOnly}
                      >
                        <Trash2 className="w-4 h-4" /> Delete Entire Hunt
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Treasure Hunt Control Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1 space-y-6">
                <div className={`glass-card p-8 rounded-[2rem] border-2 transition-all ${treasureConfig?.isActive ? 'border-brand-primary bg-brand-soft/30' : 'border-red-500 bg-red-50/30'}`}>
                  <div className="flex justify-between items-start mb-6">
                    <Map className={treasureConfig?.isActive ? 'text-brand-primary' : 'text-red-600'} />
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${treasureConfig?.isActive ? 'bg-brand-soft text-brand-primary' : 'bg-red-100 text-red-700'}`}>
                      {treasureConfig?.isActive ? 'Status: Active' : 'Status: Off'}
                    </span>
                  </div>
                  <h3 className="text-2xl font-serif text-brand-dark mb-2">Hunt Control</h3>
                  <p className="text-[10px] text-text-muted mb-8 uppercase font-bold tracking-widest">Master switch for the treasure hunt</p>
                    <button 
                      onClick={toggleTreasureStatus}
                      className={`w-full py-3 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${treasureConfig?.isActive ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-brand-primary text-white hover:bg-brand-dark'}`}
                    >
                    {treasureConfig?.isActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {treasureConfig?.isActive ? 'End Game' : 'Start Treasure Hunt'}
                  </button>
                </div>

                <div className="glass-card p-6 rounded-[2rem] bg-brand-soft/20 border border-brand-primary/10">
                  <h4 className="text-sm font-bold text-brand-dark mb-4 uppercase tracking-widest">Hunt Info</h4>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-text-muted uppercase ml-1">Display Title</label>
                      <input 
                        type="text" 
                        value={treasureMetadata.title}
                        onChange={(e) => setTreasureMetadata({...treasureMetadata, title: e.target.value})}
                        placeholder="e.g. Periodic Path"
                        className="input-field text-xs py-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-text-muted uppercase ml-1">Description</label>
                      <textarea 
                        value={treasureMetadata.description}
                        onChange={(e) => setTreasureMetadata({...treasureMetadata, description: e.target.value})}
                        placeholder="A short tagline for the hunt..."
                        className="input-field text-xs py-2 min-h-[60px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-text-muted uppercase ml-1">Penalty Lockout (Seconds)</label>
                      <input 
                        type="number" 
                        value={treasureMetadata.penaltyTime}
                        onChange={(e) => setTreasureMetadata({...treasureMetadata, penaltyTime: parseInt(e.target.value)})}
                        placeholder="e.g. 300"
                        className="input-field text-xs py-2"
                      />
                    </div>
                    <button 
                      onClick={saveTreasureMetadata}
                      className="w-full bg-brand-dark text-white py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-brand-primary transition-colors flex items-center justify-center gap-2"
                    >
                      <Save className="w-3 h-3" /> Save Details
                    </button>
                  </div>
                </div>
              </div>

              <div className="glass-card p-8 rounded-[2rem] md:col-span-3">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-serif text-brand-dark">Hunter Progress</h3>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setFullscreenBoard('treasure')}
                      className="bg-brand-soft text-brand-primary px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all flex items-center gap-2 border border-brand-primary/20"
                    >
                      <Map className="w-3.5 h-3.5" /> Fullscreen Live Board
                    </button>
                    {!isReadOnly && (
                      <button onClick={clearTreasureProgress} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Clear All Participant Progress
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {treasureProgress.length > 0 ? (
                    treasureProgress
                      .filter(res => res.huntId === selectedHuntId)
                      .sort((a, b) => b.currentClueIndex - a.currentClueIndex)
                      .map((res, i) => (
                        <div key={res.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-brand-soft flex items-center justify-center text-xs font-bold text-brand-primary">
                              {i+1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-brand-dark">{res.userName || 'Anonymous Hunter'}</p>
                                {res.teamName && (
                                  <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded-md text-[9px] font-bold uppercase tracking-tighter">
                                    Team: {res.teamName}
                                  </span>
                                )}
                              </div>
                              {res.isCompleted ? (
                                <p className="text-[10px] text-green-600 font-bold uppercase">Finished!</p>
                              ) : (
                                <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">On Clue #{res.currentClueIndex + 1}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                               {res.isCompleted ? (
                                 <Trophy className="text-amber-500 w-5 h-5 mx-auto" />
                               ) : (
                                 <div className="flex items-center gap-1 text-brand-primary">
                                   <Clock className="w-3 h-3" />
                                   <span className="text-sm font-bold">Active</span>
                                 </div>
                               )}
                            </div>
                            {!isReadOnly && (
                              <button 
                                onClick={() => deleteProgress(res.id)}
                                className="text-red-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-10 text-text-muted italic">No participants have started the hunt yet.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Clue Management */}
            <div className="glass-card p-8 rounded-[2rem]">
              <h3 className="text-2xl font-serif text-brand-dark mb-8 flex items-center gap-2">
                <Key className="text-brand-primary" />
                Configure Clues & Pins
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Add Clue Form */}
                <div className="space-y-6">
                  <div className="p-6 bg-brand-soft/30 rounded-3xl border border-brand-primary/10">
                    <p className="text-[10px] uppercase font-bold text-brand-primary tracking-widest mb-4">
                      {editingClueIndex !== null ? 'Editing Clue point' : 'Add Story/Clue Point'}
                    </p>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-muted uppercase ml-1">Clue Text</label>
                        <textarea 
                          value={newClue.clue}
                          onChange={(e) => setNewClue({...newClue, clue: e.target.value})}
                          placeholder="Go to the lab where hydrogen was first discovered..."
                          className="input-field min-h-[100px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-text-muted uppercase ml-1">5-Digit Unlock Pin</label>
                          <span className="text-[9px] text-brand-primary font-bold">{newClue.code.length}/5</span>
                        </div>
                        <input 
                          type="text" 
                          maxLength={5}
                          value={newClue.code}
                          onChange={(e) => setNewClue({...newClue, code: e.target.value.replace(/\D/g, '')})}
                          placeholder="e.g. 12345"
                          className="input-field font-mono tracking-[0.5em] text-center text-lg"
                        />
                      </div>
                      <div className="flex gap-2">
                        {editingClueIndex !== null && (
                          <button 
                            onClick={() => {
                              setEditingClueIndex(null);
                              setNewClue({ clue: '', code: '' });
                            }}
                            className="btn-secondary flex-1 py-4"
                          >
                            Cancel
                          </button>
                        )}
                        <button 
                          onClick={addClue}
                          className="btn-primary flex-[2] py-4 flex items-center justify-center gap-2"
                        >
                          <Save className="w-4 h-4" /> {editingClueIndex !== null ? 'Update Point' : 'Add to Chain'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clue Chain List */}
                <div className="space-y-4">
                  <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest">The Treasure Path ({treasureConfig?.clues?.length || 0})</p>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {treasureConfig?.clues?.map((c: any, i: number) => (
                      <div key={i} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm relative group overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary" />
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => startEditClue(i)}
                            className="text-brand-primary p-1 bg-brand-soft rounded"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          {!isReadOnly && (
                            <button 
                              onClick={() => deleteClue(i)}
                              className="text-red-500 p-1 bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <span className="shrink-0 w-6 h-6 rounded bg-brand-soft text-brand-primary flex items-center justify-center text-xs font-bold">{i + 1}</span>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-brand-dark pr-8">{c.clue}</p>
                            <div className="flex items-center gap-2">
                              <Key className="w-3 h-3 text-brand-primary" />
                              <span className="text-xs font-mono font-bold text-brand-primary select-all">{c.code}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!treasureConfig?.clues || treasureConfig.clues.length === 0) && (
                      <div className="text-center py-20 bg-gray-50 rounded-3xl text-text-muted italic border-2 border-dashed border-gray-200">
                        Design your treasure path by adding clues.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'support' ? (
          <div className="glass-card p-8 rounded-[2rem] h-[700px] flex gap-8">
            {/* User List Sidebar */}
            <div className="w-80 flex flex-col border-r border-gray-100 pr-8">
              <h3 className="text-xl font-serif text-brand-dark mb-6 flex items-center gap-2">
                <Users className="text-brand-primary" /> Active Chats
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {Object.entries(
                  allSupportMessages.reduce((acc: any, curr) => {
                    if (!acc[curr.userId]) acc[curr.userId] = [];
                    acc[curr.userId].push(curr);
                    return acc;
                  }, {})
                ).sort((a: any, b: any) => {
                  const lastA = a[1][a[1].length - 1]?.timestamp?.toMillis() || 0;
                  const lastB = b[1][b[1].length - 1]?.timestamp?.toMillis() || 0;
                  return lastB - lastA;
                }).map(([uid, msgs]: any) => {
                  const lastMsg = msgs[msgs.length - 1];
                  const unreadCount = msgs.filter((m: any) => !m.isRead && m.sender === 'user').length;
                  return (
                    <button
                      key={uid}
                      onClick={() => {
                        setSelectedUserChat(uid);
                        // Mark as read
                        msgs.forEach(async (m: any) => {
                          if (!m.isRead && m.sender === 'user') {
                            await updateDoc(doc(db, 'support_messages', m.id), { isRead: true });
                          }
                        });
                      }}
                      className={`w-full p-4 rounded-2xl text-left transition-all relative ${selectedUserChat === uid ? 'bg-brand-primary text-white shadow-xl' : 'bg-gray-50 text-brand-dark hover:bg-brand-soft'}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-bold text-sm truncate pr-2">{msgs[0].userName || 'User'}</p>
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px]">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] truncate opacity-70 ${selectedUserChat === uid ? 'text-white' : 'text-text-muted'}`}>
                        {lastMsg.sender === 'admin' ? 'You: ' : ''}{lastMsg.text}
                      </p>
                    </button>
                  );
                })}
                {Object.keys(allSupportMessages).length === 0 && (
                  <div className="text-center py-10 text-text-muted italic">No support chats yet.</div>
                )}
              </div>
            </div>

            {/* Chat Box */}
            <div className="flex-1 flex flex-col">
              {selectedUserChat ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-2xl font-serif text-brand-dark">Chat with {allSupportMessages.find(m => m.userId === selectedUserChat)?.userName}</h3>
                      <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">User ID: {selectedUserChat}</p>
                    </div>
                    {!isReadOnly && (
                      <button 
                        onClick={() => deleteSupportChat(selectedUserChat)}
                        className="text-red-500 hover:text-red-700 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Clear History
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-gray-50 rounded-3xl mb-4">
                    {allSupportMessages
                      .filter(m => m.userId === selectedUserChat)
                      .map((msg, i) => (
                        <div key={i} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] p-4 rounded-2xl text-sm ${
                            msg.sender === 'admin' 
                              ? 'bg-brand-primary text-white rounded-tr-none' 
                              : 'bg-white text-brand-dark shadow-sm rounded-tl-none border border-gray-100'
                          }`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            <p className={`text-[8px] mt-1 opacity-60 ${msg.sender === 'admin' ? 'text-right' : 'text-left'}`}>
                              {msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleTimeString() : 'Just now'}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && sendSupportReply()}
                      placeholder="Type your reply here..."
                      className="flex-1 input-field"
                    />
                    <button 
                      onClick={sendSupportReply}
                      className="btn-primary px-8 flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" /> Reply
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-text-muted bg-gray-50 rounded-[2.5rem]">
                  <MessageSquare className="w-16 h-16 mb-4 opacity-10" />
                  <p className="font-serif text-lg">Select a chat to view messages</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="glass-card p-8 rounded-[2rem]">
              <h3 className="text-2xl font-serif text-brand-dark mb-8">Broadcast System Announcement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest ml-1">Message Type</label>
                    <select 
                      className="input-field"
                      value={announcementType}
                      onChange={e => setAnnouncementType(e.target.value as any)}
                    >
                      <option value="info">Info (Blue)</option>
                      <option value="success">Success (Green)</option>
                      <option value="warning">Warning (Amber)</option>
                      <option value="error">Critical (Red)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest ml-1">Broadcast Message</label>
                    <textarea 
                      className="input-field min-h-[150px]"
                      value={announcementMsg}
                      onChange={e => setAnnouncementMsg(e.target.value)}
                      placeholder="Type your message to all live users..."
                    />
                  </div>
                  <button onClick={sendAnnouncement} className="btn-primary w-full py-4 flex items-center justify-center gap-2">
                    <Play className="w-4 h-4" /> Send Live Broadcast
                  </button>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest">Broadcast History</p>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {announcements.map(ann => (
                      <div 
                        key={ann.id} 
                        className={`p-4 rounded-2xl border shadow-sm relative group ${
                          ann.type === 'error' ? 'bg-red-50 border-red-100' : 
                          ann.type === 'warning' ? 'bg-amber-50 border-amber-100' :
                          ann.type === 'success' ? 'bg-green-50 border-green-100' :
                          'bg-white border-gray-100'
                        }`}
                      >
                        <button 
                          onClick={() => !isReadOnly && deleteAnnouncement(ann.id)}
                          className={`absolute top-4 right-4 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ${isReadOnly ? 'hidden' : ''}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full ${
                            ann.type === 'error' ? 'bg-red-500' : 
                            ann.type === 'warning' ? 'bg-amber-500' :
                            ann.type === 'success' ? 'bg-green-500' :
                            'bg-blue-500'
                          }`} />
                          <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted">{ann.type}</p>
                        </div>
                        <p className="text-sm font-medium text-brand-dark">{ann.message}</p>
                        <p className="text-[9px] text-text-muted mt-2 font-mono">{new Date(ann.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                    {announcements.length === 0 && (
                      <div className="text-center py-10 text-text-muted italic">No broadcasts sent yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {editingReg && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
          >
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-2xl font-serif text-brand-dark">Edit Registration</h3>
              <button onClick={() => setEditingReg(null)} className="text-text-muted hover:text-brand-primary transition-colors"><XCircle /></button>
            </div>
            <form onSubmit={handleUpdateRegDetails} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest ml-1">Participant Name</label>
                  <input 
                    className="input-field"
                    value={editingReg.userName || ''}
                    onChange={e => setEditingReg({...editingReg, userName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest ml-1">Email</label>
                  <input 
                    className="input-field"
                    value={editingReg.userEmail || ''}
                    onChange={e => setEditingReg({...editingReg, userEmail: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest ml-1">Phone</label>
                  <input 
                    className="input-field"
                    value={editingReg.phone || ''}
                    onChange={e => setEditingReg({...editingReg, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest ml-1">College</label>
                  <input 
                    className="input-field"
                    value={editingReg.college || ''}
                    onChange={e => setEditingReg({...editingReg, college: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest ml-1">Unique Code (Reg ID)</label>
                  <input 
                    className="input-field"
                    value={editingReg.uniqueCode || ''}
                    onChange={e => setEditingReg({...editingReg, uniqueCode: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-text-muted tracking-widest ml-1">Transaction ID</label>
                  <input 
                    className="input-field"
                    value={editingReg.transactionId || ''}
                    onChange={e => setEditingReg({...editingReg, transactionId: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="submit" className="btn-primary flex-1 py-4">Save Changes</button>
                <button type="button" onClick={() => setEditingReg(null)} className="btn-secondary flex-1 py-4">Cancel</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {fullscreenBoard !== 'none' && (
        <div className="fixed inset-0 bg-brand-dark z-[100] flex flex-col p-10">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-4xl font-serif text-white tracking-widest uppercase">
              {fullscreenBoard === 'quiz' ? 'Live Quiz Leaderboard' : 'Treasure Hunt Progress'}
            </h2>
            <button 
              onClick={() => setFullscreenBoard('none')}
              className="bg-white/10 text-white hover:bg-white/20 p-4 rounded-full transition-all"
            >
              <Square className="w-8 h-8" />
            </button>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 gap-6 max-w-5xl mx-auto">
              {fullscreenBoard === 'quiz' ? (
                quizResponses
                  .filter(res => res.quizId === selectedQuizId)
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 5)
                  .map((res, i) => (
                    <motion.div 
                      key={res.id}
                      initial={{ x: -100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className={`flex items-center justify-between p-8 rounded-[2.5rem] ${i === 0 ? 'bg-amber-500 scale-105 shadow-2xl shadow-amber-500/20' : 'bg-white/5 border border-white/10'}`}
                    >
                      <div className="flex items-center gap-8">
                        <span className={`text-5xl font-serif ${i === 0 ? 'text-brand-dark' : 'text-white/30'}`}>{i+1}</span>
                        <div>
                          <p className={`text-3xl font-serif ${i === 0 ? 'text-brand-dark' : 'text-white'}`}>{res.quizName || res.userName}</p>
                          <p className={`text-sm tracking-widest uppercase font-bold ${i === 0 ? 'text-brand-dark/60' : 'text-white/40'}`}>
                            {res.correctCount || 0}/{res.totalQuestions || 0} Solved
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-5xl font-serif ${i === 0 ? 'text-brand-dark' : 'text-brand-primary'}`}>{res.score}</p>
                        <p className={`text-xs font-bold uppercase tracking-widest ${i === 0 ? 'text-brand-dark/40' : 'text-white/20'}`}>Scientific Mastery</p>
                      </div>
                    </motion.div>
                  ))
              ) : (
                treasureProgress
                  .filter(res => res.huntId === selectedHuntId)
                  .sort((a, b) => b.currentClueIndex - a.currentClueIndex)
                  .slice(0, 5)
                  .map((res, i) => (
                    <motion.div 
                      key={res.id}
                      initial={{ x: -100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className={`flex items-center justify-between p-8 rounded-[2.5rem] ${i === 0 ? 'bg-brand-primary scale-105 shadow-2xl shadow-brand-primary/20' : 'bg-white/5 border border-white/10'}`}
                    >
                      <div className="flex items-center gap-8">
                        <span className={`text-5xl font-serif ${i === 0 ? 'text-white' : 'text-white/30'}`}>{i+1}</span>
                        <div>
                          <p className="text-3xl font-serif text-white">{res.teamName || res.userName}</p>
                          <p className="text-sm tracking-widest uppercase font-bold text-white/40">
                             Currently on Clue #{res.currentClueIndex + 1}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                         <div className="flex flex-col items-end gap-2">
                           {res.isCompleted ? <Trophy className="text-amber-400 w-12 h-12" /> : <Map className="text-white w-10 h-10 animate-pulse" />}
                           <p className="text-xs font-bold uppercase tracking-widest text-white/20">Progress Status</p>
                         </div>
                      </div>
                    </motion.div>
                  ))
              )}
              {(fullscreenBoard === 'quiz' ? quizResponses : treasureProgress).length === 0 && (
                <div className="text-center py-40 border-2 border-dashed border-white/10 rounded-[3rem]">
                   <p className="text-3xl font-serif text-white/20 italic">Waiting for participants to connect...</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-white/20 text-xs font-bold uppercase tracking-widest">RASAYAN 2026 - Live Command Stream</p>
          </div>
        </div>
      )}
    </div>
  );
}
