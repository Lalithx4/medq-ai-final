"use client";

import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/features/home/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Clock, 
  Save, 
  Users, 
  Send, 
  Search,
  Stethoscope,
  Heart,
  Brain,
  Wind,
  Pill,
  FlaskConical,
  Activity,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Copy,
  FileText,
  Sparkles,
  MessageCircle,
  Globe,
  BookOpen,
  Microscope,
  Syringe,
  ClipboardList,
  UserPlus,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// Specialist definitions with enhanced details
const SPECIALISTS = {
  gastro: { 
    id: "gastro",
    name: "Dr. Maria Garcia", 
    title: "Gastroenterologist", 
    color: "bg-orange-500",
    lightColor: "bg-orange-100",
    textColor: "text-orange-700",
    borderColor: "border-orange-500",
    icon: Stethoscope,
    expertise: ["GI disorders", "Hepatology", "Biliary disease", "Pancreatitis"]
  },
  cardio: { 
    id: "cardio",
    name: "Dr. Sarah Chen", 
    title: "Cardiologist", 
    color: "bg-red-500",
    lightColor: "bg-red-100",
    textColor: "text-red-700",
    borderColor: "border-red-500",
    icon: Heart,
    expertise: ["ACS", "Heart failure", "Arrhythmias", "Valvular disease"]
  },
  pulmo: { 
    id: "pulmo",
    name: "Dr. James Wilson", 
    title: "Pulmonologist", 
    color: "bg-blue-500",
    lightColor: "bg-blue-100",
    textColor: "text-blue-700",
    borderColor: "border-blue-500",
    icon: Wind,
    expertise: ["COPD", "Pneumonia", "ARDS", "Pulmonary embolism"]
  },
  infect: { 
    id: "infect",
    name: "Dr. Lisa Park", 
    title: "Infectious Disease", 
    color: "bg-green-500",
    lightColor: "bg-green-100",
    textColor: "text-green-700",
    borderColor: "border-green-500",
    icon: FlaskConical,
    expertise: ["Sepsis", "Antimicrobials", "Hospital infections", "Tropical diseases"]
  },
  nephro: { 
    id: "nephro",
    name: "Dr. Ahmed Hassan", 
    title: "Nephrologist", 
    color: "bg-cyan-500",
    lightColor: "bg-cyan-100",
    textColor: "text-cyan-700",
    borderColor: "border-cyan-500",
    icon: Activity,
    expertise: ["AKI", "CKD", "Electrolytes", "Dialysis"]
  },
  neuro: { 
    id: "neuro",
    name: "Dr. Robert Thompson", 
    title: "Neurologist", 
    color: "bg-pink-500",
    lightColor: "bg-pink-100",
    textColor: "text-pink-700",
    borderColor: "border-pink-500",
    icon: Brain,
    expertise: ["Stroke", "Seizures", "Encephalopathy", "Neuromuscular"]
  },
  radio: { 
    id: "radio",
    name: "Dr. Emily Roberts", 
    title: "Radiologist", 
    color: "bg-purple-500",
    lightColor: "bg-purple-100",
    textColor: "text-purple-700",
    borderColor: "border-purple-500",
    icon: Search,
    expertise: ["CT interpretation", "MRI", "Ultrasound", "Interventional"]
  },
  lab: { 
    id: "lab",
    name: "Dr. Kevin Wright", 
    title: "Laboratory Medicine", 
    color: "bg-amber-500",
    lightColor: "bg-amber-100",
    textColor: "text-amber-700",
    borderColor: "border-amber-500",
    icon: Microscope,
    expertise: ["Lab interpretation", "Biomarkers", "Cultures", "Pathology"]
  },
  pharma: { 
    id: "pharma",
    name: "Dr. Rachel Kim", 
    title: "Clinical Pharmacist", 
    color: "bg-indigo-500",
    lightColor: "bg-indigo-100",
    textColor: "text-indigo-700",
    borderColor: "border-indigo-500",
    icon: Pill,
    expertise: ["Drug interactions", "Dosing", "Antimicrobial stewardship", "TDM"]
  },
};

// Case templates
const CASE_TEMPLATES = {
  cholecystitis: {
    name: "Acute Cholecystitis",
    symptoms: "52-year-old female with severe right upper quadrant pain radiating to the back, fever 38.5°C, nausea and vomiting for 2 days. Murphy's sign positive.",
    labs: "WBC: 14,500, ALT: 145, AST: 98, ALP: 210, Total Bilirubin: 2.8, Direct Bilirubin: 2.1, Lipase: 45",
    history: "BMI 32, Type 2 Diabetes on Metformin, Hypertension. History of fatty food intolerance for 6 months."
  },
  mi: {
    name: "Acute MI",
    symptoms: "58-year-old male with crushing substernal chest pain radiating to left arm and jaw for 45 minutes, diaphoresis, shortness of breath. BP 150/95, HR 105.",
    labs: "Troponin I: 2.4 (elevated), CK-MB: 28, BNP: 450, Glucose: 185, Creatinine: 1.1",
    history: "Smoker 30 pack-years, Hypertension poorly controlled, Hyperlipidemia, Family history of MI (father at 55)."
  },
  pneumonia: {
    name: "Severe Pneumonia",
    symptoms: "67-year-old male with productive cough (green sputum), fever 39.2°C, pleuritic chest pain, dyspnea at rest. SpO2 89% on room air, RR 28.",
    labs: "WBC: 18,200, CRP: 145, Procalcitonin: 2.8, Lactate: 2.4, Creatinine: 1.4",
    history: "COPD on home oxygen 2L, Former smoker (quit 5 years ago), Recent URI 1 week ago."
  },
  sepsis: {
    name: "Septic Shock",
    symptoms: "45-year-old female with altered mental status, fever 40.1°C, tachycardia HR 125, hypotension BP 85/50, warm extremities, decreased urine output.",
    labs: "WBC: 22,000, Lactate: 4.2, Procalcitonin: 15, Creatinine: 2.8 (baseline 0.9), Platelets: 95,000, INR: 1.6",
    history: "Recent UTI treated 1 week ago, Diabetes Type 2, Immunocompromised on Prednisone for RA."
  }
};

interface LabValue {
  name: string;
  value: string;
  status: "normal" | "high" | "low" | "critical";
}

interface Message {
  id: string;
  type: "user" | "specialist" | "system" | "research";
  specialistId?: string;
  content: string;
  timestamp: Date;
  isThinking?: boolean;
  sources?: string[];
  confidence?: number;
}

interface DifferentialDiagnosis {
  diagnosis: string;
  probability: number;
  reasoning: string;
  supportingFindings: string[];
  contraindicators: string[];
}

interface Discussion {
  id: string;
  title: string;
  messages: Message[];
  differentials: DifferentialDiagnosis[];
  currentFindings: string[];
  suggestedWorkup: string[];
}

export default function CDSSPage() {
  // Patient case state
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [labValues, setLabValues] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [parsedLabs, setParsedLabs] = useState<LabValue[]>([]);
  
  // Session state
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState("00:00");
  
  // Discussion state
  const [activeTab, setActiveTab] = useState("board"); // "board" | specialist id
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSpecialists, setActiveSpecialists] = useState<string[]>([]);
  const [specialistStates, setSpecialistStates] = useState<Record<string, "idle" | "thinking" | "available">>({});
  
  // Clinical decision support state
  const [differentials, setDifferentials] = useState<DifferentialDiagnosis[]>([]);
  const [currentFindings, setCurrentFindings] = useState<string[]>([]);
  const [suggestedWorkup, setSuggestedWorkup] = useState<string[]>([]);
  const [drugInteractions, setDrugInteractions] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect
  useEffect(() => {
    if (sessionStartTime) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
        const mins = Math.floor(elapsed / 60).toString().padStart(2, "0");
        const secs = (elapsed % 60).toString().padStart(2, "0");
        setElapsedTime(`${mins}:${secs}`);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionStartTime]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Parse lab values
  const parseLabValues = (labString: string): LabValue[] => {
    const labs: LabValue[] = [];
    const patterns: Array<{ regex: RegExp; name: string; normal: [number, number] }> = [
      { regex: /wbc[:\s]*([0-9,]+)/i, name: "WBC", normal: [4000, 11000] },
      { regex: /alt[:\s]*(\d+)/i, name: "ALT", normal: [7, 56] },
      { regex: /ast[:\s]*(\d+)/i, name: "AST", normal: [10, 40] },
      { regex: /bilirubin[:\s]*([\d.]+)/i, name: "Bili", normal: [0.1, 1.2] },
      { regex: /creatinine[:\s]*([\d.]+)/i, name: "Cr", normal: [0.7, 1.3] },
      { regex: /troponin[:\s]*([\d.]+)/i, name: "TnI", normal: [0, 0.04] },
      { regex: /lactate[:\s]*([\d.]+)/i, name: "Lactate", normal: [0.5, 2.0] },
      { regex: /crp[:\s]*([\d.]+)/i, name: "CRP", normal: [0, 3] },
      { regex: /potassium[:\s]*([\d.]+)/i, name: "K+", normal: [3.5, 5.0] },
      { regex: /sodium[:\s]*(\d+)/i, name: "Na+", normal: [136, 145] },
      { regex: /glucose[:\s]*(\d+)/i, name: "Glucose", normal: [70, 100] },
      { regex: /platelets[:\s]*([0-9,]+)/i, name: "Plt", normal: [150, 400] },
      { regex: /hemoglobin[:\s]*([\d.]+)/i, name: "Hb", normal: [12, 17] },
      { regex: /inr[:\s]*([\d.]+)/i, name: "INR", normal: [0.9, 1.1] },
    ];

    patterns.forEach((p) => {
      const match = labString.match(p.regex);
      if (match && match[1]) {
        const valueStr = match[1];
        const value = parseFloat(valueStr.replace(",", ""));
        let status: LabValue["status"] = "normal";
        const lowNormal = p.normal[0];
        const highNormal = p.normal[1];
        if (value < lowNormal) status = "low";
        else if (value > highNormal) status = "high";
        if (value > highNormal * 2 || value < lowNormal * 0.5) status = "critical";
        labs.push({ name: p.name, value: valueStr, status });
      }
    });

    return labs;
  };

  // Recruit relevant specialists
  const recruitSpecialists = (symptoms: string, labs: string): string[] => {
    const combined = (symptoms + " " + labs).toLowerCase();
    const recruited: string[] = [];

    const triggers: Record<string, string[]> = {
      gastro: ["abdominal", "liver", "hepat", "gallbladder", "pancrea", "gi", "nausea", "vomit", "jaundice", "alt", "ast", "bilirubin", "murphy"],
      cardio: ["chest", "heart", "cardiac", "troponin", "ecg", "ekg", "palpitation", "bp", "hypertension", "stemi", "nstemi", "angina"],
      pulmo: ["breath", "lung", "pulmonary", "cough", "pneumonia", "oxygen", "spo2", "respiratory", "copd", "asthma", "dyspnea"],
      infect: ["fever", "infection", "sepsis", "wbc", "antibiotic", "bacterial", "viral", "crp", "procalcitonin"],
      nephro: ["kidney", "renal", "creatinine", "bun", "gfr", "dialysis", "urine", "electrolyte", "potassium", "sodium", "aki"],
      neuro: ["headache", "neuro", "stroke", "seizure", "consciousness", "weakness", "numbness", "confusion", "mental status", "altered"],
      radio: ["imaging", "ct", "mri", "xray", "ultrasound", "scan", "mass", "lesion", "nodule"],
      lab: ["lab", "culture", "blood", "test", "marker", "biomarker"],
      pharma: ["medication", "drug", "dose", "antibiotic", "interaction", "allergy"],
    };

    for (const [key, keywords] of Object.entries(triggers)) {
      for (const keyword of keywords) {
        if (combined.includes(keyword) && !recruited.includes(key)) {
          recruited.push(key);
          break;
        }
      }
    }

    // Always include lab interpreter
    if (!recruited.includes("lab")) recruited.push("lab");
    
    return recruited.slice(0, 5); // Max 5 specialists
  };

  // Add message
  const addMessage = (message: Omit<Message, "id" | "timestamp">) => {
    const newMessage: Message = {
      ...message,
      id: `msg-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  };

  // Update message
  const updateMessage = (id: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  // Load case template
  const loadTemplate = (key: keyof typeof CASE_TEMPLATES) => {
    const template = CASE_TEMPLATES[key];
    setChiefComplaint(template.symptoms);
    setLabValues(template.labs);
    setMedicalHistory(template.history);
    setParsedLabs(parseLabValues(template.labs));
  };

  // Start consultation
  const startConsultation = async () => {
    if (!chiefComplaint.trim()) return;

    setSessionActive(true);
    setSessionStartTime(new Date());
    setParsedLabs(parseLabValues(labValues));
    
    // Recruit specialists
    const specialists = recruitSpecialists(chiefComplaint, labValues);
    setActiveSpecialists(specialists);
    
    // Initialize specialist states
    const states: Record<string, "idle" | "thinking" | "available"> = {};
    specialists.forEach(s => states[s] = "available");
    setSpecialistStates(states);

    // System message
    addMessage({
      type: "system",
      content: `Clinical consultation started. ${specialists.length} specialists have been invited based on the case presentation.`,
    });

    // Start initial discussion
    await initiateDiscussion(specialists);
  };

  // Initiate board discussion
  const initiateDiscussion = async (specialists: string[]) => {
    setIsProcessing(true);

    const patientCase = {
      chiefComplaint,
      history: medicalHistory || undefined,
      labs: parsedLabs.map(l => ({
        name: l.name,
        value: l.value,
        unit: "",
        status: l.status,
      })),
    };

    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8001";
      const response = await fetch(`${BACKEND_URL}/war-room/team-discussion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case: patientCase,
          urgency: "routine",
        }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              handleStreamEvent(event);
            } catch (e) {
              console.error("Error parsing event:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Discussion error:", error);
      addMessage({
        type: "system",
        content: "An error occurred during the consultation. Please try again.",
      });
    }

    setIsProcessing(false);
  };

  // Handle streaming events
  const handleStreamEvent = (event: any) => {
    switch (event.type) {
      case "specialist_thinking":
        setSpecialistStates(prev => ({ ...prev, [event.data.specialistId]: "thinking" }));
        break;

      case "specialist_message":
        setSpecialistStates(prev => ({ ...prev, [event.data.specialistId]: "available" }));
        addMessage({
          type: "specialist",
          specialistId: event.data.specialistId,
          content: event.data.content,
          confidence: event.data.confidence,
          sources: event.data.sources,
        });
        break;

      case "differential_update":
        if (event.data.differentials) {
          setDifferentials(event.data.differentials);
        }
        break;

      case "findings_update":
        if (event.data.findings) {
          setCurrentFindings(event.data.findings);
        }
        break;

      case "workup_suggestion":
        if (event.data.workup) {
          setSuggestedWorkup(event.data.workup);
        }
        break;

      case "research_result":
        addMessage({
          type: "research",
          content: event.data.content,
          sources: event.data.sources,
        });
        break;

      case "system_message":
        addMessage({
          type: "system",
          content: event.data.message,
        });
        break;
    }
  };

  // Send message to board or specific specialist
  const sendMessage = async () => {
    if (!userInput.trim() || isProcessing) return;

    const message = userInput.trim();
    setUserInput("");

    // Add user message
    addMessage({
      type: "user",
      content: message,
    });

    setIsProcessing(true);

    const patientCase = {
      chiefComplaint,
      history: medicalHistory || undefined,
      labs: parsedLabs.map(l => ({
        name: l.name,
        value: l.value,
        unit: "",
        status: l.status,
      })),
    };

    // Check if message is directed to specific specialist
    const targetSpecialist = activeTab !== "board" ? activeTab : undefined;
    const isResearchQuery = message.toLowerCase().includes("@research") || message.toLowerCase().includes("search");

    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8001";
      const endpoint = isResearchQuery ? `${BACKEND_URL}/war-room/broker-query` : `${BACKEND_URL}/war-room/broker-query`;
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.replace(/@research\s*/i, ""),
          case: patientCase,
          targetSpecialist,
          conversationHistory: messages.slice(-10),
          differentials,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.response) {
          addMessage({
            type: "specialist",
            specialistId: data.response.specialistId || targetSpecialist,
            content: data.response.content,
            confidence: data.response.confidence,
            sources: data.response.sources,
          });
        }

        // Update differentials if provided
        if (data.differentials) {
          setDifferentials(data.differentials);
        }
        
        // Update workup suggestions
        if (data.suggestedWorkup) {
          setSuggestedWorkup(data.suggestedWorkup);
        }
      } else {
        addMessage({
          type: "system",
          content: data.error || "Unable to process your request.",
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      addMessage({
        type: "system",
        content: "An error occurred. Please try again.",
      });
    }

    setIsProcessing(false);
  };

  // Request deep research
  const requestResearch = async (topic: string) => {
    addMessage({
      type: "system",
      content: `🔍 Searching medical literature for: ${topic}`,
    });

    setIsProcessing(true);

    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8001";
      const response = await fetch(`${BACKEND_URL}/war-room/broker-query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: topic,
          case: {
            chiefComplaint,
            history: medicalHistory,
            labs: parsedLabs,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        addMessage({
          type: "research",
          content: data.content,
          sources: data.sources,
        });
      }
    } catch (error) {
      console.error("Research error:", error);
    }

    setIsProcessing(false);
  };

  // Get lab status color
  const getLabStatusColor = (status: LabValue["status"]) => {
    switch (status) {
      case "critical": return "bg-red-500 text-white";
      case "high": return "bg-amber-500 text-white";
      case "low": return "bg-blue-500 text-white";
      default: return "bg-green-500 text-white";
    }
  };

  // Render specialist avatar
  const renderSpecialistAvatar = (specialistId: string, size: "sm" | "md" | "lg" = "md") => {
    const specialist = SPECIALISTS[specialistId as keyof typeof SPECIALISTS];
    if (!specialist) return null;
    
    const Icon = specialist.icon;
    const sizeClass = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-12 h-12" : "w-10 h-10";
    const iconSize = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5";
    
    return (
      <div className={cn(
        sizeClass,
        specialist.color,
        "rounded-full flex items-center justify-center shadow-md"
      )}>
        <Icon className={cn(iconSize, "text-white")} />
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)] bg-background">
        {/* Left Panel - Patient Case */}
        <aside className="w-[380px] border-r border-border flex flex-col bg-card">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Badge variant="outline" className="text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                CDSS Active
              </Badge>
            </div>
            <h1 className="text-xl font-bold">Clinical Decision Support</h1>
            <p className="text-xs text-muted-foreground">AI-assisted diagnostic consultation</p>
          </div>

          <ScrollArea className="flex-1 p-4">
            {!sessionActive ? (
              <div className="space-y-4">
                {/* Quick Cases */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Quick Cases</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(CASE_TEMPLATES).map(([key, template]) => (
                      <Button
                        key={key}
                        variant="outline"
                        size="sm"
                        onClick={() => loadTemplate(key as keyof typeof CASE_TEMPLATES)}
                        className="text-xs"
                      >
                        {template.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Chief Complaint */}
                <div>
                  <label className="text-sm font-medium">Chief Complaint & Presentation</label>
                  <Textarea
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    placeholder="Describe presenting symptoms, vital signs, physical exam findings..."
                    className="mt-1 min-h-[100px]"
                  />
                </div>

                {/* Lab Values */}
                <div>
                  <label className="text-sm font-medium">Laboratory Values</label>
                  <Textarea
                    value={labValues}
                    onChange={(e) => {
                      setLabValues(e.target.value);
                      setParsedLabs(parseLabValues(e.target.value));
                    }}
                    placeholder="Enter lab values (e.g., WBC: 14500, Cr: 2.1, Troponin: 0.5)"
                    className="mt-1 min-h-[80px]"
                  />
                  {parsedLabs.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {parsedLabs.map((lab, i) => (
                        <Badge key={i} className={cn("text-xs", getLabStatusColor(lab.status))}>
                          {lab.name}: {lab.value}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Medical History */}
                <div>
                  <label className="text-sm font-medium">Medical History & Medications</label>
                  <Textarea
                    value={medicalHistory}
                    onChange={(e) => setMedicalHistory(e.target.value)}
                    placeholder="Past medical history, current medications, allergies..."
                    className="mt-1 min-h-[80px]"
                  />
                </div>

                <Button 
                  onClick={startConsultation}
                  disabled={!chiefComplaint.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Start Consultation
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Session Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Session: {elapsedTime}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    <p className="line-clamp-2">{chiefComplaint}</p>
                  </CardContent>
                </Card>

                {/* Lab Summary */}
                {parsedLabs.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Lab Values</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {parsedLabs.map((lab, i) => (
                          <Badge key={i} className={cn("text-xs", getLabStatusColor(lab.status))}>
                            {lab.name}: {lab.value}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Differential Diagnoses */}
                {differentials.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ClipboardList className="w-4 h-4" />
                        Differential Diagnoses
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {differentials.slice(0, 4).map((dx, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="font-medium">{dx.diagnosis}</span>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(dx.probability * 100)}%
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Suggested Workup */}
                {suggestedWorkup.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Suggested Workup
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-xs space-y-1">
                        {suggestedWorkup.slice(0, 5).map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Actions */}
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => requestResearch("latest guidelines treatment " + chiefComplaint.split(" ").slice(0, 5).join(" "))}
                  >
                    <Globe className="w-3 h-3 mr-2" />
                    Search Guidelines
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => requestResearch("drug interactions " + medicalHistory)}
                  >
                    <Pill className="w-3 h-3 mr-2" />
                    Check Drug Interactions
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col">
          {/* Specialist Tabs */}
          {sessionActive && (
            <div className="border-b border-border bg-card/50 p-2">
              <div className="flex items-center gap-2 overflow-x-auto">
                <Button
                  variant={activeTab === "board" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("board")}
                  className="flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Board Discussion
                </Button>
                {activeSpecialists.map(id => {
                  const specialist = SPECIALISTS[id as keyof typeof SPECIALISTS];
                  if (!specialist) return null;
                  const Icon = specialist.icon;
                  const state = specialistStates[id];
                  
                  return (
                    <Button
                      key={id}
                      variant={activeTab === id ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setActiveTab(id)}
                      className={cn(
                        "flex items-center gap-2",
                        activeTab === id && specialist.color
                      )}
                    >
                      <div className="relative">
                        <Icon className="w-4 h-4" />
                        {state === "thinking" && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                        )}
                      </div>
                      <span className="hidden sm:inline">{specialist.title}</span>
                    </Button>
                  );
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => {
                    // Add more specialists modal
                  }}
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {!sessionActive ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Stethoscope className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Clinical Decision Support System</h2>
                  <p className="text-muted-foreground mb-4">
                    Enter patient information to start a consultation with AI specialists. 
                    Discuss differentials, request research, and collaborate on diagnosis.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-left">
                    <div className="p-3 rounded-lg bg-card border">
                      <MessageCircle className="w-4 h-4 text-blue-500 mb-1" />
                      <div className="font-medium">Natural Discussion</div>
                      <div className="text-muted-foreground">Chat with specialists naturally</div>
                    </div>
                    <div className="p-3 rounded-lg bg-card border">
                      <Globe className="w-4 h-4 text-green-500 mb-1" />
                      <div className="font-medium">Deep Research</div>
                      <div className="text-muted-foreground">Search medical literature</div>
                    </div>
                    <div className="p-3 rounded-lg bg-card border">
                      <Pill className="w-4 h-4 text-amber-500 mb-1" />
                      <div className="font-medium">Drug Interactions</div>
                      <div className="text-muted-foreground">Check medication safety</div>
                    </div>
                    <div className="p-3 rounded-lg bg-card border">
                      <ClipboardList className="w-4 h-4 text-purple-500 mb-1" />
                      <div className="font-medium">Differential Dx</div>
                      <div className="text-muted-foreground">Dynamic diagnosis tracking</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3",
                      msg.type === "user" && "flex-row-reverse"
                    )}
                  >
                    {/* Avatar */}
                    {msg.type === "specialist" && msg.specialistId && renderSpecialistAvatar(msg.specialistId)}
                    {msg.type === "user" && (
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center">
                        <Stethoscope className="w-5 h-5 text-white" />
                      </div>
                    )}
                    {msg.type === "system" && (
                      <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
                        <Activity className="w-5 h-5 text-white" />
                      </div>
                    )}
                    {msg.type === "research" && (
                      <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Globe className="w-5 h-5 text-white" />
                      </div>
                    )}

                    {/* Message Content */}
                    <div className={cn(
                      "flex-1 max-w-[75%]",
                      msg.type === "user" && "text-right"
                    )}>
                      {/* Header */}
                      {msg.type === "specialist" && msg.specialistId && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">
                            {SPECIALISTS[msg.specialistId as keyof typeof SPECIALISTS]?.name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {SPECIALISTS[msg.specialistId as keyof typeof SPECIALISTS]?.title}
                          </Badge>
                        </div>
                      )}
                      {msg.type === "research" && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-emerald-600">Research Results</span>
                          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700">
                            <Globe className="w-3 h-3 mr-1" />
                            Literature Search
                          </Badge>
                        </div>
                      )}

                      {/* Content */}
                      <div className={cn(
                        "rounded-lg p-3 text-sm",
                        msg.type === "user" 
                          ? "bg-primary text-primary-foreground ml-auto" 
                          : msg.type === "system"
                          ? "bg-muted text-muted-foreground italic"
                          : msg.type === "research"
                          ? "bg-emerald-50 border border-emerald-200"
                          : "bg-card border"
                      )}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        
                        {/* Sources */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border">
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              Sources: {msg.sources.slice(0, 3).join(", ")}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="text-xs text-muted-foreground mt-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {msg.confidence && (
                          <span className="ml-2">
                            Confidence: {Math.round(msg.confidence * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {isProcessing && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Specialists are reviewing...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          {sessionActive && (
            <div className="p-4 border-t border-border bg-card/50">
              <div className="flex items-center gap-2 mb-2 text-xs">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUserInput("@research ")}
                  className="text-emerald-600 border-emerald-500/50 hover:bg-emerald-500/10"
                >
                  <Globe className="w-3 h-3 mr-1" />
                  @Research
                </Button>
                <span className="text-muted-foreground">
                  {activeTab === "board" 
                    ? "Ask the entire board or type @research for literature search"
                    : `Chatting with ${SPECIALISTS[activeTab as keyof typeof SPECIALISTS]?.title}`
                  }
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    placeholder={
                      activeTab === "board"
                        ? "Ask a question, discuss differentials, or request clarification..."
                        : `Ask ${SPECIALISTS[activeTab as keyof typeof SPECIALISTS]?.name} a question...`
                    }
                    className="w-full bg-background border border-border rounded-lg px-4 py-3 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={isProcessing}
                  />
                  <Button
                    size="icon"
                    onClick={sendMessage}
                    disabled={isProcessing || !userInput.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary hover:bg-primary/90"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Right Panel - Active Specialists */}
        {sessionActive && (
          <aside className="w-[280px] border-l border-border bg-card/50 flex flex-col">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">Consulting Specialists</h3>
              <p className="text-xs text-muted-foreground">Click to chat directly</p>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {activeSpecialists.map(id => {
                  const specialist = SPECIALISTS[id as keyof typeof SPECIALISTS];
                  if (!specialist) return null;
                  const Icon = specialist.icon;
                  const state = specialistStates[id];
                  
                  return (
                    <Card 
                      key={id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        activeTab === id && `border-2 ${specialist.borderColor}`,
                        state === "thinking" && "animate-pulse"
                      )}
                      onClick={() => setActiveTab(id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            specialist.color
                          )}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{specialist.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{specialist.title}</div>
                          </div>
                          {state === "thinking" && (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {specialist.expertise.slice(0, 2).map((exp, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {exp}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Session Actions */}
            <div className="p-4 border-t border-border space-y-2">
              <Button variant="outline" size="sm" className="w-full">
                <Save className="w-4 h-4 mr-2" />
                Save Session
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                <Copy className="w-4 h-4 mr-2" />
                Export Summary
              </Button>
            </div>
          </aside>
        )}
      </div>
    </AppLayout>
  );
}
