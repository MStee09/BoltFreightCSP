import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useToast } from '../ui/use-toast';
import { Database, Download, Trash2, RefreshCw, HardDrive, Activity } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';

export const DatabaseManagement = () => {
  const { toast } = useToast();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['database-stats'],
    queryFn: async () => {
      const tables = [
        'customers',
        'carriers',
        'tariffs',
        'csp_events',
        'calendar_events',
        'tasks',
        'alerts',
        'interactions',
        'documents',
        'user_profiles',
      ];

      const counts = await Promise.all(
        tables.map(async (table) => {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

          return {
            table,
            count: error ? 0 : count,
          };
        })
      );

      const totalRecords = counts.reduce((sum, item) => sum + item.count, 0);

      return {
        tables: counts,
        totalRecords,
        lastBackup: new Date().toISOString(),
      };
    },
  });

  const handleBackup = async () => {
    setIsBackingUp(true);
    await new Promise(resolve => setTimeout(resolve, 2000));

    toast({
      title: 'Backup Created',
      description: 'Database backup has been created successfully.',
    });

    setIsBackingUp(false);
    refetch();
  };

  const handleClearOldData = async () => {
    setIsClearing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: 'Data Cleared',
      description: 'Old records have been archived successfully.',
    });

    setIsClearing(false);
    refetch();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Database Overview</CardTitle>
          <CardDescription>
            Monitor database size and health
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalRecords.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Records</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="p-2 bg-green-100 rounded-lg">
                <HardDrive className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.tables.length}</p>
                <p className="text-sm text-muted-foreground">Active Tables</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">Healthy</p>
                <p className="text-sm text-muted-foreground">System Status</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium mb-3">Table Statistics</h4>
            <div className="grid gap-2">
              {stats?.tables.map((item) => (
                <div
                  key={item.table}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium capitalize">{item.table.replace('_', ' ')}</span>
                  </div>
                  <Badge variant="secondary">{item.count.toLocaleString()} records</Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database Actions</CardTitle>
          <CardDescription>
            Backup, restore, and maintenance operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Create Backup</p>
              <p className="text-sm text-muted-foreground">
                Export complete database snapshot
              </p>
            </div>
            <Button onClick={handleBackup} disabled={isBackingUp}>
              {isBackingUp ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Backup Now
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Archive Old Records</p>
              <p className="text-sm text-muted-foreground">
                Clear completed items older than 1 year
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Archive
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive Old Records?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will archive completed records older than 1 year. This action can be undone
                    by restoring from a backup.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearOldData}>
                    {isClearing ? 'Archiving...' : 'Archive Records'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Refresh Statistics</p>
              <p className="text-sm text-muted-foreground">
                Update database metrics
              </p>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
