"use client";

import { useState, useEffect, useRef } from "react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff, Volume2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  isPriority?: boolean;
}

export default function ChatPage() {
  const { emergencyLocation, userLocation } = useStore();
  const [messages, setMessages] = useState<Message[]>([
    { id: "0", sender: "bot", text: "Hello, I am your RoadSoS assistant. How can I help you?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast.error("Speech recognition error.");
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
      } else {
        toast.error("Speech recognition not supported in this browser.");
      }
    }
  };

  const playTTS = async (text: string) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/chat/tts?text=${encodeURIComponent(text)}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const audio = new Audio(url);
      audio.play();
    } catch (e) {
      toast.error("TTS failed.");
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: Message = { id: Date.now().toString(), sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const lat = emergencyLocation.lat || userLocation.lat;
    const lng = emergencyLocation.lng || userLocation.lng;

    try {
      const res = await axios.post("http://localhost:8000/api/chat", {
        message: userMsg.text,
        lat: lat,
        lng: lng,
        session_id: sessionId,
      }, { timeout: 15000 });

      const botMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        sender: "bot", 
        text: res.data.reply,
        isPriority: res.data.intents.includes("emergency_sos")
      };
      
      setMessages((prev) => [...prev, botMsg]);
      
      // Auto-play TTS for bot responses to help in emergencies
      playTTS(botMsg.text);

    } catch (err) {
      toast.error("Failed to connect to the assistant.");
      setMessages((prev) => [...prev, { id: (Date.now()+1).toString(), sender: "bot", text: "Network error. Please try calling emergency numbers directly."}]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      <div className="p-4 bg-card border-b border-border shadow-sm flex justify-between items-center">
        <h2 className="font-semibold text-lg">Emergency Assistant</h2>
        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            GENSPARK PRO ACTIVE
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] p-3 rounded-lg text-sm relative ${m.sender === "user" ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted text-muted-foreground rounded-bl-none"} ${m.isPriority ? "border-2 border-red-500 bg-red-950/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]" : ""}`}>
              {m.text}
              {m.sender === 'bot' && (
                  <Volume2 size={12} className="absolute -bottom-4 right-0 text-muted-foreground cursor-pointer hover:text-white" onClick={() => playTTS(m.text)} />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted text-muted-foreground p-3 rounded-lg rounded-bl-none text-sm animate-pulse">
              Assistant is thinking...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-card border-t border-border flex gap-2">
        <Button 
            variant={isListening ? "destructive" : "outline"} 
            size="icon" 
            onClick={toggleListening}
            className={isListening ? "animate-pulse" : ""}
        >
          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isListening ? "Listening..." : "Describe emergency..."} 
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
