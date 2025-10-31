import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { useToast } from '../ui/use-toast';
import { MessageCircle, Send, X, Minimize2, Maximize2, Loader2, Sparkles, AlertCircle, CheckCircle2, MessageSquarePlus } from 'lucide-react';
import { supabase } from '../../api/supabaseClient';
import { Customer, Carrier } from '../../api/entities';
import { useQuery } from '@tanstack/react-query';
import FeedbackDialog from '../feedback/FeedbackDialog';

function FormattedMessage({ content }) {
  const formatContent = (text) => {
    const lines = text.split('\n');
    const formatted = [];
    let inList = false;
    let listItems = [];

    const flushList = () => {
      if (listItems.length > 0) {
        formatted.push(
          <ul key={`list-${formatted.length}`} className="space-y-2 my-3 ml-4">
            {listItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span className="flex-1">{item}</span>
              </li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, idx) => {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('**⚠️') || trimmedLine.includes('DATA QUALITY ALERT')) {
        flushList();
        const cleanText = trimmedLine.replace(/\*\*/g, '');
        formatted.push(
          <div key={`alert-${idx}`} className="flex items-start gap-2 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-r my-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-amber-900">{cleanText}</p>
          </div>
        );
      } else if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
        flushList();
        const text = trimmedLine.replace(/\*\*/g, '');
        formatted.push(
          <h4 key={`heading-${idx}`} className="font-semibold text-slate-900 mt-4 mb-2 text-sm">
            {text}
          </h4>
        );
      } else if (trimmedLine.match(/^\d+\.\s+\*\*/)) {
        flushList();
        const match = trimmedLine.match(/^(\d+)\.\s+\*\*(.+?)\*\*:?(.*)$/);
        if (match) {
          formatted.push(
            <div key={`numbered-${idx}`} className="my-3">
              <div className="flex items-start gap-3">
                <Badge variant="default" className="h-6 w-6 p-0 flex items-center justify-center flex-shrink-0">
                  {match[1]}
                </Badge>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm">{match[2]}</p>
                  {match[3] && <p className="text-sm text-slate-600 mt-1">{match[3]}</p>}
                </div>
              </div>
            </div>
          );
        }
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ')) {
        const itemText = trimmedLine.substring(2);
        listItems.push(itemText);
        inList = true;
      } else if (trimmedLine === '') {
        flushList();
        if (formatted.length > 0 && formatted[formatted.length - 1]?.type !== 'br') {
          formatted.push(<br key={`br-${idx}`} />);
        }
      } else {
        flushList();
        formatted.push(
          <p key={`text-${idx}`} className="text-sm text-slate-700 leading-relaxed my-2">
            {trimmedLine}
          </p>
        );
      }
    });

    flushList();
    return formatted;
  };

  return <div className="space-y-1">{formatContent(content)}</div>;
}

export function DashboardChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const scrollRef = useRef(null);
  const { toast } = useToast();

  const { data: rawCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => Customer.list(),
  });

  const { data: rawCarriers } = useQuery({
    queryKey: ['carriers'],
    queryFn: () => Carrier.list(),
  });

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const getFirstName = () => {
    if (!currentUser?.email) return '';
    const emailPrefix = currentUser.email.split('@')[0];
    return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
  };

  const toArray = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.data && Array.isArray(data.data)) return data.data;
    return [];
  };

  const customers = toArray(rawCustomers);
  const carriers = toArray(rawCarriers);

  const checkDataQuality = () => {
    const issues = [];

    const customersWithMissingInfo = customers.filter(c => !c.name || !c.contact_name || !c.contact_email);
    if (customersWithMissingInfo.length > 0) {
      issues.push(`${customersWithMissingInfo.length} customer${customersWithMissingInfo.length > 1 ? 's have' : ' has'} incomplete contact information`);
    }

    const carriersWithMissingInfo = carriers.filter(c => !c.name || !c.scac || !c.contact_email);
    if (carriersWithMissingInfo.length > 0) {
      issues.push(`${carriersWithMissingInfo.length} carrier${carriersWithMissingInfo.length > 1 ? 's are' : ' is'} missing SCAC codes or contact details`);
    }

    return issues;
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const dataQualityIssues = checkDataQuality();
      let enhancedMessage = userMessage;

      if (userMessage.toLowerCase().includes('data quality') ||
          userMessage.toLowerCase().includes('what should i') ||
          userMessage.toLowerCase().includes('clean up')) {
        if (dataQualityIssues.length > 0) {
          enhancedMessage = `${userMessage}. IMPORTANT DATA QUALITY ISSUES FOUND: ${dataQualityIssues.join(', ')}. Please provide specific guidance on where to fix these in the UI (e.g., "Go to Customers page, find rows with missing contact info").`;
        }
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dashboard-chat`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: enhancedMessage,
          conversationHistory: messages.slice(-6),
          userName: getFirstName(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || 'Sorry, I could not generate a response.'
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message. Please try again.',
        variant: 'destructive',
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedQuestions = [
    "What should I focus on today?",
    "How do I start a new CSP bid?",
    "Show me my top customers",
    "Where do I find expiring tariffs?",
    "Any data quality issues?",
    "How does the workflow work?"
  ];

  const feedbackOption = {
    text: "Submit Feedback or Report Issue",
    icon: MessageSquarePlus,
    action: () => setFeedbackOpen(true)
  };

  const handleSuggestedQuestion = (question) => {
    setMessage(question);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
        size="icon"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <Card className="fixed bottom-6 right-6 w-80 shadow-xl z-50">
        <CardHeader className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <CardTitle className="text-base">Freight AI Assistant</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(false)}
                className="h-8 w-8 text-white hover:bg-blue-800"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-white hover:bg-blue-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const firstName = getFirstName();

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl flex flex-col z-50 border-2 border-blue-100">
      <CardHeader className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <CardTitle className="text-base font-semibold">Freight AI Assistant</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(true)}
              className="h-8 w-8 text-white hover:bg-blue-800"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-white hover:bg-blue-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-blue-600" />
                  </div>
                  <p className="text-base text-slate-700 font-medium mb-2">
                    {firstName ? `Hi ${firstName}!` : 'Hi!'} I can help you understand your transportation data.
                  </p>
                  <p className="text-sm text-slate-500">Try asking me:</p>
                </div>
                <div className="space-y-2">
                  {suggestedQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestedQuestion(question)}
                      className="w-full text-left px-4 py-3 text-sm bg-white hover:bg-blue-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-all shadow-sm hover:shadow"
                    >
                      {question}
                    </button>
                  ))}
                  <button
                    onClick={feedbackOption.action}
                    className="w-full text-left px-4 py-3 text-sm bg-gradient-to-r from-green-50 to-blue-50 hover:from-green-100 hover:to-blue-100 rounded-lg border-2 border-green-200 hover:border-green-300 transition-all shadow-sm hover:shadow flex items-center gap-2 font-medium text-green-900"
                  >
                    <MessageSquarePlus className="w-4 h-4" />
                    {feedbackOption.text}
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-900 shadow-sm'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <FormattedMessage content={msg.content} />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex-shrink-0 pt-4 border-t mt-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ask about your data..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
              size="icon"
              className="flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Powered by AI • Customize in Settings
          </p>
        </div>
      </CardContent>
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </Card>
  );
}
