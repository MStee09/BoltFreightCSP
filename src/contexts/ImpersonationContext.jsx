import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import { useAuth } from './AuthContext';

const ImpersonationContext = createContext();

export function ImpersonationProvider({ children }) {
  const { user } = useAuth();
  const [impersonatedUser, setImpersonatedUser] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('impersonation_session');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setImpersonatedUser(data.impersonatedUser);
        setAdminUser(data.adminUser);
        setIsImpersonating(true);
        setSessionId(data.sessionId);
      } catch (e) {
        localStorage.removeItem('impersonation_session');
      }
    }
  }, []);

  const startImpersonation = async (targetUserId, reason = '') => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { data: targetUserProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (profileError) throw profileError;

      const { data: currentUserProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: session, error: sessionError } = await supabase
        .from('user_impersonation_sessions')
        .insert({
          admin_user_id: user.id,
          impersonated_user_id: targetUserId,
          reason: reason,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      const impersonationData = {
        impersonatedUser: targetUserProfile,
        adminUser: currentUserProfile,
        sessionId: session.id,
      };

      localStorage.setItem('impersonation_session', JSON.stringify(impersonationData));

      setImpersonatedUser(targetUserProfile);
      setAdminUser(currentUserProfile);
      setIsImpersonating(true);
      setSessionId(session.id);

      window.location.reload();

      return { success: true };
    } catch (error) {
      console.error('Error starting impersonation:', error);
      return { error: error.message };
    }
  };

  const stopImpersonation = async () => {
    if (!sessionId) return;

    try {
      await supabase
        .from('user_impersonation_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', sessionId);

      localStorage.removeItem('impersonation_session');
      setImpersonatedUser(null);
      setAdminUser(null);
      setIsImpersonating(false);
      setSessionId(null);

      window.location.reload();
    } catch (error) {
      console.error('Error stopping impersonation:', error);
    }
  };

  const getEffectiveUser = () => {
    if (isImpersonating && impersonatedUser) {
      return {
        ...user,
        id: impersonatedUser.id,
        email: impersonatedUser.email,
        profile: impersonatedUser,
      };
    }
    return user;
  };

  return (
    <ImpersonationContext.Provider
      value={{
        isImpersonating,
        impersonatedUser,
        adminUser,
        startImpersonation,
        stopImpersonation,
        getEffectiveUser,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error('useImpersonation must be used within ImpersonationProvider');
  }
  return context;
}
