import { useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, Heart, Pill, Apple, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { chatService } from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
      await loadMessages();
    };
    checkAuth();
  }, [navigate]);

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
        const formattedMessages = data.map(msg => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          timestamp: new Date(msg.created_at),
        }));
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
        content: m.content 
      }));
      conversationHistory.push({ role: "user", content: userMessage.content });

      const response = await chatService.sendMessage(conversationHistory, 'health');
      
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <div className="flex-1 pt-20 pb-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-gradient-primary p-2 rounded-2xl">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold">AI Health Assistant</h1>
            </div>
            <p className="text-muted-foreground">
              Get instant guidance, verified by healthcare professionals
            </p>
          </motion.div>

          {messages.length === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <p className="text-sm text-muted-foreground mb-3">Quick suggestions:</p>
              <div className="grid grid-cols-2 gap-3">
                {quickSuggestions.map((suggestion, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleQuickSuggestion(suggestion.text)}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 text-left group"
                  >
                    <div className={`p-2 rounded-xl bg-gradient-${suggestion.category === "mental" ? "secondary" : "primary"} group-hover:scale-110 transition-transform`}>
                      <suggestion.icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">{suggestion.text}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          <Card className="flex-1 p-6 mb-6 overflow-y-auto bg-card/30 backdrop-blur-sm border-border/50">
            <div className="space-y-6">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "assistant" && (
                      <div className="bg-gradient-primary p-2 rounded-2xl h-fit shrink-0">
                        <Bot className="h-5 w-5 text-primary-foreground" />
                      </div>
                    )}
                    
                    <div
                      className={`max-w-[80%] p-4 rounded-2xl ${
                        message.role === "user"
                          ? "bg-gradient-primary text-primary-foreground"
                          : "bg-muted/50"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-2">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {message.role === "user" && (
                      <div className="bg-gradient-accent p-2 rounded-2xl h-fit shrink-0">
                        <User className="h-5 w-5 text-accent-foreground" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="bg-gradient-primary p-2 rounded-2xl h-fit">
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="bg-muted/50 p-4 rounded-2xl">
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

          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your health question or wellness concern..."
              className="flex-1 rounded-full px-6 py-6 text-base bg-card/50 backdrop-blur-sm border-border/50 focus-visible:ring-primary"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              size="lg"
              className="rounded-full px-8"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            💡 Important recommendations are automatically reviewed by certified healthcare professionals
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Chat;
