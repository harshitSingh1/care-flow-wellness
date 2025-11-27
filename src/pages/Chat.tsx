import { useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, Heart, Pill, Apple, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your CareForAll health and wellness assistant. I'm here to provide guidance on health concerns, mental wellness support, diet suggestions, and coping strategies. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickSuggestions = [
    { icon: Heart, text: "I'm feeling stressed", category: "mental" },
    { icon: Pill, text: "Home remedy for headache", category: "health" },
    { icon: Apple, text: "Healthy diet suggestions", category: "nutrition" },
    { icon: Brain, text: "Coping strategies for anxiety", category: "mental" },
  ];

  const getAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes("stress") || lowerMessage.includes("anxious")) {
      return "I understand you're feeling stressed. Here are some immediate strategies that can help:\n\n✨ Deep Breathing: Try the 4-7-8 technique - breathe in for 4 seconds, hold for 7, exhale for 8.\n\n🧘 Progressive Muscle Relaxation: Tense and release each muscle group, starting from your toes to your head.\n\n🚶 Take a Short Walk: Even 5 minutes of movement can help reset your nervous system.\n\n💭 Grounding Exercise: Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.\n\nWould you like me to connect you with a mental health professional for ongoing support? (This recommendation will be reviewed by a certified therapist within 2 hours)";
    }
    
    if (lowerMessage.includes("headache")) {
      return "For headache relief, here are some safe home remedies:\n\n💧 Hydration: Drink 2-3 glasses of water slowly. Dehydration is a common cause.\n\n🧊 Cold Compress: Apply to your forehead for 15 minutes.\n\n☕ Caffeine: A small amount can help (but not if you have frequent headaches).\n\n😴 Rest in a Dark, Quiet Room: Reduce sensory stimulation.\n\n🚫 When to Seek Immediate Care:\n- Sudden, severe headache\n- Headache with fever, stiff neck, confusion\n- Headache after head injury\n\nI'll flag this for doctor review to ensure these suggestions are appropriate for your specific situation. The review typically completes within 4 hours.";
    }
    
    if (lowerMessage.includes("diet") || lowerMessage.includes("nutrition")) {
      return "Here's a balanced daily nutrition guide:\n\n🥗 Vegetables & Fruits: 5-7 servings (fill half your plate)\n\n🍚 Whole Grains: Brown rice, quinoa, whole wheat (1/4 of plate)\n\n🥩 Lean Proteins: Fish, chicken, beans, tofu (1/4 of plate)\n\n💧 Hydration: 8-10 glasses of water daily\n\n🥜 Healthy Fats: Nuts, avocado, olive oil (in moderation)\n\n⏰ Meal Timing: 3 balanced meals + 2 small snacks\n\nWould you like personalized recommendations? I can connect you with a certified dietitian who will review your specific needs.";
    }
    
    if (lowerMessage.includes("sleep") || lowerMessage.includes("insomnia")) {
      return "Better sleep starts with good sleep hygiene:\n\n🌙 Consistent Schedule: Same bedtime and wake time daily, even weekends\n\n📱 Screen-Free Zone: No devices 1 hour before bed\n\n🌡️ Cool Room: 60-67°F (15-19°C) is ideal\n\n☕ Caffeine Cutoff: None after 2 PM\n\n🧘 Relaxation Routine: Reading, gentle stretching, or meditation\n\n💡 Dim Lights: Start lowering light levels 2 hours before bed\n\nIf sleep issues persist beyond 2 weeks, I'll recommend consultation with a sleep specialist.";
    }
    
    // Default response
    return "Thank you for sharing that with me. I'm here to help with:\n\n• Health guidance and symptom assessment\n• Mental wellness support and coping strategies\n• Nutrition and lifestyle recommendations\n• Preventive care advice\n\nCould you tell me more specifically what you're experiencing so I can provide the most helpful guidance? Remember, for emergencies, always call 911 or visit your nearest emergency room.";
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getAIResponse(input),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
      
      // Save to localStorage
      const savedChats = JSON.parse(localStorage.getItem("careforall_chats") || "[]");
      savedChats.push(userMessage, aiResponse);
      localStorage.setItem("careforall_chats", JSON.stringify(savedChats));
    }, 1500);
  };

  const handleQuickSuggestion = (text: string) => {
    setInput(text);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <div className="flex-1 pt-20 pb-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col max-w-4xl">
          {/* Header */}
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

          {/* Quick Suggestions */}
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

          {/* Messages */}
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

          {/* Input */}
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
