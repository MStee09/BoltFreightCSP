import React from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { Alert, AlertDescription } from '../ui/alert';
import { Lock } from 'lucide-react';

export const PermissionGuard = ({ permission, resource, action, fallback, children }) => {
  const { hasPermission, loading } = useUserRole();

  if (loading) {
    return null;
  }

  let checkPermission;
  if (permission) {
    checkPermission = permission;
  } else if (resource && action) {
    checkPermission = `${resource}.${action}`;
  } else {
    console.error('PermissionGuard requires either permission or resource+action props');
    return null;
  }

  const hasAccess = hasPermission(checkPermission);

  if (!hasAccess) {
    if (fallback) {
      return fallback;
    }
    return null;
  }

  return <>{children}</>;
};

export const RequirePermission = ({ permission, resource, action, message, children }) => {
  const { hasPermission, loading } = useUserRole();

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  let checkPermission;
  if (permission) {
    checkPermission = permission;
  } else if (resource && action) {
    checkPermission = `${resource}.${action}`;
  }

  const hasAccess = hasPermission(checkPermission);

  if (!hasAccess) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            {message || 'You do not have permission to access this feature.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};

export const IfHasPermission = ({ permission, resource, action, children, fallback }) => {
  return (
    <PermissionGuard
      permission={permission}
      resource={resource}
      action={action}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
};

export const IfHasRole = ({ roles, children, fallback }) => {
  const { role, loading } = useUserRole();

  if (loading) {
    return null;
  }

  const roleArray = Array.isArray(roles) ? roles : [roles];
  const hasRole = roleArray.includes(role);

  if (!hasRole) {
    return fallback || null;
  }

  return <>{children}</>;
};

export const usePermissions = () => {
  const roleData = useUserRole();
  return roleData;
};
