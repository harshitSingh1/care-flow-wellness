import { useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, Heart, Pill, Apple, Brain, AlertTriangle, Stethoscope, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { chatService } from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type StructuredResponse = {
  summary: string;
  remedies: string[];
  precautions: string;
  consultDoctor: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  structured?: StructuredResponse;
  timestamp: Date;
};

type SelectedRemedies = {
  [messageId: string]: string[];
};

const parseStructuredContent = (content: string): StructuredResponse | null => {
  try {
    const parsed = JSON.parse(content);
    if (parsed.summary && Array.isArray(parsed.remedies)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedRemedies, setSelectedRemedies] = useState<SelectedRemedies>({});
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setIsAuthenticated(true);
      setUserId(user.id);
      await loadMessages();
      await loadSelectedRemedies(user.id);
    };
    checkAuth();
  }, [navigate]);

  const loadSelectedRemedies = async (uid: string) => {
    const { data, error } = await supabase
      .from('selected_remedies')
      .select('*')
      .eq('user_id', uid);
    
    if (!error && data) {
      const grouped: SelectedRemedies = {};
      data.forEach(item => {
        if (!grouped[item.message_id]) {
          grouped[item.message_id] = [];
        }
        grouped[item.message_id].push(item.remedy_text);
      });
      setSelectedRemedies(grouped);
    }
  };

  const loadMessages = async () => {
    try {
      const data = await chatService.getMessages('health');
      if (data.length === 0) {
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: "Hello! I'm your CareForAll health and wellness assistant. I'm here to provide guidance on health concerns, mental wellness support, diet suggestions, and coping strategies. How can I help you today?",
            timestamp: new Date(),
          },
        ]);
      } else {
        const formattedMessages = data.map(msg => {
          const structured = msg.role === 'assistant' ? parseStructuredContent(msg.content) : null;
          return {
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            structured: structured || undefined,
            timestamp: new Date(msg.created_at),
          };
        });
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  };

  const handleRemedyToggle = async (messageId: string, remedy: string, checked: boolean) => {
    if (!userId) return;

    if (checked) {
      // Add selection
      const { error } = await supabase.from('selected_remedies').insert({
        user_id: userId,
        message_id: messageId,
        remedy_text: remedy,
      });
      
      if (!error) {
        setSelectedRemedies(prev => ({
          ...prev,
          [messageId]: [...(prev[messageId] || []), remedy]
        }));
        toast({ title: "Remedy saved", description: "Your selection has been recorded." });
      }
    } else {
      // Remove selection
      const { error } = await supabase
        .from('selected_remedies')
        .delete()
        .eq('user_id', userId)
        .eq('message_id', messageId)
        .eq('remedy_text', remedy);
      
      if (!error) {
        setSelectedRemedies(prev => ({
          ...prev,
          [messageId]: (prev[messageId] || []).filter(r => r !== remedy)
        }));
      }
    }
  };

  const quickSuggestions = [
    { icon: Heart, text: "I'm feeling stressed", category: "mental" },
    { icon: Pill, text: "Home remedy for headache", category: "health" },
    { icon: Apple, text: "Healthy diet suggestions", category: "nutrition" },
    { icon: Brain, text: "Coping strategies for anxiety", category: "mental" },
  ];

  const handleSend = async () => {
    if (!input.trim() || !isAuthenticated) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const conversationHistory = messages.map(m => ({ 
        role: m.role, 
        content: m.structured ? JSON.stringify(m.structured) : m.content 
      }));
      conversationHistory.push({ role: "user", content: userMessage.content });

      await chatService.sendMessage(conversationHistory, 'health');
      await loadMessages();
      
      toast({
        title: "Response received",
        description: "AI has provided guidance based on your question.",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickSuggestion = (text: string) => {
    setInput(text);
  };

  const renderStructuredResponse = (message: Message) => {
    const { structured, id } = message;
    if (!structured) return null;

    const selected = selectedRemedies[id] || [];

    return (
      <div className="space-y-4">
        {/* Summary */}
        <div>
          <p className="text-sm sm:text-base leading-relaxed">{structured.summary}</p>
        </div>

        {/* Remedies */}
        {structured.remedies.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Pill className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Possible Remedies</span>
            </div>
            <div className="space-y-2">
              {structured.remedies.map((remedy, idx) => (
                <Card 
                  key={idx} 
                  className={`p-3 cursor-pointer transition-all ${
                    selected.includes(remedy) 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border/50 hover:border-primary/50'
                  }`}
                  onClick={() => handleRemedyToggle(id, remedy, !selected.includes(remedy))}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      checked={selected.includes(remedy)}
                      onCheckedChange={(checked) => handleRemedyToggle(id, remedy, !!checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-sm flex-1">{remedy}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Precautions */}
        {structured.precautions && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Precautions</span>
            </div>
            <p className="text-sm text-muted-foreground">{structured.precautions}</p>
          </div>
        )}

        {/* When to Consult Doctor */}
        {structured.consultDoctor && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">When to Consult a Doctor</span>
            </div>
            <p className="text-sm text-muted-foreground">{structured.consultDoctor}</p>
          </div>
        )}
      </div>
    );
  };

  const renderPlainMessage = (content: string) => {
    return <p className="text-sm sm:text-base leading-relaxed">{content}</p>;
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Navbar />
      
      <div className="flex-1 pt-20 pb-4 flex flex-col overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col max-w-4xl flex-1 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 shrink-0"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-gradient-primary p-2 rounded-2xl">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">AI Health Assistant</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Get instant guidance, verified by healthcare professionals
            </p>
          </motion.div>

          {messages.length === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 shrink-0"
            >
              <p className="text-sm text-muted-foreground mb-3">Quick suggestions:</p>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {quickSuggestions.map((suggestion, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleQuickSuggestion(suggestion.text)}
                    className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 text-left group"
                  >
                    <div className={`p-2 rounded-xl bg-gradient-${suggestion.category === "mental" ? "secondary" : "primary"} group-hover:scale-110 transition-transform`}>
                      <suggestion.icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium">{suggestion.text}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          <Card className="flex-1 p-4 sm:p-6 mb-4 overflow-hidden bg-card/30 backdrop-blur-sm border-border/50 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-6">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex gap-2 sm:gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "assistant" && (
                      <div className="bg-gradient-primary p-2 rounded-2xl h-fit shrink-0">
                        <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
                      </div>
                    )}
                    
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] p-3 sm:p-4 rounded-2xl ${
                        message.role === "user"
                          ? "bg-gradient-primary text-primary-foreground"
                          : "bg-muted/50"
                      }`}
                    >
                      {message.role === "assistant" && message.structured 
                        ? renderStructuredResponse(message)
                        : renderPlainMessage(message.content)
                      }
                      <p className="text-xs opacity-70 mt-2">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {message.role === "user" && (
                      <div className="bg-gradient-accent p-2 rounded-2xl h-fit shrink-0">
                        <User className="h-4 w-4 sm:h-5 sm:w-5 text-accent-foreground" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2 sm:gap-3"
                >
                  <div className="bg-gradient-primary p-2 rounded-2xl h-fit">
                    <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
                  </div>
                  <div className="bg-muted/50 p-3 sm:p-4 rounded-2xl">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </Card>

          <div className="flex gap-2 sm:gap-3 shrink-0">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your health question..."
              className="flex-1 rounded-full px-4 sm:px-6 py-5 sm:py-6 text-sm sm:text-base bg-card/50 backdrop-blur-sm border-border/50 focus-visible:ring-primary"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              size="lg"
              className="rounded-full px-6 sm:px-8"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-3 shrink-0">
            💡 Important recommendations are reviewed by certified healthcare professionals
          </p>
        </div>
      </div>
    </div>
  );
};

export default Chat;