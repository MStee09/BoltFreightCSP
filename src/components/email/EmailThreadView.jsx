import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Mail,
  MailOpen,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Clock,
  Users,
  Calendar,
  UserCircle,
  Building2,
  Truck,
  ExternalLink,
  X,
  Paperclip,
  ArrowRight,
  Filter,
  Search,
  Reply,
  Check,
  Plus,
  Circle,
  Pause,
  CheckCircle2,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { useEmailComposer } from '@/contexts/EmailComposerContext';

const STATUS_CONFIG = {
  awaiting_reply: {
    label: 'Awaiting Reply',
    color: 'bg-[#F2C94C]',
    textColor: 'text-amber-700',
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-300',
    icon: Clock
  },
  active: {
    label: 'Active',
    color: 'bg-[#3BB273]',
    textColor: 'text-green-700',
    badgeColor: 'bg-green-100 text-green-700 border-green-300',
    icon: Circle
  },
  stalled: {
    label: 'Stalled',
    color: 'bg-[#F2994A]',
    textColor: 'text-orange-700',
    badgeColor: 'bg-orange-100 text-orange-700 border-orange-300',
    icon: Pause
  },
  closed: {
    label: 'Closed',
    color: 'bg-[#BDBDBD]',
    textColor: 'text-gray-600',
    badgeColor: 'bg-gray-100 text-gray-600 border-gray-300',
    icon: CheckCircle2
  },
};

export function EmailThreadView({ cspEventId, customerId, carrierId }) {
  const queryClient = useQueryClient();
  const { openComposer } = useEmailComposer();

  const [expandedThreads, setExpandedThreads] = useState(new Set());
  const [expandedMessages, setExpandedMessages] = useState(new Set());
  const [selectedThread, setSelectedThread] = useState(null);
  const [viewMessageModal, setViewMessageModal] = useState(null);
  const [filterStatus, setFilterStatus] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('last_activity');
  const [showMineOnly, setShowMineOnly] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['current_user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['email_threads', cspEventId, customerId, carrierId, filterStatus, showMineOnly],
    queryFn: async () => {
      let query = supabase
        .from('email_threads')
        .select('*, owner:user_profiles!owner_id(id, full_name, email)');

      if (cspEventId) query = query.eq('csp_event_id', cspEventId);
      if (customerId) query = query.eq('customer_id', customerId);
      if (carrierId) query = query.eq('carrier_id', carrierId);

      if (filterStatus === 'awaiting_reply') {
        query = query.eq('status', 'awaiting_reply');
      } else if (filterStatus === 'stalled') {
        query = query.eq('status', 'stalled');
      } else if (filterStatus === 'closed') {
        query = query.eq('status', 'closed');
      } else {
        query = query.in('status', ['active', 'awaiting_reply']);
      }

      if (showMineOnly && currentUser) {
        query = query.eq('owner_id', currentUser.id);
      }

      const { data, error } = await query.order('last_activity_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filteredThreads = threads.filter(thread => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      thread.subject.toLowerCase().includes(search) ||
      thread.participant_emails.some(email => email.toLowerCase().includes(search))
    );
  });

  const sortedThreads = [...filteredThreads].sort((a, b) => {
    if (sortBy === 'subject') {
      return a.subject.localeCompare(b.subject);
    } else if (sortBy === 'owner') {
      return (a.owner?.full_name || '').localeCompare(b.owner?.full_name || '');
    }
    return new Date(b.last_activity_at) - new Date(a.last_activity_at);
  });

  const { data: followUpTasks = {} } = useQuery({
    queryKey: ['email_follow_up_tasks', threads.map(t => t.id)],
    queryFn: async () => {
      if (threads.length === 0) return {};
      const threadIds = threads.map(t => t.id);
      const { data, error } = await supabase
        .from('email_follow_up_tasks')
        .select('*')
        .in('thread_id', threadIds)
        .in('status', ['pending', 'overdue']);
      if (error) throw error;

      const tasksByThread = {};
      data?.forEach(task => {
        if (!tasksByThread[task.thread_id]) {
          tasksByThread[task.thread_id] = [];
        }
        tasksByThread[task.thread_id].push(task);
      });
      return tasksByThread;
    },
    enabled: threads.length > 0,
  });

  const updateThreadMutation = useMutation({
    mutationFn: async ({ threadId, updates }) => {
      const { error } = await supabase
        .from('email_threads')
        .update(updates)
        .eq('id', threadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_threads'] });
      toast.success('Thread updated');
    },
    onError: (error) => {
      toast.error(`Failed to update thread: ${error.message}`);
    },
  });

  const createFollowUpMutation = useMutation({
    mutationFn: async ({ threadId, days }) => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + days);

      const thread = threads.find(t => t.id === threadId);

      const { error } = await supabase
        .from('email_follow_up_tasks')
        .insert({
          thread_id: threadId,
          csp_event_id: thread?.csp_event_id,
          customer_id: thread?.customer_id,
          carrier_id: thread?.carrier_id,
          assigned_to: currentUser?.id,
          created_by: currentUser?.id,
          title: `Follow up: ${thread?.subject}`,
          description: `Follow up on email thread`,
          due_date: dueDate.toISOString(),
          status: 'pending',
          auto_close_on_reply: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_follow_up_tasks'] });
      toast.success('Follow-up task created');
    },
    onError: (error) => {
      toast.error(`Failed to create follow-up: ${error.message}`);
    },
  });

  const toggleThread = (threadId) => {
    const newExpanded = new Set(expandedThreads);
    if (newExpanded.has(threadId)) {
      newExpanded.delete(threadId);
    } else {
      newExpanded.add(threadId);
    }
    setExpandedThreads(newExpanded);
  };

  const handleMarkClosed = (threadId) => {
    updateThreadMutation.mutate({ threadId, updates: { status: 'closed' } });
  };

  const handleReassign = (threadId, newOwnerId) => {
    updateThreadMutation.mutate({ threadId, updates: { owner_id: newOwnerId } });
  };

  const handleReplyInGmail = (thread) => {
    const subject = thread.subject.includes('[FO-') ? thread.subject : `Re: ${thread.subject}`;
    const recipients = thread.participant_emails.filter(email => email !== currentUser?.email).join(',');
    const mailtoLink = `mailto:${recipients}?subject=${encodeURIComponent(subject)}`;
    window.open(mailtoLink, '_blank');
  };

  const collapseAll = () => setExpandedThreads(new Set());
  const expandAll = () => setExpandedThreads(new Set(threads.map(t => t.id)));

  if (isLoading) {
    return <div className="p-4">Loading threads...</div>;
  }

  return (
    <div className="space-y-3">
      {/* New Email Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => openComposer({
            cspEvent: cspEventId ? { id: cspEventId } : null,
            customer: customerId ? { id: customerId } : null,
            carrier: carrierId ? { id: carrierId } : null,
          })}
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Email
        </Button>
      </div>

      {/* Filters & Controls */}
      <div className="flex flex-wrap gap-2 items-center justify-between bg-slate-50 p-2.5 rounded-lg">
        <div className="flex gap-1.5 flex-wrap">
          <Button
            variant={filterStatus === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('active')}
            className="h-8 gap-1.5"
          >
            <Circle className="h-3 w-3 fill-current" />
            Active
          </Button>
          <Button
            variant={filterStatus === 'awaiting_reply' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('awaiting_reply')}
            className="h-8 gap-1.5"
          >
            <Clock className="h-3 w-3" />
            Awaiting Reply
          </Button>
          <Button
            variant={filterStatus === 'stalled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('stalled')}
            className="h-8 gap-1.5"
          >
            <Pause className="h-3 w-3" />
            Stalled
          </Button>
          <Button
            variant={filterStatus === 'closed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('closed')}
            className="h-8 gap-1.5"
          >
            <CheckCircle2 className="h-3 w-3" />
            Closed
          </Button>
          <Button
            variant={showMineOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowMineOnly(!showMineOnly)}
            className="h-8 gap-1.5"
          >
            <UserCircle className="h-3 w-3" />
            Mine
          </Button>
        </div>

        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search threads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-64"
            />
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_activity">Last Activity</SelectItem>
              <SelectItem value="subject">Subject</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
        </div>
      </div>

      {/* Thread List */}
      <div className="space-y-2">
        {sortedThreads.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No email threads found</p>
            </CardContent>
          </Card>
        ) : (
          sortedThreads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              isExpanded={expandedThreads.has(thread.id)}
              onToggle={() => toggleThread(thread.id)}
              onMarkClosed={() => handleMarkClosed(thread.id)}
              onReassign={handleReassign}
              onReplyInGmail={() => handleReplyInGmail(thread)}
              onCreateFollowUp={(days) => createFollowUpMutation.mutate({ threadId: thread.id, days })}
              followUpTasks={followUpTasks[thread.id] || []}
              currentUser={currentUser}
              expandedMessages={expandedMessages}
              setExpandedMessages={setExpandedMessages}
              setViewMessageModal={setViewMessageModal}
            />
          ))
        )}
      </div>

      {/* View Message Modal */}
      {viewMessageModal && (
        <Dialog open={!!viewMessageModal} onOpenChange={() => setViewMessageModal(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewMessageModal.subject}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p><strong>From:</strong> {viewMessageModal.from_name} ({viewMessageModal.from_email})</p>
                <p><strong>To:</strong> {viewMessageModal.to_emails.join(', ')}</p>
                {viewMessageModal.cc_emails?.length > 0 && (
                  <p><strong>CC:</strong> {viewMessageModal.cc_emails.join(', ')}</p>
                )}
                <p><strong>Date:</strong> {format(new Date(viewMessageModal.sent_at), 'PPpp')}</p>
              </div>
              <div className="border-t pt-4 whitespace-pre-wrap">
                {viewMessageModal.body_text || viewMessageModal.body_html}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ThreadCard({
  thread,
  isExpanded,
  onToggle,
  onMarkClosed,
  onReassign,
  onReplyInGmail,
  onCreateFollowUp,
  followUpTasks,
  currentUser,
  expandedMessages,
  setExpandedMessages,
  setViewMessageModal,
}) {
  const statusConfig = STATUS_CONFIG[thread.status] || STATUS_CONFIG.active;
  const StatusIcon = statusConfig.icon;

  const { data: messages = [] } = useQuery({
    queryKey: ['email_activities', thread.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_activities')
        .select('*')
        .eq('thread_id', thread.id)
        .order('sent_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isExpanded,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['user_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email');
      if (error) throw error;
      return data || [];
    },
  });

  const nextFollowUp = followUpTasks.sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];
  const [isHovered, setIsHovered] = useState(false);
  const [visibleMessages, setVisibleMessages] = useState(2);

  const loadMoreMessages = () => {
    setVisibleMessages(prev => Math.min(prev + 2, messages.length));
  };

  const hasAttachments = messages.some(m => m.has_attachments);

  return (
    <Card
      className={`transition-all hover:shadow-md ${!thread.is_read ? 'border-l-4 border-l-blue-500' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-2.5">
        {/* Thread Header (Collapsed) */}
        <div className="flex items-start gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-5 w-5 mt-0.5"
            onClick={onToggle}
          >
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </Button>

          <div className="flex-1 min-w-0">
            {/* Subject line with status pill on right */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <button
                onClick={onToggle}
                className="text-base font-semibold hover:underline text-left flex-1 min-w-0 truncate"
              >
                {thread.subject}
              </button>
              <Badge className={`${statusConfig.badgeColor} text-xs border flex-shrink-0`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>

            {/* Micro context row */}
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <span>Last reply {formatDistanceToNow(new Date(thread.last_activity_at), { addSuffix: true })}</span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {thread.message_count} {thread.message_count === 1 ? 'message' : 'messages'}
                </span>
                {nextFollowUp && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Calendar className="h-3 w-3" />
                    Follow-up {formatDistanceToNow(new Date(nextFollowUp.due_date), { addSuffix: true })}
                  </span>
                )}
              </div>
              {hasAttachments && (
                <span className="flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  Attachments
                </span>
              )}
            </div>

            {/* Participants chips */}
            <div className="flex items-center gap-1 mt-1">
              {thread.participant_emails.slice(0, 4).map((email, idx) => (
                <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                  {email.split('@')[0]}
                </Badge>
              ))}
              {thread.participant_emails.length > 4 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                  +{thread.participant_emails.length - 4}
                </Badge>
              )}
            </div>
          </div>

          {/* Quick Action Icons (hover) + Dropdown */}
          <div className="flex items-center gap-1">
            {/* Quick actions - fade in on hover */}
            <div className={`flex gap-0.5 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => onReplyInGmail(thread)}
                title="Reply in Gmail"
              >
                <Reply className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => onCreateFollowUp(3)}
                title="Add Follow-up"
              >
                <Clock className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => onMarkClosed(thread.id)}
                title="Mark Closed"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Dropdown menu */}
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onReplyInGmail}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Reply in Gmail
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Calendar className="h-4 w-4 mr-2" />
                  Set Follow-up
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onCreateFollowUp(1)}>
                    In 1 day
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCreateFollowUp(3)}>
                    In 3 days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCreateFollowUp(5)}>
                    In 5 days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCreateFollowUp(7)}>
                    In 7 days
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              {thread.status !== 'closed' && (
                <DropdownMenuItem onClick={onMarkClosed}>
                  <X className="h-4 w-4 mr-2" />
                  Mark Closed
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <UserCircle className="h-4 w-4 mr-2" />
                  Reassign Owner
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {users.map((user) => (
                    <DropdownMenuItem
                      key={user.id}
                      onClick={() => onReassign(thread.id, user.id)}
                    >
                      {user.full_name || user.email}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>

        {/* Expanded Thread Timeline */}
        {isExpanded && (
          <div className="mt-3 ml-7 space-y-2">
            {messages.length > visibleMessages && (
              <Button
                variant="outline"
                size="sm"
                onClick={loadMoreMessages}
                className="w-full mb-2"
              >
                Show earlier ({messages.length - visibleMessages})
              </Button>
            )}

            {messages.slice(0, visibleMessages).map((message, idx) => (
              <MessagePreview
                key={message.id}
                message={message}
                isExpanded={expandedMessages.has(message.id)}
                onToggle={() => {
                  const newExpanded = new Set(expandedMessages);
                  if (newExpanded.has(message.id)) {
                    newExpanded.delete(message.id);
                  } else {
                    newExpanded.add(message.id);
                  }
                  setExpandedMessages(newExpanded);
                }}
                onViewFull={() => setViewMessageModal(message)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MessagePreview({ message, isExpanded, onToggle, onViewFull }) {
  const isOutbound = message.direction === 'outbound';
  const preview = message.body_text?.substring(0, 120) + (message.body_text?.length > 120 ? '...' : '');

  return (
    <div className={`border rounded-lg p-3 ${isOutbound ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={isOutbound ? 'default' : 'secondary'} className="text-xs">
            {isOutbound ? 'Sent' : 'Received'}
          </Badge>
          <span className="font-medium">{message.from_name || message.from_email}</span>
          <span>{formatDistanceToNow(new Date(message.sent_at), { addSuffix: true })}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onViewFull}>
          View full
        </Button>
      </div>
      {!isExpanded && (
        <p className="text-sm text-muted-foreground">{preview}</p>
      )}
      {isExpanded && (
        <div className="text-sm whitespace-pre-wrap mt-2">
          {message.body_text}
        </div>
      )}
    </div>
  );
}
