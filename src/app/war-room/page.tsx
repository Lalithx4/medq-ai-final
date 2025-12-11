"use client";

import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/features/home/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// Agent definitions
const AGENTS = {
  gastro: { name: "Dr. Maria Garcia", title: "Gastroenterologist", color: "bg-orange-500", icon: Stethoscope },
  cardio: { name: "Dr. Sarah Chen", title: "Cardiologist", color: "bg-red-500", icon: Heart },
  pulmo: { name: "Dr. James Wilson", title: "Pulmonologist", color: "bg-blue-500", icon: Wind },
  infect: { name: "Dr. Lisa Park", title: "Infectious Disease", color: "bg-green-500", icon: FlaskConical },
  nephro: { name: "Dr. Ahmed Hassan", title: "Nephrologist", color: "bg-cyan-500", icon: Activity },
  neuro: { name: "Dr. Robert Thompson", title: "Neurologist", color: "bg-pink-500", icon: Brain },
  radio: { name: "Dr. Emily Roberts", title: "Radiologist", color: "bg-purple-500", icon: Search },
  broker: { name: "MedQ Broker", title: "Data & Research Agent", color: "bg-teal-500", icon: Search },
  moderator: { name: "Board Moderator", title: "Discussion Lead", color: "bg-gray-500", icon: Users },
};

// Case templates
const TEMPLATES = {
  cholecystitis: {
    symptoms: "52-year-old female with severe right upper quadrant pain radiating to the back, fever 38.5°C, nausea and vomiting for 2 days. Murphy's sign positive.",
    labs: "WBC: 14,500, ALT: 145, AST: 98, ALP: 210, Total Bilirubin: 2.8, Direct Bilirubin: 2.1, Lipase: 45",
    history: "BMI 32, Type 2 Diabetes on Metformin, Hypertension. History of fatty food intolerance for 6 months."
  },
  mi: {
    symptoms: "58-year-old male with crushing substernal chest pain radiating to left arm and jaw for 45 minutes, diaphoresis, shortness of breath. BP 150/95, HR 105.",
    labs: "Troponin I: 2.4 (elevated), CK-MB: 28, BNP: 450, Glucose: 185, Creatinine: 1.1",
    history: "Smoker 30 pack-years, Hypertension poorly controlled, Hyperlipidemia, Family history of MI (father at 55)."
  },
  pneumonia: {
    symptoms: "67-year-old male with productive cough (green sputum), fever 39.2°C, pleuritic chest pain, dyspnea at rest. SpO2 89% on room air, RR 28.",
    labs: "WBC: 18,200, CRP: 145, Procalcitonin: 2.8, Lactate: 2.4, Creatinine: 1.4",
    history: "COPD on home oxygen 2L, Former smoker (quit 5 years ago), Recent URI 1 week ago."
  },
  sepsis: {
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

interface AgentMessage {
  id: string;
  agentKey: string;
  content: string;
  timestamp: Date;
  keyPoint?: boolean;
  confidence?: number;
}

interface ConsensusData {
  recommendation: string;
  plan: string[];
  confidence: number;
}

export default function WarRoomPage() {
  // Form state
  const [symptoms, setSymptoms] = useState("");
  const [labs, setLabs] = useState("");
  const [history, setHistory] = useState("");
  
  // UI state
  const [isConsulting, setIsConsulting] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [agentStates, setAgentStates] = useState<Record<string, "idle" | "thinking" | "done">>({});
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [parsedLabs, setParsedLabs] = useState<LabValue[]>([]);
  const [consensus, setConsensus] = useState<ConsensusData | null>(null);
  const [humanInput, setHumanInput] = useState("");
  const [caseStarted, setCaseStarted] = useState(false);
  
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

  // Auto-scroll messages
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

  // Recruit specialists based on case content
  const recruitSpecialists = (symptoms: string, labs: string): string[] => {
    const combined = (symptoms + " " + labs).toLowerCase();
    const recruited: string[] = [];

    const triggers: Record<string, string[]> = {
      gastro: ["abdominal", "liver", "hepat", "gallbladder", "pancrea", "gi", "nausea", "vomit", "jaundice", "alt", "ast", "bilirubin"],
      cardio: ["chest", "heart", "cardiac", "troponin", "ecg", "ekg", "palpitation", "bp", "hypertension", "stemi", "nstemi"],
      pulmo: ["breath", "lung", "pulmonary", "cough", "pneumonia", "oxygen", "spo2", "respiratory", "copd", "asthma"],
      infect: ["fever", "infection", "sepsis", "wbc", "antibiotic", "bacterial", "viral", "crp", "procalcitonin"],
      nephro: ["kidney", "renal", "creatinine", "bun", "gfr", "dialysis", "urine", "electrolyte", "potassium", "sodium"],
      neuro: ["headache", "neuro", "stroke", "seizure", "consciousness", "weakness", "numbness", "confusion", "mental status"],
      radio: ["imaging", "ct", "mri", "xray", "ultrasound", "scan", "mass", "lesion", "nodule"],
    };

    for (const [key, keywords] of Object.entries(triggers)) {
      for (const keyword of keywords) {
        if (combined.includes(keyword) && !recruited.includes(key)) {
          recruited.push(key);
          break;
        }
      }
    }

    // Ensure at least 3 specialists
    if (recruited.length < 3) {
      const defaults = ["gastro", "infect", "cardio"];
      for (const d of defaults) {
        if (!recruited.includes(d) && recruited.length < 3) {
          recruited.push(d);
        }
      }
    }

    return recruited;
  };

  // Load template
  const loadTemplate = (templateName: keyof typeof TEMPLATES) => {
    const template = TEMPLATES[templateName];
    setSymptoms(template.symptoms);
    setLabs(template.labs);
    setHistory(template.history);
  };

  // Map API agent IDs to local agent keys
  const agentIdToKey: Record<string, string> = {
    gastroenterologist: "gastro",
    infectious_disease: "infect",
    cardiologist: "cardio",
    pulmonologist: "pulmo",
    nephrologist: "nephro",
    neurologist: "neuro",
    radiologist: "radio",
    lab_interpreter: "radio", // Use radio icon for lab
    broker: "broker",
    orchestrator: "moderator",
  };

  // Start consultation with SSE streaming
  const startConsultation = async () => {
    if (!symptoms.trim()) {
      alert("Please enter patient symptoms.");
      return;
    }

    setIsConsulting(true);
    setSessionStartTime(new Date());
    setCaseStarted(true);
    setMessages([]);
    setConsensus(null);

    // Parse labs
    const parsed = parseLabValues(labs);
    setParsedLabs(parsed);

    // Recruit specialists (will be refined by API)
    const specialists = recruitSpecialists(symptoms, labs);
    setActiveAgents(specialists);

    // Initialize agent states
    const states: Record<string, "idle" | "thinking" | "done"> = {};
    specialists.forEach((s) => (states[s] = "idle"));
    setAgentStates(states);

    // Add opening message
    addMessage("moderator", `The board is convening to analyze this case. Specialists are being summoned based on the clinical presentation.`);

    try {
      // Build patient case object for API
      const patientCase = {
        chiefComplaint: symptoms,
        history: history || undefined,
        labs: parsed.map(l => ({
          name: l.name,
          value: l.value,
          unit: "",
          status: l.status,
        })),
      };

      // Call Python ADK backend with SSE streaming
      const PYTHON_BACKEND = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8001";
      const response = await fetch(`${PYTHON_BACKEND}/war-room/team-discussion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          case: patientCase,
          urgency: "routine",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        addMessage("moderator", `Backend unavailable: ${errorText}. Ensure Python server is running on port 8001.`);
        setIsConsulting(false);
        return;
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        addMessage("moderator", "Error: Unable to establish connection. Please try again.");
        setIsConsulting(false);
        return;
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              
              switch (event.type) {
                case "phase_change":
                  addMessage("moderator", `📋 ${event.data.message}`);
                  break;

                case "orchestration_complete":
                  // Update active agents based on API response
                  const apiAgents = event.data.relevantAgents || [];
                  const mappedAgents = apiAgents.map((id: string) => agentIdToKey[id] || id).filter(Boolean);
                  if (mappedAgents.length > 0) {
                    setActiveAgents(mappedAgents);
                    const newStates: Record<string, "idle" | "thinking" | "done"> = {};
                    mappedAgents.forEach((a: string) => (newStates[a] = "idle"));
                    setAgentStates(newStates);
                  }
                  if (event.data.initialAssessment) {
                    addMessage("moderator", `Initial Assessment: ${event.data.initialAssessment}`);
                  }
                  break;

                case "agent_thinking":
                  const thinkingKey = agentIdToKey[event.data.agentId] || event.data.agentId;
                  setAgentStates((prev) => ({ ...prev, [thinkingKey]: "thinking" }));
                  break;

                case "agent_message":
                  const msg = event.data.message;
                  const agentKey = agentIdToKey[msg.agentId] || msg.agentId;
                  setAgentStates((prev) => ({ ...prev, [agentKey]: "done" }));
                  addMessage(agentKey, msg.content, false, msg.confidence);
                  
                  // Show alerts
                  if (event.data.alerts?.length > 0) {
                    addMessage("moderator", `⚠️ ALERT: ${event.data.alerts.join(", ")}`, true);
                  }
                  break;

                case "conflict_detected":
                  addMessage("moderator", `⚔️ Disagreement noted - specialists are debating.`, true);
                  break;

                case "consensus_building":
                  addMessage("moderator", `🔄 Building consensus... (${event.data.progress}%)`);
                  break;

                case "consensus_complete":
                  const cons = event.data.consensus;
                  if (cons) {
                    setConsensus({
                      recommendation: cons.primaryDiagnosis || "Assessment pending",
                      plan: cons.recommendedActions || [],
                      confidence: cons.confidence || 0.7,
                    });
                  }
                  break;

                case "error":
                  addMessage("moderator", `❌ Error: ${event.data.message}`);
                  break;
              }
            } catch (e) {
              console.error("Error parsing SSE event:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Consultation error:", error);
      addMessage("moderator", "An error occurred during the consultation. Please try again.");
    }

    setIsConsulting(false);
  };

  // Add message helper
  const addMessage = (agentKey: string, content: string, keyPoint?: boolean, confidence?: number) => {
    const newMessage: AgentMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      agentKey,
      content,
      timestamp: new Date(),
      keyPoint,
      confidence,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  // Send human message
  const sendHumanMessage = async () => {
    if (!humanInput.trim()) return;

    const isBrokerQuery = humanInput.toLowerCase().startsWith("@broker");
    const cleanMessage = isBrokerQuery ? humanInput.replace(/@broker\s*/i, "") : humanInput;

    // Add human message to stream
    addMessage("human", cleanMessage);
    setHumanInput("");

    // Build patient case context
    const patientCase = {
      chiefComplaint: symptoms,
      history: history || undefined,
      labs: parsedLabs.map(l => ({
        name: l.name,
        value: l.value,
        unit: "",
        status: l.status,
      })),
    };

    // Convert messages to API format
    const conversationHistory = messages.slice(-10).map(m => ({
      id: m.id,
      agentId: m.agentKey === "moderator" ? "orchestrator" : m.agentKey,
      agentName: AGENTS[m.agentKey as keyof typeof AGENTS]?.name || m.agentKey,
      content: m.content,
      phase: "analysis" as const,
      timestamp: m.timestamp.getTime(),
      confidence: m.confidence,
    }));

    if (isBrokerQuery) {
      setAgentStates((prev) => ({ ...prev, broker: "thinking" }));

      try {
        const PYTHON_BACKEND = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8001";
        const response = await fetch(`${PYTHON_BACKEND}/war-room/broker-query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: cleanMessage,
            context: patientCase,
            conversationHistory,
          }),
        });

        const data = await response.json();
        setAgentStates((prev) => ({ ...prev, broker: "done" }));
        
        if (data.success && data.message) {
          addMessage("broker", data.message.content, false, data.message.confidence);
          if (data.alerts?.length > 0) {
            addMessage("moderator", `⚠️ ${data.alerts.join(", ")}`, true);
          }
        } else {
          addMessage("broker", data.error || "Unable to process query.");
        }
      } catch (error) {
        setAgentStates((prev) => ({ ...prev, broker: "done" }));
        addMessage("broker", "An error occurred while searching. Please try again.");
      }
    } else {
      // Follow-up question to board
      setAgentStates((prev) => ({ ...prev, moderator: "thinking" }));

      try {
        const PYTHON_BACKEND = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://localhost:8001";
        const response = await fetch(`${PYTHON_BACKEND}/war-room/follow-up`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: cleanMessage,
            context: patientCase,
            conversationHistory,
          }),
        });

        const data = await response.json();
        setAgentStates((prev) => ({ ...prev, moderator: "done" }));
        
        if (data.success && data.message) {
          const agentKey = agentIdToKey[data.message.agentId] || data.message.agentId;
          addMessage(agentKey, data.message.content, false, data.message.confidence);
          
          if (data.recommendations?.length > 0) {
            addMessage("moderator", `📋 Recommendations: ${data.recommendations.join(", ")}`);
          }
        } else {
          addMessage("moderator", data.error || "I apologize, I could not process that question.");
        }
      } catch (error) {
        setAgentStates((prev) => ({ ...prev, moderator: "done" }));
        addMessage("moderator", "An error occurred. Please try again.");
      }
    }
  };

  // Copy consensus
  const copyConsensus = () => {
    if (consensus) {
      const text = `BOARD RECOMMENDATION:\n${consensus.recommendation}\n\nTREATMENT PLAN:\n${consensus.plan.map((p, i) => `${i + 1}. ${p}`).join("\n")}`;
      navigator.clipboard.writeText(text);
    }
  };

  // Get patient info from symptoms
  const getPatientInfo = () => {
    const ageMatch = symptoms.match(/(\d+)[- ]?(yo|year|y\.o)/i);
    const genderMatch = symptoms.match(/\b(male|female|man|woman)\b/i);
    const age = ageMatch?.[1] ?? "?";
    const gender = genderMatch?.[1]?.[0]?.toUpperCase() ?? "?";
    return { age, gender, initials: `${age}${gender}` };
  };

  const patientInfo = getPatientInfo();

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)] bg-background">
        {/* Left Panel: Patient Snapshot */}
        <aside className="w-[35%] border-r border-border flex flex-col bg-card/50">
          {/* Patient Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Patient Snapshot</h2>
              {caseStarted && (
                <Badge variant="outline" className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                  LIVE
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                {patientInfo.initials !== "??" ? patientInfo.initials : "--"}
              </div>
              <div>
                <div className="text-sm font-semibold">{caseStarted ? "Active Case" : "Enter Patient Data"}</div>
                <div className="text-xs text-muted-foreground">
                  {patientInfo.age !== "?" ? `${patientInfo.age} years` : "Age"} • 
                  {patientInfo.gender !== "?" ? (patientInfo.gender === "M" ? " Male" : " Female") : " Gender"}
                </div>
              </div>
            </div>
          </div>

          {/* Case Input */}
          {!caseStarted && (
            <div className="p-4 border-b border-border space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Chief Complaint & Symptoms
                </label>
                <Textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  rows={3}
                  placeholder="45yo male with severe RUQ pain, fever 38.5°C, jaundice..."
                  className="resize-none text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Lab Values
                </label>
                <Textarea
                  value={labs}
                  onChange={(e) => setLabs(e.target.value)}
                  rows={2}
                  placeholder="ALT: 120, AST: 95, WBC: 12500, Bilirubin: 2.4..."
                  className="resize-none text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Medical History
                </label>
                <Textarea
                  value={history}
                  onChange={(e) => setHistory(e.target.value)}
                  rows={2}
                  placeholder="Diabetes Type 2, Hypertension, Previous cholecystectomy..."
                  className="resize-none text-sm"
                />
              </div>

              <Button
                onClick={startConsultation}
                disabled={isConsulting}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold"
              >
                {isConsulting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Consulting...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    CONSULT THE BOARD
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Lab Values Ticker */}
          {caseStarted && parsedLabs.length > 0 && (
            <div className="p-4 border-b border-border">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Lab Values</h3>
              <div className="flex flex-wrap gap-2">
                {parsedLabs.map((lab) => (
                  <Badge
                    key={lab.name}
                    variant="outline"
                    className={cn(
                      "font-mono text-xs",
                      lab.status === "normal" && "bg-green-500/10 text-green-600 border-green-500/30",
                      lab.status === "high" && "bg-red-500/10 text-red-600 border-red-500/30",
                      lab.status === "low" && "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
                      lab.status === "critical" && "bg-red-500/20 text-red-500 border-red-500 animate-pulse"
                    )}
                  >
                    <span className="text-muted-foreground mr-1">{lab.name}:</span>
                    {lab.value}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Case Summary when started */}
          {caseStarted && (
            <div className="p-4 flex-1 overflow-y-auto">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Case Summary</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Presentation:</span>
                  <p className="text-foreground mt-1">{symptoms}</p>
                </div>
                {history && (
                  <div>
                    <span className="font-medium text-muted-foreground">History:</span>
                    <p className="text-foreground mt-1">{history}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Templates */}
          <div className="p-4 border-t border-border">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Quick Cases</h3>
            <div className="flex flex-wrap gap-2">
              {Object.keys(TEMPLATES).map((key) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => loadTemplate(key as keyof typeof TEMPLATES)}
                  className="text-xs h-7"
                  disabled={caseStarted}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Panel: Debate Stream */}
        <main className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border bg-card/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <Stethoscope className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-sm font-bold">THE WAR ROOM</h1>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Virtual Tumor Board</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {elapsedTime}
                </div>
                <Button variant="outline" size="sm" className="text-xs">
                  <Save className="w-3 h-3 mr-1" />
                  Save Session
                </Button>
              </div>
            </div>

            {/* Seated Agents */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Seated Specialists</h2>
              <span className="text-[10px] text-muted-foreground">
                {activeAgents.length > 0 ? `${activeAgents.length} specialists summoned` : "Waiting for case..."}
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {activeAgents.length === 0 ? (
                <span className="text-xs text-muted-foreground italic">No specialists summoned yet</span>
              ) : (
                activeAgents.map((key) => {
                  const agent = AGENTS[key as keyof typeof AGENTS];
                  if (!agent) return null;
                  const state = agentStates[key] || "idle";
                  const Icon = agent.icon;

                  return (
                    <div key={key} className="flex flex-col items-center gap-1" title={agent.name}>
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-white relative transition-all",
                          agent.color,
                          state === "thinking" && "animate-pulse ring-2 ring-yellow-400",
                          state === "done" && "ring-2 ring-green-400",
                          state === "idle" && "opacity-50"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                            state === "thinking" && "bg-yellow-400",
                            state === "done" && "bg-green-400",
                            state === "idle" && "bg-gray-400"
                          )}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{agent.title.split(" ")[0]}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Broker Agent */}
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-white relative",
                    "bg-teal-500",
                    agentStates.broker === "thinking" && "animate-pulse ring-2 ring-yellow-400"
                  )}
                >
                  <Search className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-teal-600 font-medium">MedQ Broker</div>
                  <div className="text-[10px] text-muted-foreground">Data & Research Agent • Type @broker to query</div>
                </div>
                <Badge variant="outline" className="text-[10px] bg-teal-500/10 text-teal-600 border-teal-500/30">
                  Always On
                </Badge>
              </div>
            </div>
          </div>

          {/* Debate Stream */}
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">The Board is Ready</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Enter patient data and click "Consult the Board" to summon the specialist team. They will analyze, debate, and
                  reach consensus on the best treatment plan.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isHuman = msg.agentKey === "human";
                  const agent = isHuman ? null : AGENTS[msg.agentKey as keyof typeof AGENTS];
                  const Icon = agent?.icon || Users;

                  if (isHuman) {
                    return (
                      <div key={msg.id} className="flex gap-3 justify-end animate-in slide-in-from-bottom-2">
                        <div className="max-w-[80%] bg-primary text-primary-foreground rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">Dr. User</span>
                          </div>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <Stethoscope className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className="flex gap-3 animate-in slide-in-from-bottom-2">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0",
                          agent?.color || "bg-gray-500"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div
                        className={cn(
                          "flex-1 rounded-lg p-4 border",
                          msg.agentKey === "broker" ? "bg-teal-500/5 border-teal-500/20" : "bg-card border-border"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{agent?.name || "Moderator"}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {agent?.title || "Board"}
                            </Badge>
                            {msg.keyPoint && (
                              <Badge className="text-[10px] bg-amber-500/20 text-amber-600">
                                <Sparkles className="w-3 h-3 mr-1" />
                                Key Point
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Consensus Block */}
          {consensus && (
            <div className="p-4 border-t border-border">
              <Card className="border-2 border-amber-500/40 bg-amber-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-amber-600">
                    <CheckCircle className="w-4 h-4" />
                    BOARD RECOMMENDATION
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">{consensus.recommendation}</p>
                  {consensus.plan.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-amber-600 uppercase mb-2">Treatment Plan</h4>
                      <ul className="space-y-1">
                        {consensus.plan.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={copyConsensus}>
                      <Copy className="w-3 h-3 mr-1" />
                      Copy Plan
                    </Button>
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-500">
                      <FileText className="w-3 h-3 mr-1" />
                      Draft Orders
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Human Input */}
          <div className="p-4 border-t border-border bg-card/50">
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHumanInput("@broker ")}
                className="text-xs text-teal-600 border-teal-500/50 hover:bg-teal-500/10"
              >
                <Search className="w-3 h-3 mr-1" />
                @Broker
              </Button>
              <span className="text-[10px] text-muted-foreground">
                Ask questions about the diagnosis, treatment plan, or type @broker for research
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={humanInput}
                  onChange={(e) => setHumanInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendHumanMessage()}
                  placeholder={consensus 
                    ? "Ask about the treatment plan, clarify recommendations, or request alternatives..." 
                    : "Ask the board a question, @broker for data lookup, or provide context..."
                  }
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={!caseStarted}
                />
                <Button
                  size="icon"
                  onClick={sendHumanMessage}
                  disabled={!caseStarted || !humanInput.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-amber-600 hover:bg-amber-500"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
