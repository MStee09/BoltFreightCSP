import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Mail, ArrowUpRight, ArrowDownLeft, Users, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { formatDistanceToNow } from 'date-fns';

export function EmailTimeline({ customerId, carrierId, cspEventId }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedEmails, setExpandedEmails] = useState(new Set());

  useEffect(() => {
    fetchEmailActivities();

    const channel = supabase
      .channel('email-activities-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_activities',
          filter: buildFilter(),
        },
        () => {
          fetchEmailActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId, carrierId, cspEventId]);

  const buildFilter = () => {
    if (cspEventId) return `csp_event_id=eq.${cspEventId}`;
    if (customerId) return `customer_id=eq.${customerId}`;
    if (carrierId) return `carrier_id=eq.${carrierId}`;
    return '';
  };

  const fetchEmailActivities = async () => {
    try {
      let data = [];

      if (cspEventId && customerId) {
        // For CSP events with a customer, get emails directly linked to the CSP event
        // OR emails linked to the customer with null csp_event_id
        const { data: cspEmails, error: cspError } = await supabase
          .from('email_activities')
          .select('*')
          .eq('csp_event_id', cspEventId)
          .order('sent_at', { ascending: false });

        const { data: customerEmails, error: customerError } = await supabase
          .from('email_activities')
          .select('*')
          .eq('customer_id', customerId)
          .is('csp_event_id', null)
          .order('sent_at', { ascending: false });

        if (cspError) throw cspError;
        if (customerError) throw customerError;

        // Combine and deduplicate by id
        const combined = [...(cspEmails || []), ...(customerEmails || [])];
        const seen = new Set();
        data = combined.filter(email => {
          if (seen.has(email.id)) return false;
          seen.add(email.id);
          return true;
        });

        // Sort by sent_at descending
        data.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
      } else if (cspEventId) {
        // If we only have cspEventId, just get those directly linked
        const { data: result, error } = await supabase
          .from('email_activities')
          .select('*')
          .eq('csp_event_id', cspEventId)
          .order('sent_at', { ascending: false });

        if (error) throw error;
        data = result || [];
      } else if (customerId) {
        const { data: result, error } = await supabase
          .from('email_activities')
          .select('*')
          .eq('customer_id', customerId)
          .order('sent_at', { ascending: false });

        if (error) throw error;
        data = result || [];
      } else if (carrierId) {
        const { data: result, error } = await supabase
          .from('email_activities')
          .select('*')
          .eq('carrier_id', carrierId)
          .order('sent_at', { ascending: false });

        if (error) throw error;
        data = result || [];
      }

      setEmails(data);
    } catch (error) {
      console.error('Error fetching email activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEmailExpand = (emailId) => {
    setExpandedEmails((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  };

  const groupByThread = (emails) => {
    const threads = {};

    emails.forEach((email) => {
      const threadId = email.thread_id || email.id;

      if (!threads[threadId]) {
        threads[threadId] = [];
      }
      threads[threadId].push(email);
    });

    const threadArray = Object.entries(threads).map(([threadId, threadEmails]) => {
      threadEmails.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));

      return {
        threadId,
        emails: threadEmails,
        mostRecentDate: new Date(threadEmails[0].sent_at),
      };
    });

    threadArray.sort((a, b) => b.mostRecentDate - a.mostRecentDate);

    return threadArray;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Mail className="h-5 w-5 mr-2 animate-pulse" />
            Loading email history...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (emails.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Mail className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No email history yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Sent and tracked emails will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const threads = groupByThread(emails);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email History
          <Badge variant="secondary" className="ml-auto">
            {threads.length} {threads.length === 1 ? 'thread' : 'threads'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6">
            {threads.map((thread, threadIdx) => {
              const mostRecentEmail = thread.emails[0];
              const messageCount = thread.emails.length;
              const hasOutbound = thread.emails.some(e => e.direction === 'outbound');
              const lastOutbound = thread.emails.find(e => e.direction === 'outbound');
              const hasInboundAfterOutbound = lastOutbound && thread.emails.some(e =>
                e.direction === 'inbound' && new Date(e.sent_at) > new Date(lastOutbound.sent_at)
              );
              const isAwaitingReply = hasOutbound && !hasInboundAfterOutbound;

              return (
              <div key={thread.threadId} className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-base truncate">{mostRecentEmail.subject}</h4>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {mostRecentEmail.from_email?.split('@')[0] || 'Unknown'}
                          {mostRecentEmail.to_emails?.[0] && ` → ${mostRecentEmail.to_emails[0].split('@')[0]}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {messageCount} message{messageCount > 1 ? 's' : ''}
                    </Badge>
                    {isAwaitingReply && (
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                        <Clock className="w-3 h-3 mr-1" />
                        Awaiting Reply
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(mostRecentEmail.sent_at ? new Date(mostRecentEmail.sent_at) : new Date(), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
                {thread.emails.map((email, emailIdx) => {
                  const isExpanded = expandedEmails.has(email.id);
                  const isOutbound = email.direction === 'outbound';

                  return (
                    <div key={email.id} className="space-y-2">
                      {emailIdx > 0 && (
                        <div className="flex items-center gap-2 ml-4">
                          <div className="h-6 w-0.5 bg-border" />
                        </div>
                      )}
                      <div
                        className={`border rounded-lg p-4 transition-colors hover:bg-muted/50 ${
                          isOutbound ? 'border-blue-200 bg-blue-50/50' : 'border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div
                              className={`rounded-full p-2 ${
                                isOutbound
                                  ? 'bg-blue-100 text-blue-600'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {isOutbound ? (
                                <ArrowUpRight className="h-4 w-4" />
                              ) : (
                                <ArrowDownLeft className="h-4 w-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant={isOutbound ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {isOutbound ? 'Email Sent' : 'Email Received'}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {isOutbound ? `to ${email.to_emails[0]?.split('@')[0] || 'recipient'}` : `from ${email.from_name || email.from_email?.split('@')[0] || 'sender'}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(email.sent_at), {
                                    addSuffix: true,
                                  })}
                                </span>
                                {email.to_emails.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {email.to_emails.length} recipient
                                    {email.to_emails.length > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleEmailExpand(email.id)}
                            className="flex-shrink-0"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t space-y-3">
                            <div className="space-y-2 text-sm">
                              <div className="flex gap-2">
                                <span className="text-muted-foreground min-w-[60px]">From:</span>
                                <span className="flex-1">
                                  {email.from_name && `${email.from_name} `}
                                  &lt;{email.from_email}&gt;
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <span className="text-muted-foreground min-w-[60px]">To:</span>
                                <span className="flex-1">{email.to_emails.join(', ')}</span>
                              </div>
                              {email.cc_emails.length > 0 && (
                                <div className="flex gap-2">
                                  <span className="text-muted-foreground min-w-[60px]">Cc:</span>
                                  <span className="flex-1">{email.cc_emails.join(', ')}</span>
                                </div>
                              )}
                            </div>

                            <Separator />

                            <div className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded">
                              {email.body_text || 'No message content'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {threadIdx < threads.length - 1 && <Separator className="my-4" />}
              </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
