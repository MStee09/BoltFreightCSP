import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandGroup, CommandItem, CommandList, CommandEmpty } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Send, X, FileText, Minimize2, Maximize2, ExternalLink, Calendar,
  CheckSquare, Settings, Eye, ChevronDown, Mail, Building2, User
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { Customer, Carrier, CSPEventCarrier, CarrierContact, CSPEvent } from '@/api/entities';

export function FloatingEmailComposer({
  draftId,
  cspEvent,
  customer,
  carrier,
  initialTo = [],
  initialSubject = '',
  initialBody = '',
  inReplyTo = null,
  threadId = null,
  isFollowUp = false,
  onClose,
  onMinimize,
  position = { x: null, y: null },
  zIndex = 1000,
}) {
  const queryClient = useQueryClient();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [windowPosition, setWindowPosition] = useState({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({ width: 550, height: 650 });

  const [toEmails, setToEmails] = useState(initialTo);
  const [ccEmails, setCcEmails] = useState([]);
  const [toInput, setToInput] = useState('');
  const [ccInput, setCcInput] = useState('');
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [sending, setSending] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('general');
  const [templates, setTemplates] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [createFollowUp, setCreateFollowUp] = useState(false);
  const [followUpDays, setFollowUpDays] = useState(3);
  const [showCc, setShowCc] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [suggestedContacts, setSuggestedContacts] = useState([]);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [fullCspEvent, setFullCspEvent] = useState(null);

  const composerRef = useRef(null);
  const autosaveTimerRef = useRef(null);

  // Calculate initial position (bottom-right corner)
  useEffect(() => {
    if (position.x === null || position.y === null) {
      const x = window.innerWidth - windowSize.width - 20;
      const y = window.innerHeight - (isMinimized ? 50 : windowSize.height) - 20;
      setWindowPosition({ x, y });
    } else {
      setWindowPosition(position);
    }
  }, []);

  // Load draft if draftId provided
  useEffect(() => {
    if (draftId) {
      loadDraft(draftId);
    } else {
      generateTrackingCode();
    }
  }, [draftId]);

  // Load user profile and templates
  useEffect(() => {
    loadUserProfile();
    loadTemplates();
  }, []);

  // Load full CSP event data
  useEffect(() => {
    if (cspEvent?.id) {
      loadFullCspEvent();
    }
  }, [cspEvent?.id]);

  // Load suggested contacts from CSP event
  useEffect(() => {
    if (fullCspEvent) {
      loadSuggestedContacts();
    }
  }, [fullCspEvent]);

  // Auto-CC CSP owner
  useEffect(() => {
    if (fullCspEvent?.assigned_to && !ccEmails.includes(fullCspEvent.assigned_to)) {
      setCcEmails([fullCspEvent.assigned_to]);
      setShowCc(true);
    }
  }, [fullCspEvent?.assigned_to]);

  // Autosave draft every 10 seconds
  useEffect(() => {
    if (subject || body || toEmails.length > 0) {
      autosaveTimerRef.current = setTimeout(() => {
        saveDraft();
      }, 10000);
    }

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [subject, body, toEmails, ccEmails]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleMinimize();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [subject, body, toEmails]);

  const loadDraft = async (id) => {
    try {
      const { data, error } = await supabase
        .from('email_drafts')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        setToEmails(data.to_emails || []);
        setCcEmails(data.cc_emails || []);
        setSubject(data.subject || '');
        setBody(data.body || '');
        setTrackingCode(data.tracking_code || '');
        setIsMinimized(data.is_minimized || false);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const saveDraft = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const draftData = {
        user_id: user.id,
        csp_event_id: cspEvent?.id,
        customer_id: customer?.id,
        carrier_id: carrier?.id,
        to_emails: toEmails,
        cc_emails: ccEmails,
        subject,
        body,
        tracking_code: trackingCode,
        in_reply_to: inReplyTo,
        thread_id: threadId,
        is_minimized: isMinimized,
      };

      if (draftId) {
        await supabase
          .from('email_drafts')
          .update(draftData)
          .eq('id', draftId);
      } else {
        const { data } = await supabase
          .from('email_drafts')
          .insert(draftData)
          .select()
          .single();

        // Update draftId if newly created
        if (data) {
          // Could emit event to parent to update draftId
        }
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const loadFullCspEvent = async () => {
    try {
      if (!cspEvent?.id) return;
      const eventData = await CSPEvent.get(cspEvent.id);
      setFullCspEvent(eventData);
    } catch (error) {
      console.error('Error loading full CSP event:', error);
    }
  };

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setUserProfile(profile);
        if (profile.email) {
          setUserEmail(profile.email);
        }
      }

      // Fallback to Gmail credentials if email not in profile
      if (!profile?.email) {
        const { data: credentials } = await supabase
          .from('user_gmail_credentials')
          .select('email_address')
          .eq('user_id', user.id)
          .maybeSingle();

        if (credentials) {
          setUserEmail(credentials.email_address);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadSuggestedContacts = async () => {
    try {
      const contacts = [];

      // Get customer contact
      if (customer?.id) {
        const customerData = await Customer.get(customer.id);
        if (customerData?.email) {
          contacts.push({
            email: customerData.email,
            name: customerData.name,
            type: 'customer',
            label: `${customerData.name} (Customer)`
          });
        }
      }

      // Get carriers assigned to this CSP event
      if (fullCspEvent?.id) {
        const assignments = await CSPEventCarrier.filter({ csp_event_id: fullCspEvent.id });
        const carrierIds = assignments.map(a => a.carrier_id);

        for (const carrierId of carrierIds) {
          const carrierData = await Carrier.get(carrierId);
          if (carrierData?.contact_email) {
            contacts.push({
              email: carrierData.contact_email,
              name: carrierData.name,
              type: 'carrier',
              label: `${carrierData.name} (Carrier)`,
              scac: carrierData.scac_code
            });
          }

          // Get carrier contacts
          const carrierContacts = await CarrierContact.filter({ carrier_id: carrierId });
          carrierContacts.forEach(contact => {
            if (contact.email) {
              contacts.push({
                email: contact.email,
                name: contact.name,
                type: 'carrier_contact',
                label: `${contact.name} (${carrierData.name})`,
                carrierName: carrierData.name
              });
            }
          });
        }
      }

      // Single carrier mode
      if (carrier?.id) {
        const carrierData = await Carrier.get(carrier.id);
        if (carrierData?.contact_email) {
          contacts.push({
            email: carrierData.contact_email,
            name: carrierData.name,
            type: 'carrier',
            label: `${carrierData.name} (Carrier)`,
            scac: carrierData.scac_code
          });
        }

        // Get carrier contacts
        const carrierContacts = await CarrierContact.filter({ carrier_id: carrier.id });
        carrierContacts.forEach(contact => {
          if (contact.email) {
            contacts.push({
              email: contact.email,
              name: contact.name,
              type: 'carrier_contact',
              label: `${contact.name} (${carrierData.name})`,
              carrierName: carrierData.name
            });
          }
        });
      }

      // Remove duplicates
      const uniqueContacts = contacts.filter((contact, index, self) =>
        index === self.findIndex(c => c.email === contact.email)
      );

      setSuggestedContacts(uniqueContacts);
    } catch (error) {
      console.error('Error loading suggested contacts:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data } = await supabase
        .from('email_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (data) {
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const generateTrackingCode = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    setTrackingCode(`CSP-${timestamp}-${random}`);
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
    saveDraft();
    if (onMinimize) {
      onMinimize();
    }
  };

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
    if (!isMaximized) {
      setWindowSize({ width: window.innerWidth - 40, height: window.innerHeight - 100 });
      setWindowPosition({ x: 20, y: 50 });
    } else {
      setWindowSize({ width: 550, height: 650 });
      const x = window.innerWidth - 570;
      const y = window.innerHeight - 670;
      setWindowPosition({ x, y });
    }
  };

  const handleClose = async () => {
    if (subject || body || toEmails.length > 0) {
      const confirmed = window.confirm('Discard unsent email?');
      if (!confirmed) return;
    }

    if (draftId) {
      await supabase.from('email_drafts').delete().eq('id', draftId);
    }

    if (onClose) {
      onClose();
    }
  };

  const handleMouseDown = (e) => {
    if (isMaximized) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - windowPosition.x,
      y: e.clientY - windowPosition.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setWindowPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const addEmail = (email, type) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (type === 'to') {
      if (!toEmails.includes(trimmedEmail)) {
        setToEmails([...toEmails, trimmedEmail]);
      }
      setToInput('');
      setShowContactDropdown(false);
    } else {
      if (!ccEmails.includes(trimmedEmail)) {
        setCcEmails([...ccEmails, trimmedEmail]);
      }
      setCcInput('');
    }
  };

  const addContactFromSuggestion = (contact) => {
    addEmail(contact.email, 'to');
  };

  const removeEmail = (email, type) => {
    if (type === 'to') {
      setToEmails(toEmails.filter(e => e !== email));
    } else {
      setCcEmails(ccEmails.filter(e => e !== email));
    }
  };

  const handleKeyDown = (e, type) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const input = type === 'to' ? toInput : ccInput;
      addEmail(input, type);
    }
  };

  const handleSend = async () => {
    if (toEmails.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }

    if (!subject.trim()) {
      toast.error('Please add a subject');
      return;
    }

    if (!body.trim()) {
      toast.error('Please add a message');
      return;
    }

    setSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          trackingCode,
          to: toEmails,
          cc: ccEmails,
          subject,
          body,
          cspEventId: cspEvent?.id,
          customerId: customer?.id,
          carrierId: carrier?.id,
          inReplyTo,
          threadId,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      const result = await response.json();

      // Create follow-up task if requested
      if (createFollowUp && result.success) {
        try {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + followUpDays);

          await supabase.from('email_follow_up_tasks').insert({
            thread_id: result.threadId || trackingCode,
            email_activity_id: result.emailActivityId,
            csp_event_id: cspEvent?.id,
            customer_id: customer?.id,
            carrier_id: carrier?.id,
            assigned_to: user.id,
            created_by: user.id,
            title: `Follow up: ${subject}`,
            description: `Follow up on email sent to ${toEmails.join(', ')}`,
            due_date: dueDate.toISOString(),
            auto_close_on_reply: true
          });

          toast.success(`Email sent with follow-up task due in ${followUpDays} ${followUpDays === 1 ? 'day' : 'days'}`);
        } catch (taskError) {
          console.error('Error creating follow-up task:', taskError);
          toast.success('Email sent (follow-up task creation failed)');
        }
      } else {
        toast.success('Email sent successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['email_activities'] });
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['email_follow_up_tasks'] });

      // Delete draft
      if (draftId) {
        await supabase.from('email_drafts').delete().eq('id', draftId);
      }

      // Close composer
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const getContextInfo = () => {
    const parts = [];
    if (cspEvent) parts.push(`CSP: ${cspEvent.title}`);
    if (customer) parts.push(`Customer: ${customer.name}`);
    if (carrier) parts.push(`Carrier: ${carrier.name}`);
    return parts.join(' • ') || 'New Email';
  };

  if (isMinimized) {
    return (
      <div
        ref={composerRef}
        className="fixed bg-white border border-gray-300 rounded-t-lg shadow-lg"
        style={{
          left: windowPosition.x,
          top: window.innerHeight - 50,
          width: windowSize.width,
          zIndex,
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-2 bg-gray-100 cursor-move hover:bg-gray-200"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm font-medium truncate">{subject || 'New Email'}</span>
            <span className="text-xs text-muted-foreground">{toEmails.length > 0 ? `To: ${toEmails[0]}` : ''}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleMinimize}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={composerRef}
      className="fixed bg-white border border-gray-300 rounded-lg shadow-2xl flex flex-col"
      style={{
        left: windowPosition.x,
        top: windowPosition.y,
        width: windowSize.width,
        height: windowSize.height,
        zIndex,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b cursor-move hover:bg-gray-200 rounded-t-lg"
        onMouseDown={handleMouseDown}
      >
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-sm font-medium">New Message</span>
          <span className="text-xs text-muted-foreground truncate">{getContextInfo()}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleMinimize}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleMaximize}
          >
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* To Field with Contact Suggestions */}
        <div className="space-y-1">
          <Label htmlFor="to-emails" className="text-xs">To</Label>
          <div className="relative">
            <div className="flex flex-wrap gap-1 p-2 border rounded-md min-h-[36px]">
              {toEmails.map((email) => (
                <Badge key={email} variant="secondary" className="gap-1 text-xs">
                  {email}
                  <button
                    type="button"
                    onClick={() => removeEmail(email, 'to')}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <input
                id="to-emails"
                type="text"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'to')}
                onBlur={() => {
                  setTimeout(() => {
                    if (toInput) addEmail(toInput, 'to');
                    setShowContactDropdown(false);
                  }, 200);
                }}
                onFocus={() => suggestedContacts.length > 0 && setShowContactDropdown(true)}
                placeholder="Add recipient..."
                className="flex-1 min-w-[120px] outline-none bg-transparent text-sm"
              />
              {suggestedContacts.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowContactDropdown(!showContactDropdown)}
                  className="h-auto p-1 ml-1"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Contact Dropdown */}
            {showContactDropdown && suggestedContacts.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2">
                  <p className="text-xs text-slate-500 font-medium mb-2 px-2">Suggested Contacts</p>
                  <div className="space-y-1">
                    {suggestedContacts.map((contact, index) => (
                      <button
                        key={`${contact.email}-${index}`}
                        type="button"
                        onClick={() => addContactFromSuggestion(contact)}
                        disabled={toEmails.includes(contact.email)}
                        className={`w-full text-left px-2 py-2 rounded-md text-sm hover:bg-slate-100 transition-colors flex items-center gap-2 ${
                          toEmails.includes(contact.email) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {contact.type === 'customer' ? (
                          <Building2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        ) : (
                          <User className="h-4 w-4 text-green-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 truncate">{contact.name}</div>
                          <div className="text-xs text-slate-500 truncate">{contact.email}</div>
                        </div>
                        {contact.scac && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {contact.scac}
                          </Badge>
                        )}
                        {toEmails.includes(contact.email) && (
                          <span className="text-xs text-slate-400 flex-shrink-0">Added</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CC Field (toggle) */}
        {!showCc && (
          <Button
            variant="link"
            size="sm"
            onClick={() => setShowCc(true)}
            className="h-auto p-0 text-xs"
          >
            + CC
          </Button>
        )}

        {showCc && (
          <div className="space-y-1">
            <Label htmlFor="cc-emails" className="text-xs">CC</Label>
            <div className="flex flex-wrap gap-1 p-2 border rounded-md min-h-[36px]">
              {ccEmails.map((email) => (
                <Badge key={email} variant="secondary" className="gap-1 text-xs">
                  {email}
                  <button
                    type="button"
                    onClick={() => removeEmail(email, 'cc')}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <input
                id="cc-emails"
                type="text"
                value={ccInput}
                onChange={(e) => setCcInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'cc')}
                onBlur={() => ccInput && addEmail(ccInput, 'cc')}
                placeholder="Add CC..."
                className="flex-1 min-w-[120px] outline-none bg-transparent text-sm"
              />
            </div>
          </div>
        )}

        {/* Subject */}
        <div className="space-y-1">
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="font-semibold border-0 border-b rounded-none px-0 focus-visible:ring-0"
          />
        </div>

        {/* Body */}
        <div className="flex-1">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Compose your message..."
            className="min-h-[300px] resize-none border-0 px-0 focus-visible:ring-0"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={handleSend} disabled={sending} size="sm">
              <Send className="h-3 w-3 mr-1" />
              {sending ? 'Sending...' : 'Send'}
            </Button>

            {/* Templates */}
            <Button variant="outline" size="sm" onClick={() => setShowTemplates(!showTemplates)}>
              <FileText className="h-3 w-3 mr-1" />
              Templates
            </Button>

            {/* Follow-up */}
            {!inReplyTo && (
              <Button variant="outline" size="sm" onClick={() => setShowFollowUp(!showFollowUp)}>
                <Calendar className="h-3 w-3 mr-1" />
                Follow-up
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Track Reply: ✓</span>
          </div>
        </div>

        {/* Follow-up options */}
        {showFollowUp && !inReplyTo && (
          <div className="border-t pt-2 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="create-followup-float"
                checked={createFollowUp}
                onChange={(e) => setCreateFollowUp(e.target.checked)}
              />
              <Label htmlFor="create-followup-float" className="text-xs cursor-pointer">
                Create follow-up task
              </Label>
            </div>

            {createFollowUp && (
              <div className="flex gap-1">
                {[1, 3, 5, 7].map((days) => (
                  <Button
                    key={days}
                    type="button"
                    size="sm"
                    variant={followUpDays === days ? 'default' : 'outline'}
                    onClick={() => setFollowUpDays(days)}
                    className="text-xs"
                  >
                    {days}d
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
