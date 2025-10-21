import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

export function useUserRole() {
  const [role, setRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    fetchUserRole();

    const channel = supabase
      .channel('user-profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
        },
        () => {
          fetchUserRole();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setRole(null);
        setIsAdmin(false);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        setRole('basic');
        setIsAdmin(false);
        setUserProfile(null);
      } else {
        setRole(data.role);
        setIsAdmin(data.role === 'admin');
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setRole('basic');
      setIsAdmin(false);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  return { role, isAdmin, loading, userProfile, refetch: fetchUserRole };
}
