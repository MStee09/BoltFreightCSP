import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { supabase } from '@/api/supabaseClient';
import { RefreshCw, AlertCircle, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const OAuthErrorLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('oauth_error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching OAuth logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getErrorTypeBadge = (errorType) => {
    const colors = {
      session_lost: 'bg-red-100 text-red-700',
      token_exchange_failed: 'bg-orange-100 text-orange-700',
      callback_error: 'bg-yellow-100 text-yellow-700',
      rls_blocked: 'bg-purple-100 text-purple-700',
    };

    return colors[errorType] || 'bg-gray-100 text-gray-700';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>OAuth Error Logs</CardTitle>
            <CardDescription>
              Debug Gmail OAuth connection issues without requiring users to check browser console
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            Loading logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-2 opacity-50" />
            <p>No OAuth errors logged</p>
            <p className="text-sm">This is good - it means connections are working!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="border rounded-lg p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getErrorTypeBadge(log.error_type)}>
                        {log.error_type}
                      </Badge>
                      {log.user_email && (
                        <span className="flex items-center text-sm text-muted-foreground">
                          <User className="h-3 w-3 mr-1" />
                          {log.user_email}
                        </span>
                      )}
                      <span className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    <p className="text-sm font-medium">{log.error_message}</p>

                    {expandedLog === log.id && (
                      <div className="mt-3 space-y-3 text-sm">
                        {log.error_details && Object.keys(log.error_details).length > 0 && (
                          <div className="bg-slate-100 p-3 rounded">
                            <p className="font-medium mb-2">Error Details:</p>
                            <pre className="text-xs overflow-x-auto">
                              {JSON.stringify(log.error_details, null, 2)}
                            </pre>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>
                            <span className="font-medium">Provider:</span> {log.oauth_provider}
                          </div>
                          <div>
                            <span className="font-medium">User ID:</span> {log.user_id || 'N/A'}
                          </div>
                          <div className="col-span-2">
                            <span className="font-medium">Callback URL:</span>
                            <div className="break-all">{log.callback_url}</div>
                          </div>
                          <div className="col-span-2">
                            <span className="font-medium">User Agent:</span>
                            <div className="break-all">{log.user_agent}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
