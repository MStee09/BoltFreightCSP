import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CSPEventCarrier } from '../../api/entities';
import { useToast } from '../ui/use-toast';
import { Save, X, MessageSquare, AtSign } from 'lucide-react';
import { supabase } from '../../api/supabaseClient';
import { Card } from '../ui/card';

export default function InlineNoteEditor({ carrierAssignment, onCancel }) {
  const [note, setNote] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState(null);
  const textareaRef = useRef(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

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

  const saveNoteMutation = useMutation({
    mutationFn: async () => {
      const currentNotes = carrierAssignment.notes || '';
      const timestamp = new Date().toISOString();
      const { data: { user } } = await supabase.auth.getUser();

      const newNote = `[${new Date(timestamp).toLocaleString()}] ${note}`;
      const updatedNotes = currentNotes ? `${currentNotes}\n${newNote}` : newNote;

      await CSPEventCarrier.update(carrierAssignment.id, {
        notes: updatedNotes
      });

      await supabase.from('activity_timeline').insert({
        entity_type: 'csp_event_carrier',
        entity_id: carrierAssignment.id,
        activity_type: 'note_added',
        user_id: user?.id,
        details: { note, carrier_id: carrierAssignment.carrier_id }
      });

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

      if (mentions.length > 0) {
        const notificationPromises = mentions.map(mentionedUserId =>
          supabase.from('notifications').insert({
            user_id: mentionedUserId,
            type: 'mention',
            title: 'You were mentioned in a note',
            message: `CSP Carrier assignment note`,
            link: `/pipeline/${carrierAssignment.csp_event_id}?tab=carriers`,
            metadata: {
              csp_event_id: carrierAssignment.csp_event_id,
              csp_event_carrier_id: carrierAssignment.id,
              carrier_id: carrierAssignment.carrier_id,
              note_text: note,
              mentioned_by: user?.id,
            },
          })
        );
        await Promise.all(notificationPromises);
      }

      return { updatedNotes, mentions };
    },
    onSuccess: ({ mentions }) => {
      queryClient.invalidateQueries(['csp_event_carriers']);
      queryClient.invalidateQueries(['notifications']);

      const mentionText = mentions.length > 0
        ? ` (${mentions.length} user${mentions.length > 1 ? 's' : ''} notified)`
        : '';

      toast({ title: `Note added successfully${mentionText}` });
      onCancel();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add note',
        variant: 'destructive'
      });
    }
  });

  const handleSave = () => {
    if (!note.trim()) {
      toast({ title: 'Note cannot be empty', variant: 'destructive' });
      return;
    }
    saveNoteMutation.mutate();
  };

  return (
    <div className="border-t pt-3 mt-3">
      <div className="flex items-start gap-2 mb-2">
        <MessageSquare className="w-4 h-4 text-slate-400 mt-1" />
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={note}
            onChange={handleTextChange}
            placeholder="Add a note... Type @ to mention team members"
            rows={2}
            className="text-sm"
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
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={saveNoteMutation.isPending}
        >
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saveNoteMutation.isPending || !note.trim()}
        >
          <Save className="w-3 h-3 mr-1" />
          {saveNoteMutation.isPending ? 'Saving...' : 'Save Note'}
        </Button>
      </div>
    </div>
  );
}
