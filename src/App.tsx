import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Volume2, VolumeX, History, MapPin, Clock, Ticket, Info, ChevronRight, Play, Languages, Phone } from 'lucide-react';
import { askAssistant } from './services/geminiService';

interface Message {
  role: 'user' | 'model';
  text: string;
  id: string;
}

interface LanguageOption {
  label: string;
  code: string;
  native: string;
}

const LANGUAGES: LanguageOption[] = [
  { label: 'English', code: 'en-IN', native: 'English' },
  { label: 'Tamil', code: 'ta-IN', native: 'தமிழ்' },
  { label: 'Hindi', code: 'hi-IN', native: 'हिन्दी' },
  { label: 'Malayalam', code: 'ml-IN', native: 'മലയാളം' },
  { label: 'Telugu', code: 'te-IN', native: 'తెలుగు' },
  { label: 'Kannada', code: 'kn-IN', native: 'ಕನ್ನಡ' },
];

export default function App() {
  const [selectedLang, setSelectedLang] = useState<LanguageOption>(LANGUAGES[0]);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [transcript, setTranscript] = useState('');
  const [showLangMenu, setShowLangMenu] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const synth = useRef<SpeechSynthesis | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = selectedLang.code;

        rec.onstart = () => setIsListening(true);
        rec.onend = () => setIsListening(false);
        rec.onresult = (event: any) => {
          const currentTranscript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('');
          setTranscript(currentTranscript);
          
          if (event.results[0].isFinal) {
            handleSendMessage(currentTranscript);
          }
        };
        setRecognition(rec);
      }
      synth.current = window.speechSynthesis;
    }
  }, [selectedLang]);

  const speak = useCallback((text: string) => {
    if (!synth.current || isMuted) return;
    
    synth.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedLang.code;
    utterance.rate = 1.0;
    utterance.pitch = 1.1; 
    
    const voices = synth.current.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith(selectedLang.code.split('-')[0]));
    
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synth.current.speak(utterance);
  }, [isMuted, selectedLang]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const userMsg: Message = { role: 'user', text, id: crypto.randomUUID() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setTranscript('');

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const responseText = await askAssistant(text, selectedLang.label, history);
      
      if (responseText === "QUOTA_EXHAEDED_ERROR") {
        const quotaMsg: Message = { 
          role: 'model', 
          text: "The assistant is currently resting due to high demand. Please try again in a few minutes.", 
          id: crypto.randomUUID()
        };
        setMessages(prev => [...prev, quotaMsg]);
        speak("The assistant is currently resting. Please try again later.");
        return;
      }
      
      if (responseText === "INVALID_API_KEY_ERROR") {
        const keyMsg: Message = { 
          role: 'model', 
          text: "The API Key configured in the environment is invalid. Please update the GEMINI_API_KEY.", 
          id: crypto.randomUUID()
        };
        setMessages(prev => [...prev, keyMsg]);
        speak("My API key is invalid. Please configure a valid key.");
        return;
      }

      const assistantMsg: Message = { role: 'model', text: responseText, id: crypto.randomUUID() };
      
      setMessages(prev => [...prev, assistantMsg]);
      speak(responseText);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = { role: 'model', text: "Sorry, I encountered an issue.", id: `error-${crypto.randomUUID()}` };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognition?.stop();
    } else {
      if (isSpeaking) synth.current?.cancel();
      recognition?.start();
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, transcript]);

  return (
    <div className="min-h-screen font-sans selection:bg-museum-terracotta/20">
      <div className="fixed inset-0 pointer-events-none opacity-20 kolam-pattern z-0" />
      
      <main className="relative z-10 max-w-2xl mx-auto px-4 py-8 h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-museum-terracotta rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
              <Mic className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-museum-wood tracking-tight">DakshinaChitra</h1>
              <p className="font-serif text-sm italic text-museum-terracotta/80">Voice Guide</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-2 px-3 py-2 museum-card hover:bg-museum-sand transition-colors text-sm font-medium"
              >
                <Languages className="w-4 h-4 text-museum-terracotta" />
                <span>{selectedLang.native}</span>
              </button>
              
              <AnimatePresence>
                {showLangMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-40 bg-white border border-museum-clay/20 rounded-2xl shadow-xl z-50 overflow-hidden"
                  >
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setSelectedLang(lang);
                          setShowLangMenu(false);
                          setMessages([]); // Clear chat on language change for new context
                        }}
                        className={`w-full text-left px-4 py-3 text-sm hover:bg-museum-sand transition-colors ${selectedLang.code === lang.code ? 'bg-museum-sand text-museum-terracotta font-bold' : 'text-museum-wood'}`}
                      >
                        {lang.native}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="p-2.5 museum-card hover:bg-museum-sand transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-gray-400" /> : <Volume2 className="w-5 h-5 text-museum-terracotta" />}
            </button>
          </div>
        </header>

        {/* Info Pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
          <QuickAction icon={<Clock />} text="Timings" onClick={() => handleSendMessage("What are the museum timings?")} />
          <QuickAction icon={<Ticket />} text="Tickets" onClick={() => handleSendMessage("How much is the entry ticket and camera charges?")} />
          <QuickAction icon={<MapPin />} text="Guides" onClick={() => handleSendMessage("Tell me about the tour guide services and professional guide charges.")} />
          <QuickAction icon={<MapPin />} text="Location" onClick={() => handleSendMessage("Where are you located?")} />
          <QuickAction icon={<Play />} text="Art Galleries" onClick={() => handleSendMessage("Tell me about the Varija and Kadambari art galleries.")} />
          <QuickAction icon={<History />} text="Events/Rentals" onClick={() => handleSendMessage("Do you host weddings, corporate events, or parties?")} />
          <QuickAction icon={<Play />} text="Restaurant" onClick={() => handleSendMessage("Tell me about the restaurant 'Bekal' and what food is available.")} />
          <QuickAction icon={<Info />} text="Library" onClick={() => handleSendMessage("Tell me about your library collection and photographs.")} />
          <QuickAction icon={<History />} text="Guest House" onClick={() => handleSendMessage("Do you have a guest house or rooms for staying?")} />
          <QuickAction icon={<Info />} text="Seminar Hall" onClick={() => handleSendMessage("Can I host a seminar or workshop there?")} />
          <QuickAction icon={<Ticket />} text="Shopping" onClick={() => handleSendMessage("Tell me about the Craft Shop and Bazaar.")} />
          <QuickAction icon={<History />} text="History" onClick={() => handleSendMessage("Who founded the museum?")} />
          <QuickAction icon={<Phone />} text="Contact" onClick={() => handleSendMessage("Give me the contact details of the team members and calling rules.")} />
        </div>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-6 mb-8 pr-2 custom-scrollbar"
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="museum-card p-10 bg-museum-sand/30 border-museum-clay/30"
              >
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <Play className="text-museum-terracotta fill-museum-terracotta ml-1 w-8 h-8" />
                </div>
                <h2 className="font-serif text-3xl mb-4">Namaskaram!</h2>
                <p className="text-museum-wood/70 leading-relaxed max-w-sm mx-auto">
                  I can guide you in {LANGUAGES.map(l => l.native).join(', ')}. Ask me about our heritage houses or workshops.
                </p>
              </motion.div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`
                  max-w-[85%] px-5 py-3.5 rounded-3xl shadow-sm
                  ${msg.role === 'user' 
                    ? 'bg-museum-terracotta text-white rounded-tr-none' 
                    : 'bg-white border border-museum-clay/20 text-museum-wood rounded-tl-none'}
                `}>
                  <p className={`${msg.role === 'model' ? 'font-serif text-xl leading-relaxed' : 'text-sm font-medium'}`}>
                    {msg.text}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {transcript && (
            <div className="flex justify-end opacity-50">
              <div className="bg-museum-clay/20 px-4 py-2 rounded-2xl italic text-sm">
                {transcript}...
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-1.5 p-4">
                <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2.5 h-2.5 bg-museum-clay rounded-full" />
                <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2.5 h-2.5 bg-museum-clay rounded-full" />
                <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2.5 h-2.5 bg-museum-clay rounded-full" />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Control */}
        <div className="pb-8">
          <div className="bg-white/80 backdrop-blur-md rounded-[40px] p-2 shadow-2xl border border-museum-clay/20 relative overflow-hidden">
            {isListening && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-museum-sand/60 -z-10 flex items-center justify-center gap-1.5"
              >
                {[...Array(15)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      height: [12, Math.random() * 45 + 12, 12], 
                    }}
                    transition={{ repeat: Infinity, duration: 0.4 + Math.random() * 0.2, delay: i * 0.04 }}
                    className="w-1.5 bg-museum-terracotta rounded-full"
                  />
                ))}
              </motion.div>
            )}

            <div className="flex items-center justify-between pl-8 pr-2 py-2">
              <div className="flex-1">
                {isListening ? (
                  <p className="text-museum-terracotta font-bold animate-pulse tracking-wide italic">Listening to your question...</p>
                ) : isSpeaking ? (
                  <p className="text-museum-wood font-serif italic text-lg">Speaking in {selectedLang.native}...</p>
                ) : (
                  <p className="text-gray-400 text-sm font-medium tracking-wide">Tap mic to speak in {selectedLang.label}</p>
                )}
              </div>

              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={toggleListening}
                className={`
                  w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all shadow-xl
                  ${isListening ? 'bg-red-500 scale-110 shadow-red-200' : 'bg-museum-terracotta shadow-museum-terracotta/40 hover:scale-105 active:scale-95'}
                `}
              >
                {isListening ? (
                  <MicOff className="text-white w-8 h-8" />
                ) : (
                  <Mic className="text-white w-8 h-8" />
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #A64B2A; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}

function QuickAction({ icon, text, onClick }: { icon: React.ReactNode, text: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-2.5 px-5 py-2.5 bg-white rounded-full border border-museum-clay/20 text-museum-wood text-sm font-semibold whitespace-nowrap hover:bg-museum-sand transition-all hover:translate-y-[-1px] shadow-sm active:translate-y-[1px]"
    >
      <span className="text-museum-terracotta w-4 h-4">{icon}</span>
      {text}
      <ChevronRight className="w-3.5 h-3.5 opacity-20" />
    </button>
  );
}


