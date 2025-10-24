import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { Interaction } from '../../api/entities';
import { EmailComposeDialog } from '@/components/email/EmailComposeDialog';
import { Skeleton } from '../ui/skeleton';
import { format, formatDistanceToNow } from 'date-fns';
import {
  GitBranch,
  MessageSquare,
  Phone,
  Users,
  FileText,
  FilePlus,
  Mail,
  Send,
  ExternalLink,
  Filter,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  MousePointer,
  Settings,
  Sparkles,
  ChevronUp
} from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const ACTIVITY_CONFIG = {
  email: {
    icon: <Mail className="w-4 h-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Email'
  },
  note: {
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    label: 'Note'
  },
  system: {
    icon: <Settings className="w-4 h-4" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    label: 'System'
  },
  ai: {
    icon: <Sparkles className="w-4 h-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    label: 'AI Insight'
  },
};

const LogInteractionForm = ({ entityId, entityType }) => {
  const queryClient = useQueryClient();
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');

  const mutation = useMutation({
    mutationFn: (newInteraction) => Interaction.create(newInteraction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline', entityId, entityType] });
      setSummary('');
      setDetails('');
    },
  });

  const handleSubmit = () => {
    if (!summary) return;
    mutation.mutate({
      entity_id: entityId,
      entity_type: entityType,
      interaction_type: 'note',
      summary,
      details
    });
  };

  return (
    <Card className="mb-6 border-2 border-dashed border-slate-300 bg-slate-50/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
          <MessageSquare className="w-4 h-4" />
          Log Internal Note
        </div>
        <Input
          placeholder="Summary (e.g., 'Customer returned signed LOA')"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="bg-white"
        />
        <Textarea
          placeholder="Add context, details, or next steps..."
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          className="bg-white"
        />
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={mutation.isPending || !summary}>
            {mutation.isPending ? 'Logging...' : 'Log Note'}
            <Send className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const EmailActivityCard = ({ activity, onReply, threadMessages }) => {
  const [expanded, setExpanded] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const config = ACTIVITY_CONFIG.email;
  const fromNow = formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true });
  const fullDate = format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a');

  const isOutbound = activity.direction === 'outbound';
  const direction = isOutbound ? 'Sent' : 'Received';

  const awaitingReply = activity.awaiting_reply;
  const daysSinceNoReply = activity.awaiting_reply_since
    ? Math.floor((new Date() - new Date(activity.awaiting_reply_since)) / (1000 * 60 * 60 * 24))
    : null;

  const status = awaitingReply ? 'Awaiting Reply' : activity.opened_at ? 'Opened' : 'Sent';
  const threadCount = threadMessages?.length || 1;

  return (
    <Card className={`border ${config.borderColor} ${config.bgColor} hover:shadow-md transition-shadow`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor} ${config.color} border ${config.borderColor}`}>
            {config.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`${config.color} ${config.bgColor} border ${config.borderColor}`}>
                  {config.label}
                </Badge>
                <Badge variant="secondary">{direction}</Badge>
                {awaitingReply ? (
                  <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Awaiting Reply {daysSinceNoReply > 0 && `(${daysSinceNoReply}d)`}
                  </Badge>
                ) : activity.opened_at ? (
                  <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Opened
                  </Badge>
                ) : null}
                {threadCount > 1 && (
                  <Badge variant="outline" className="text-slate-600 border-slate-300">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    {threadCount} messages
                  </Badge>
                )}
              </div>
              <span className="text-xs text-slate-500 flex-shrink-0" title={fullDate}>
                {fromNow}
              </span>
            </div>

            <h4 className="font-semibold text-slate-900 text-sm mb-2">
              {activity.subject}
            </h4>

            <div className="text-xs text-slate-600 mb-3 flex items-center gap-2">
              {isOutbound ? (
                <>
                  <span className="font-medium">{activity.from_name || activity.from_email}</span>
                  <ArrowUpRight className="w-3 h-3" />
                  <span>{activity.to_emails?.[0] || 'Unknown'}</span>
                  {activity.to_emails?.length > 1 && (
                    <span className="text-slate-400">+{activity.to_emails.length - 1} more</span>
                  )}
                </>
              ) : (
                <>
                  <span className="font-medium">{activity.from_name || activity.from_email}</span>
                  <ArrowDownLeft className="w-3 h-3" />
                  <span>You</span>
                </>
              )}
            </div>

            {expanded && activity.body_text && (
              <div className="mb-3 p-3 bg-white rounded border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap">
                {activity.body_text.length > 500
                  ? `${activity.body_text.substring(0, 500)}...`
                  : activity.body_text}
              </div>
            )}

            {showThread && threadMessages && threadMessages.length > 1 && (
              <div className="mb-3 space-y-2 pl-3 border-l-2 border-blue-200">
                {threadMessages
                  .filter(msg => msg.id !== activity.emailId)
                  .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                  .map((msg) => (
                    <div key={msg.id} className="text-xs p-2 bg-slate-50 rounded border border-slate-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {msg.direction === 'outbound' ? 'You' : msg.from_name || msg.from_email}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-slate-700 line-clamp-2">{msg.body_text}</p>
                    </div>
                  ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="text-xs h-7 px-2"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-3 h-3 mr-1" />
                    Hide content
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3 mr-1" />
                    Show content
                  </>
                )}
              </Button>
              {threadCount > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowThread(!showThread)}
                  className="text-xs h-7 px-2"
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  {showThread ? 'Hide' : 'View'} thread ({threadCount})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReply(activity)}
                className="text-xs h-7 px-2 ml-auto"
              >
                <Send className="w-3 h-3 mr-1" />
                Reply
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const NoteCard = ({ activity }) => {
  const config = ACTIVITY_CONFIG.note;
  const fromNow = formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true });
  const fullDate = format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a');

  return (
    <Card className={`border ${config.borderColor} ${config.bgColor} hover:shadow-md transition-shadow`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor} ${config.color} border ${config.borderColor}`}>
            {config.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge className={`${config.color} ${config.bgColor} border ${config.borderColor}`}>
                  {config.label}
                </Badge>
                <span className="text-xs text-slate-500">Internal-only</span>
              </div>
              <span className="text-xs text-slate-500 flex-shrink-0" title={fullDate}>
                {fromNow}
              </span>
            </div>

            <h4 className="font-semibold text-slate-900 text-sm mb-2">
              {activity.summary}
            </h4>

            {activity.details && (
              <p className="text-xs text-slate-600 whitespace-pre-wrap">
                {activity.details}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const SystemCard = ({ activity }) => {
  const isAI = activity.metadata?.source === 'ai' || activity.activityType === 'ai';
  const config = isAI ? ACTIVITY_CONFIG.ai : ACTIVITY_CONFIG.system;
  const fromNow = formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true });
  const fullDate = format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a');

  return (
    <Card className={`border ${config.borderColor} bg-gradient-to-r ${config.bgColor} to-white hover:shadow-md transition-shadow opacity-90`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor} ${config.color} border ${config.borderColor}`}>
            {config.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge className={`${config.color} ${config.bgColor} border ${config.borderColor}`}>
                  {config.label}
                </Badge>
                <span className="text-xs text-slate-500">Automated</span>
              </div>
              <span className="text-xs text-slate-500 flex-shrink-0" title={fullDate}>
                {fromNow}
              </span>
            </div>

            <h4 className="font-semibold text-slate-900 text-sm mb-2">
              {activity.summary}
            </h4>

            {activity.details && (
              <p className="text-xs text-slate-600 whitespace-pre-wrap">
                {activity.details}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function InteractionTimeline({ customerId, entityType }) {
  const [filterTypes, setFilterTypes] = useState([]);
  const [replyToEmail, setReplyToEmail] = useState(null);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);

  useEffect(() => {
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: credentials } = await supabase
          .from('user_gmail_credentials')
          .select('email_address')
          .eq('user_id', user.id)
          .maybeSingle();

        if (credentials) {
          setCurrentUserEmail(credentials.email_address);
        } else {
          setCurrentUserEmail(user.email);
        }
      }
    };
    getUserEmail();
  }, []);

  const { data: interactions = [], isLoading: interactionsLoading } = useQuery({
    queryKey: ['interactions', customerId, entityType],
    queryFn: () => Interaction.filter({ entity_id: customerId, entity_type: entityType, order_by: '-created_date' }),
    enabled: !!customerId && !!entityType,
    initialData: []
  });

  const { data: emailActivities = [], isLoading: emailsLoading } = useQuery({
    queryKey: ['email_activities', customerId, entityType],
    queryFn: async () => {
      const filterColumn = entityType === 'customer' ? 'customer_id' :
                          entityType === 'carrier' ? 'carrier_id' :
                          entityType === 'csp_event' ? 'csp_event_id' : null;

      if (!filterColumn) return [];

      const { data, error } = await supabase
        .from('email_activities')
        .select('*')
        .eq(filterColumn, customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId && !!entityType,
    initialData: []
  });

  const emailThreads = useMemo(() => {
    const threads = {};
    emailActivities.forEach(email => {
      if (email.thread_id) {
        if (!threads[email.thread_id]) {
          threads[email.thread_id] = [];
        }
        threads[email.thread_id].push(email);
      }
    });
    return threads;
  }, [emailActivities]);

  const allActivities = useMemo(() => {
    const threadRepresentatives = new Map();

    emailActivities.forEach(e => {
      const threadId = e.thread_id || e.id;
      const existingThread = threadRepresentatives.get(threadId);
      const emailTimestamp = new Date(e.sent_at || e.created_at);

      if (!existingThread || emailTimestamp > new Date(existingThread.timestamp)) {
        threadRepresentatives.set(threadId, {
          id: `email-thread-${threadId}`,
          emailId: e.id,
          type: 'email',
          activityType: 'email',
          subject: e.subject,
          from_email: e.from_email,
          from_name: e.from_name,
          to_emails: e.to_emails,
          cc_emails: e.cc_emails,
          body_text: e.body_text,
          direction: e.direction,
          opened_at: e.opened_at,
          clicked_at: e.clicked_at,
          timestamp: e.sent_at || e.created_at,
          tracking_code: e.tracking_code,
          message_id: e.message_id,
          thread_id: threadId,
          awaiting_reply: e.awaiting_reply,
          awaiting_reply_since: e.awaiting_reply_since,
          customer_id: e.customer_id,
          carrier_id: e.carrier_id,
          csp_event_id: e.csp_event_id
        });
      }
    });

    const combined = [
      ...interactions.map(i => ({
        id: `interaction-${i.id}`,
        type: 'interaction',
        activityType: i.interaction_type,
        summary: i.summary,
        details: i.details,
        timestamp: i.created_date,
        metadata: i.metadata
      })),
      ...Array.from(threadRepresentatives.values())
    ];

    combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (filterTypes.length > 0) {
      return combined.filter(activity => filterTypes.includes(activity.activityType));
    }

    return combined;
  }, [interactions, emailActivities, filterTypes]);

  const activityTypeCounts = useMemo(() => {
    const counts = { email: 0, note: 0, system: 0, ai: 0 };

    emailActivities.forEach(() => {
      counts.email += 1;
    });

    interactions.forEach(item => {
      if (item.interaction_type === 'note') {
        counts.note += 1;
      } else if (item.interaction_type === 'system' || item.metadata?.source === 'system') {
        counts.system += 1;
      } else if (item.interaction_type === 'ai' || item.metadata?.source === 'ai') {
        counts.ai += 1;
      } else {
        counts.note += 1;
      }
    });

    return counts;
  }, [interactions, emailActivities]);

  const toggleFilter = (type) => {
    setFilterTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleReply = (emailActivity) => {
    setReplyToEmail(emailActivity);
    setShowComposeDialog(true);
  };

  const handleCloseCompose = () => {
    setShowComposeDialog(false);
    setReplyToEmail(null);
  };

  const isLoading = interactionsLoading || emailsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4 mt-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <LogInteractionForm entityId={customerId} entityType={entityType} />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <h3 className="font-semibold text-slate-900">Activity Timeline</h3>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={filterTypes.length === 0 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterTypes([])}
            className="flex items-center gap-1"
          >
            All Activity ({allActivities.length})
          </Button>
          <Button
            variant={filterTypes.includes('email') ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleFilter('email')}
            className="flex items-center gap-1"
          >
            <Mail className="w-3 h-3" />
            Email ({activityTypeCounts.email})
          </Button>
          <Button
            variant={filterTypes.includes('note') ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleFilter('note')}
            className="flex items-center gap-1"
          >
            <MessageSquare className="w-3 h-3" />
            Notes ({activityTypeCounts.note})
          </Button>
          <Button
            variant={filterTypes.includes('system') || filterTypes.includes('ai') ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              if (filterTypes.includes('system') || filterTypes.includes('ai')) {
                setFilterTypes(prev => prev.filter(t => t !== 'system' && t !== 'ai'));
              } else {
                setFilterTypes(prev => [...prev, 'system', 'ai']);
              }
            }}
            className="flex items-center gap-1"
          >
            <Settings className="w-3 h-3" />
            System & AI ({activityTypeCounts.system + activityTypeCounts.ai})
          </Button>
        </div>
      </div>

      {allActivities.length === 0 ? (
        <div className="text-center py-12 text-slate-500 border border-dashed rounded-lg bg-slate-50">
          <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-semibold">No Activities Yet</p>
          <p className="text-sm">Send an email, log a note, or create a CSP event to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allActivities.map((activity) => {
            if (activity.type === 'email') {
              return (
                <EmailActivityCard
                  key={activity.id}
                  activity={activity}
                  onReply={handleReply}
                  threadMessages={activity.thread_id ? emailThreads[activity.thread_id]?.map(e => ({
                    id: e.id,
                    direction: e.direction,
                    from_email: e.from_email,
                    from_name: e.from_name,
                    body_text: e.body_text,
                    timestamp: e.sent_at || e.created_at
                  })) : null}
                />
              );
            } else if (activity.activityType === 'system' || activity.activityType === 'ai' || activity.metadata?.source === 'system' || activity.metadata?.source === 'ai') {
              return <SystemCard key={activity.id} activity={activity} />;
            } else {
              return <NoteCard key={activity.id} activity={activity} />;
            }
          })}
        </div>
      )}

      {showComposeDialog && replyToEmail && (() => {
        const isFollowUp = replyToEmail.direction === 'outbound' ||
                          replyToEmail.from_email === currentUserEmail;

        return (
          <EmailComposeDialog
            open={showComposeDialog}
            onOpenChange={handleCloseCompose}
            cspEvent={replyToEmail.csp_event_id ? { id: replyToEmail.csp_event_id } : null}
            customer={replyToEmail.customer_id ? { id: replyToEmail.customer_id } : null}
            carrier={replyToEmail.carrier_id ? { id: replyToEmail.carrier_id } : null}
            defaultSubject={isFollowUp ? replyToEmail.subject : (
              replyToEmail.subject?.startsWith('Re:') ? replyToEmail.subject : `Re: ${replyToEmail.subject}`
            )}
            defaultRecipients={isFollowUp ? replyToEmail.to_emails : [replyToEmail.from_email]}
            defaultCc={isFollowUp ? (replyToEmail.cc_emails || []) : []}
            inReplyTo={replyToEmail.message_id}
            threadId={replyToEmail.thread_id}
            isFollowUp={isFollowUp}
          />
        );
      })()}
    </div>
  );
}
