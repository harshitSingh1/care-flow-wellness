import { useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  Heart, 
  Leaf, 
  Moon, 
  Sun, 
  Droplets,
  Wind,
  Music,
  BookOpen,
  Dumbbell,
  Coffee,
  Apple,
  Clock,
  Sparkles
} from "lucide-react";

interface Strategy {
  id: string;
  title: string;
  description: string;
  duration: string;
  icon: React.ReactNode;
  category: 'mental' | 'physical' | 'nutrition' | 'sleep';
  difficulty: 'easy' | 'medium' | 'advanced';
}

const strategies: Strategy[] = [
  // Mental Wellness
  {
    id: '1',
    title: '4-7-8 Breathing Technique',
    description: 'Inhale for 4 seconds, hold for 7 seconds, exhale for 8 seconds. This activates your parasympathetic nervous system and reduces anxiety.',
    duration: '5 min',
    icon: <Wind className="w-6 h-6" />,
    category: 'mental',
    difficulty: 'easy',
  },
  {
    id: '2',
    title: 'Gratitude Journaling',
    description: 'Write down 3 things you\'re grateful for today. This simple practice rewires your brain for positivity and improves mental wellbeing.',
    duration: '10 min',
    icon: <BookOpen className="w-6 h-6" />,
    category: 'mental',
    difficulty: 'easy',
  },
  {
    id: '3',
    title: 'Body Scan Meditation',
    description: 'Progressively relax each part of your body from head to toe. Helps release physical tension and promotes mindfulness.',
    duration: '15 min',
    icon: <Sparkles className="w-6 h-6" />,
    category: 'mental',
    difficulty: 'medium',
  },
  {
    id: '4',
    title: 'Mindful Music Listening',
    description: 'Listen to calming music while focusing solely on the sounds. Let go of thoughts and immerse yourself in the melody.',
    duration: '20 min',
    icon: <Music className="w-6 h-6" />,
    category: 'mental',
    difficulty: 'easy',
  },
  
  // Physical Wellness
  {
    id: '5',
    title: 'Morning Stretching Routine',
    description: 'Gentle stretches to wake up your body. Focus on neck, shoulders, back, and legs. Improves flexibility and blood circulation.',
    duration: '10 min',
    icon: <Dumbbell className="w-6 h-6" />,
    category: 'physical',
    difficulty: 'easy',
  },
  {
    id: '6',
    title: 'Walking Break',
    description: 'Take a 15-minute walk outside. Natural light and movement boost mood and reduce stress hormones.',
    duration: '15 min',
    icon: <Sun className="w-6 h-6" />,
    category: 'physical',
    difficulty: 'easy',
  },
  {
    id: '7',
    title: 'Desk Yoga Poses',
    description: 'Simple yoga poses you can do at your desk. Relieves tension from sitting and improves posture.',
    duration: '5 min',
    icon: <Leaf className="w-6 h-6" />,
    category: 'physical',
    difficulty: 'easy',
  },
  
  // Nutrition
  {
    id: '8',
    title: 'Hydration Reminder',
    description: 'Drink a full glass of water right now. Aim for 8 glasses daily. Dehydration causes fatigue and headaches.',
    duration: '1 min',
    icon: <Droplets className="w-6 h-6" />,
    category: 'nutrition',
    difficulty: 'easy',
  },
  {
    id: '9',
    title: 'Mindful Eating Practice',
    description: 'Eat your next meal slowly without distractions. Notice textures, flavors, and how your body feels.',
    duration: '20 min',
    icon: <Apple className="w-6 h-6" />,
    category: 'nutrition',
    difficulty: 'medium',
  },
  {
    id: '10',
    title: 'Reduce Caffeine Intake',
    description: 'Switch your afternoon coffee to herbal tea. Excess caffeine increases anxiety and disrupts sleep.',
    duration: 'Ongoing',
    icon: <Coffee className="w-6 h-6" />,
    category: 'nutrition',
    difficulty: 'medium',
  },
  
  // Sleep
  {
    id: '11',
    title: 'Digital Sunset',
    description: 'Turn off screens 1 hour before bed. Blue light suppresses melatonin and disrupts your sleep cycle.',
    duration: '1 hour',
    icon: <Moon className="w-6 h-6" />,
    category: 'sleep',
    difficulty: 'medium',
  },
  {
    id: '12',
    title: 'Sleep Schedule',
    description: 'Go to bed and wake up at the same time daily, even on weekends. Consistency improves sleep quality.',
    duration: 'Ongoing',
    icon: <Clock className="w-6 h-6" />,
    category: 'sleep',
    difficulty: 'advanced',
  },
];

const categoryInfo = {
  mental: { icon: Brain, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Mental Wellness' },
  physical: { icon: Heart, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Physical Health' },
  nutrition: { icon: Apple, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Nutrition' },
  sleep: { icon: Moon, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Sleep' },
};

export default function Strategies() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [completedStrategies, setCompletedStrategies] = useState<string[]>([]);

  const filteredStrategies = activeCategory === 'all' 
    ? strategies 
    : strategies.filter(s => s.category === activeCategory);

  const toggleComplete = (id: string) => {
    setCompletedStrategies(prev => 
      prev.includes(id) 
        ? prev.filter(s => s !== id)
        : [...prev, id]
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/20 text-green-700 dark:text-green-300';
      case 'medium': return 'bg-amber-500/20 text-amber-700 dark:text-amber-300';
      case 'advanced': return 'bg-red-500/20 text-red-700 dark:text-red-300';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Strategies & Suggestions
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Personalized coping strategies, wellness activities, and self-care routines 
            to support your physical and mental health journey.
          </p>
        </motion.div>

        {/* Category Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Object.entries(categoryInfo).map(([key, info], index) => {
            const count = strategies.filter(s => s.category === key).length;
            const completed = strategies.filter(
              s => s.category === key && completedStrategies.includes(s.id)
            ).length;
            
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    activeCategory === key ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setActiveCategory(activeCategory === key ? 'all' : key)}
                >
                  <CardContent className="p-4 text-center">
                    <div className={`w-12 h-12 rounded-full ${info.bg} flex items-center justify-center mx-auto mb-3`}>
                      <info.icon className={`w-6 h-6 ${info.color}`} />
                    </div>
                    <h3 className="font-medium text-sm">{info.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {completed}/{count} completed
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={activeCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory('all')}
          >
            All Strategies
          </Button>
          {Object.entries(categoryInfo).map(([key, info]) => (
            <Button
              key={key}
              variant={activeCategory === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(key)}
              className="gap-2"
            >
              <info.icon className="w-4 h-4" />
              {info.label}
            </Button>
          ))}
        </div>

        {/* Strategies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStrategies.map((strategy, index) => {
            const info = categoryInfo[strategy.category];
            const isCompleted = completedStrategies.includes(strategy.id);
            
            return (
              <motion.div
                key={strategy.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`h-full transition-all hover:shadow-lg ${
                  isCompleted ? 'bg-primary/5 border-primary/30' : ''
                }`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className={`w-12 h-12 rounded-xl ${info.bg} flex items-center justify-center`}>
                        <span className={info.color}>{strategy.icon}</span>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getDifficultyColor(strategy.difficulty)}>
                          {strategy.difficulty}
                        </Badge>
                        <Badge variant="outline">{strategy.duration}</Badge>
                      </div>
                    </div>
                    <CardTitle className="text-lg mt-3">{strategy.title}</CardTitle>
                    <CardDescription>{strategy.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full"
                      variant={isCompleted ? 'outline' : 'default'}
                      onClick={() => toggleComplete(strategy.id)}
                    >
                      {isCompleted ? '✓ Completed Today' : 'Mark as Done'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Daily Reminder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
          <Card className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-primary/20">
            <CardContent className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Your Daily Reminder</h3>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Small steps lead to big changes. Even practicing one strategy today 
                is progress. Be patient and kind to yourself on this wellness journey.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>
      
      <Footer />
    </div>
  );
}