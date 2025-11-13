import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../api/supabaseClient';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { useToast } from '../ui/use-toast';
import { Loader2, MessageSquare, AtSign } from 'lucide-react';
import { Card } from '../ui/card';

export default function AddNoteDialog({ eventCarrier, open, onOpenChange }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState(null);
  const textareaRef = useRef(null);

  const { data: userProfiles = [] } = useQuery({
    queryKey: ['user_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email')
        .order('first_name');
      if (error) throw error;
      return data;
    },
  });

  const filteredUsers = userProfiles.filter(user => {
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
    const search = mentionSearch.toLowerCase();
    return fullName.includes(search) || user.email.toLowerCase().includes(search);
  });

  const handleTextChange = (e) => {
    const value = e.target.value;
    setNote(value);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
      if (!textAfterAt.includes(' ') && textAfterAt.length <= 30) {
        setMentionSearch(textAfterAt);
        setMentionPosition(lastAtSymbol);
        setShowMentions(true);
        return;
      }
    }

    setShowMentions(false);
  };

  const insertMention = (user) => {
    const beforeMention = note.substring(0, mentionPosition);
    const afterMention = note.substring(textareaRef.current.selectionStart);
    const mention = `@${user.first_name} ${user.last_name}`;
    const newNote = beforeMention + mention + ' ' + afterMention;

    setNote(newNote);
    setShowMentions(false);
    setMentionSearch('');

    setTimeout(() => {
      const newCursorPos = (beforeMention + mention + ' ').length;
      textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      textareaRef.current.focus();
    }, 0);
  };

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!note.trim()) {
        throw new Error('Note cannot be empty');
      }

      const { data: { user } } = await supabase.auth.getUser();

      const mentionPattern = /@([A-Za-z]+)\s+([A-Za-z]+)/g;
      const mentions = [];
      let match;

      while ((match = mentionPattern.exec(note)) !== null) {
        const firstName = match[1];
        const lastName = match[2];
        const mentionedUser = userProfiles.find(
          u => u.first_name.toLowerCase() === firstName.toLowerCase() &&
               u.last_name.toLowerCase() === lastName.toLowerCase()
        );
        if (mentionedUser && !mentions.includes(mentionedUser.id)) {
          mentions.push(mentionedUser.id);
        }
      }

      await supabase.from('customer_carrier_activities').insert({
        customer_id: eventCarrier.csp_event?.customer_id,
        carrier_id: eventCarrier.carrier_id,
        csp_event_id: eventCarrier.csp_event_id,
        csp_event_carrier_id: eventCarrier.id,
        activity_type: 'note',
        description: note,
        user_id: user?.id || '00000000-0000-0000-0000-000000000000',
      });

      await supabase.from('csp_event_carriers').update({
        latest_note: note.length > 100 ? note.substring(0, 100) + '...' : note,
      }).eq('id', eventCarrier.id);

      if (mentions.length > 0) {
        const notificationPromises = mentions.map(mentionedUserId =>
          supabase.from('notifications').insert({
            user_id: mentionedUserId,
            type: 'mention',
            title: 'You were mentioned in a note',
            message: `${eventCarrier.carrier?.name || 'A carrier'} in CSP: ${eventCarrier.csp_event?.title || 'Untitled'}`,
            link: `/pipeline/${eventCarrier.csp_event_id}?tab=carriers`,
            metadata: {
              csp_event_id: eventCarrier.csp_event_id,
              csp_event_carrier_id: eventCarrier.id,
              carrier_id: eventCarrier.carrier_id,
              note_text: note,
              mentioned_by: user?.id,
            },
          })
        );
        await Promise.all(notificationPromises);
      }

      return { mentions };
    },
    onSuccess: ({ mentions }) => {
      queryClient.invalidateQueries(['csp_event_carriers']);
      queryClient.invalidateQueries(['customer_carrier_activities']);
      queryClient.invalidateQueries(['notifications']);

      const mentionText = mentions.length > 0
        ? ` (${mentions.length} user${mentions.length > 1 ? 's' : ''} notified)`
        : '';

      toast({
        title: 'Note Added',
        description: `Note added successfully${mentionText}`,
      });

      setNote('');
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Failed to Add Note',
        description: error.message || 'Failed to add note',
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Add Note
          </DialogTitle>
          <DialogDescription>
            Add a note for {eventCarrier?.carrier?.name}. Use @Name to mention users.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={note}
              onChange={handleTextChange}
              placeholder="Add your note here... Type @ to mention someone"
              rows={6}
              className="resize-none"
            />

            {showMentions && filteredUsers.length > 0 && (
              <Card className="absolute z-10 mt-1 max-h-48 overflow-y-auto w-full shadow-lg">
                {filteredUsers.slice(0, 5).map(user => (
                  <button
                    key={user.id}
                    onClick={() => insertMention(user)}
                    className="w-full px-3 py-2 text-left hover:bg-slate-100 flex items-center gap-2 text-sm"
                  >
                    <AtSign className="w-3 h-3 text-slate-500" />
                    <div>
                      <p className="font-medium">{user.first_name} {user.last_name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </button>
                ))}
              </Card>
            )}
          </div>

          <p className="text-xs text-slate-500">
            This note will appear in the activity timeline and be visible to all team members.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => addNoteMutation.mutate()}
            disabled={!note.trim() || addNoteMutation.isPending}
          >
            {addNoteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Post Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
