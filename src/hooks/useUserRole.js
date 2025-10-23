import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

export function useUserRole() {
  const [role, setRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isElite, setIsElite] = useState(false);
  const [isTariffMaster, setIsTariffMaster] = useState(false);
  const [isBasic, setIsBasic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [permissions, setPermissions] = useState([]);

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
        setIsElite(false);
        setIsTariffMaster(false);
        setIsBasic(false);
        setUserProfile(null);
        setPermissions([]);
        setLoading(false);
        return;
      }

      console.log('Fetching profile for user ID:', user.id);

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      console.log('User profile query result:', { data, error });

      if (error || !data) {
        console.error('Error fetching user role:', error);
        console.error('No profile found, defaulting to basic');
        setRole('basic');
        setIsAdmin(false);
        setIsElite(false);
        setIsTariffMaster(false);
        setIsBasic(true);
        setUserProfile(null);
        setPermissions([]);
      } else {
        console.log('User role from database:', data.role);
        setRole(data.role);
        setIsAdmin(data.role === 'admin');
        setIsElite(data.role === 'elite');
        setIsTariffMaster(data.role === 'tariff_master');
        setIsBasic(data.role === 'basic');
        setUserProfile(data);

        const { data: permsData, error: permsError } = await supabase
          .from('role_permissions')
          .select('permission_id, permissions(name)')
          .eq('role', data.role);

        console.log('Permissions query result:', { permsData, permsError });

        if (permsData) {
          const permissionNames = permsData.map(p => p.permissions.name);
          console.log('Loaded permissions:', permissionNames.length);
          setPermissions(permissionNames);
        }
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setRole('basic');
      setIsAdmin(false);
      setIsElite(false);
      setIsTariffMaster(false);
      setIsBasic(true);
      setUserProfile(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  const canEdit = (resource) => {
    return hasPermission(`${resource}.edit`) || hasPermission(`${resource}.create`);
  };

  const canDelete = (resource) => {
    return hasPermission(`${resource}.delete`);
  };

  const canView = (resource) => {
    return hasPermission(`${resource}.view`);
  };

  return {
    role,
    isAdmin,
    isElite,
    isTariffMaster,
    isBasic,
    loading,
    userProfile,
    permissions,
    hasPermission,
    canEdit,
    canDelete,
    canView,
    refetch: fetchUserRole
  };
}
