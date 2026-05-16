import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  college?: string;
  phone?: string;
  isAdmin?: boolean;
  isCoAdmin?: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isCoAdmin: boolean;
  isAuthenticating: boolean;
  authError: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoAdmin, setIsCoAdmin] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setAuthError(null);
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userEmailLower = user.email?.toLowerCase() || '';
        const isAdminEmail = 
          userEmailLower === 'brothernitin99@gmail.com' || 
          userEmailLower === 'nitin.c@somaiya.edu';
        
        const isCoAdminEmail = userEmailLower === 'brothernitin77@gmail.com';
        
        console.log(`User Logged In: ${userEmailLower}, Admin: ${isAdminEmail}, Co-Admin: ${isCoAdminEmail}`);
        
        // Ensure admin document exists for Firestore rules if admin or co-admin
        if (isAdminEmail || isCoAdminEmail) {
          try {
            await setDoc(doc(db, 'admins', user.uid), {
              email: user.email,
              role: isAdminEmail ? 'admin' : 'co-admin',
              lastSeen: new Date().toISOString()
            }, { merge: true });
          } catch (e) {
            console.error("Failed to sync admin status to Firestore:", e);
          }
        }

        if (userDoc.exists()) {
          const profileData = userDoc.data() as UserProfile;
          setProfile(profileData);
          const isActuallyAdmin = !!profileData.isAdmin || isAdminEmail;
          const isActuallyCoAdmin = !!profileData.isCoAdmin || isCoAdminEmail;
          setIsAdmin(isActuallyAdmin);
          setIsCoAdmin(isActuallyCoAdmin);
          
          // Logic for syncing flags if they are missing in profile
          const updates: any = {};
          if (isAdminEmail && !profileData.isAdmin) updates.isAdmin = true;
          if (isCoAdminEmail && !profileData.isCoAdmin) updates.isCoAdmin = true;
          
          if (Object.keys(updates).length > 0) {
            await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
          }
        } else {
          // Create initial profile
          const newProfile: UserProfile = {
            userId: user.uid,
            name: user.displayName || 'Anonymous',
            email: user.email || '',
            isAdmin: isAdminEmail,
            isCoAdmin: isCoAdminEmail,
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', user.uid), newProfile);
          setProfile(newProfile);
          setIsAdmin(isAdminEmail);
          setIsCoAdmin(isCoAdminEmail);
        }
      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsCoAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setAuthError(null);
    
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Auth Exception:", error);
      
      let message = "Login failed. Please try again.";
      if (error.code === 'auth/popup-blocked') {
        message = "Login popup blocked. Please allow popups or open in a new tab.";
      } else if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        message = "Login cancelled.";
      } else if (error.message?.includes('INTERNAL ASSERTION FAILED')) {
        message = "Environment error. Please open the app in a new tab to sign in.";
      } else {
        message = error.message || message;
      }
      setAuthError(message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const clearError = () => setAuthError(null);

  return (
    <AuthContext.Provider value={{ 
      user, profile, loading, isAuthenticating, isAdmin, isCoAdmin, authError, 
      login, logout, clearError 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
