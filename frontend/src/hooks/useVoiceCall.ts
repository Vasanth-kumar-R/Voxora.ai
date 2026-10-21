"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { CallDetail, CallState, Message } from "@/types/call";
import { createCall, setConsent, addMessage, requestAIResponse, uploadRecording, endCall, getCallDetail } from "@/lib/api";

export function useVoiceCall() {
  const [callState, setCallState] = useState<CallState>("IDLE");
  const [activeCall, setActiveCall] = useState<CallDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [consentGranted, setConsentGranted] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isTextFallback, setIsTextFallback] = useState<boolean>(false);

  // References
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const isEndingRef = useRef<boolean>(false);
  const activeCallRef = useRef<CallDetail | null>(null);
  activeCallRef.current = activeCall;

  // Check Web Speech API availability on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRec) {
        setSpeechSupported(false);
        setIsTextFallback(true);
      }
    }
  }, []);

  // Duration Timer
  useEffect(() => {
    if (["CONNECTING", "LISTENING", "THINKING", "SPEAKING"].includes(callState)) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // Audio Level Analyser Loop
  const startAudioAnalyser = (stream: MediaStream) => {
    try {
      const ctx = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkLevel = () => {
        if (!mediaStreamRef.current) {
          setAudioLevel(0);
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const avg = sum / bufferLength;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        requestAnimationFrame(checkLevel);
      };
      checkLevel();
    } catch (e) {
      console.warn("Audio analyser initialization failed:", e);
    }
  };

  // Speak AI response with browser SpeechSynthesis and route into Web Audio
  const speakAIResponse = useCallback((text: string, onDone?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      if (onDone) onDone();
      return;
    }

    // Cancel existing speech
    window.speechSynthesis.cancel();

    // Mute customer recognition while AI is speaking to avoid feedback loop
    setIsAiSpeaking(true);
    setCallState("SPEAKING");

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1.05; // natural conversational pacing
    utterance.pitch = 1.0;

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha"))
    );
    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.onend = () => {
      setIsAiSpeaking(false);
      setCallState("LISTENING");
      // Resume speech recognition
      if (recognitionRef.current && !isEndingRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // ignore
        }
      }
      if (onDone) onDone();
    };

    utterance.onerror = (e) => {
      console.warn("Speech synthesis error or interrupted:", e);
      setIsAiSpeaking(false);
      setCallState("LISTENING");
      if (onDone) onDone();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // Send customer input to backend and process AI response
  const handleCustomerUtterance = useCallback(async (transcript: string) => {
    const call = activeCallRef.current;
    if (!call || isEndingRef.current) return;

    const cleanText = transcript.trim();
    if (!cleanText) return;

    // Append customer message to local state immediately
    const tempCustomerMsg: Message = {
      id: `local-${Date.now()}`,
      call_id: call.id,
      speaker: "customer",
      text: cleanText,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempCustomerMsg]);
    setCallState("THINKING");

    try {
      // 1. Record customer message on backend
      await addMessage(call.id, "customer", cleanText);

      // 2. Request AI response
      const res = await requestAIResponse(call.id, { customer_message: cleanText });

      // 3. Append AI message to local state
      const tempAiMsg: Message = {
        id: `ai-${Date.now()}`,
        call_id: call.id,
        speaker: "ai",
        text: res.ai_message,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempAiMsg]);

      // 4. Speak response aloud
      speakAIResponse(res.ai_message);
    } catch (err: any) {
      console.error("Error communicating with AI:", err);
      setErrorMsg("Failed to communicate with AI service. You can continue speaking or typing.");
      setCallState("LISTENING");
    }
  }, [speakAIResponse]);

  // Start Call Initiation
  const startCall = async (customerName: string, customerCompany?: string, language: string = "en") => {
    setErrorMsg(null);
    setCallDuration(0);
    setMessages([]);
    isEndingRef.current = false;
    audioChunksRef.current = [];

    try {
      // Create Call record on backend
      const newCall = await createCall({
        customer_name: customerName,
        customer_company: customerCompany,
        language,
      });

      setActiveCall(newCall);
      setCallState("CONSENT_PENDING");
      return newCall;
    } catch (err: any) {
      console.error("Failed to start call:", err);
      setErrorMsg("Could not initiate call session on backend.");
      setCallState("ERROR");
      return null;
    }
  };

  // Record Consent Decision & Request Microphone
  const submitConsent = async (consent: boolean) => {
    if (!activeCall) return;

    try {
      await setConsent(activeCall.id, consent);
      setConsentGranted(consent);

      if (!consent) {
        // Declined consent: still allow conversation, but no recording
        setIsRecording(false);
      }

      setCallState("CONNECTING");

      // Request browser microphone
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        startAudioAnalyser(stream);
      } catch (micErr: any) {
        console.warn("Microphone access declined or unavailable:", micErr);
        setIsTextFallback(true);
        setErrorMsg("Microphone permission was not granted. Switched to fallback text mode.");
      }

      // Initialize Dual-Source Web Audio Recording only if consent granted and mic available
      if (consent && stream) {
        try {
          const ctx = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
          audioContextRef.current = ctx;

          const destination = ctx.createMediaStreamDestination();
          const micSource = ctx.createMediaStreamSource(stream);
          micSource.connect(destination);

          // Create MediaRecorder from destination stream
          let mimeType = "audio/webm";
          if (!MediaRecorder.isTypeSupported("audio/webm")) {
            if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4";
            else mimeType = "";
          }

          const recorder = mimeType ? new MediaRecorder(destination.stream, { mimeType }) : new MediaRecorder(destination.stream);
          mediaRecorderRef.current = recorder;

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };

          recorder.start(1000); // chunk every 1s
          setIsRecording(true);
        } catch (recErr) {
          console.warn("MediaRecorder setup failed:", recErr);
          setIsRecording(false);
        }
      }

      // Initialize Web Speech Recognition
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          if (isAiSpeaking || isEndingRef.current) return;
          const current = event.resultIndex;
          const transcript = event.results[current][0].transcript;
          if (transcript && transcript.trim()) {
            handleCustomerUtterance(transcript);
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error !== "no-speech" && event.error !== "aborted") {
            console.warn("Speech recognition warning:", event.error);
          }
        };

        recognition.onend = () => {
          // Restart recognition if call is active and AI is not speaking
          if (!isEndingRef.current && !isAiSpeaking && ["LISTENING", "CONNECTING"].includes(callState)) {
            try {
              recognition.start();
            } catch (e) {
              // ignore
            }
          }
        };

        recognitionRef.current = recognition;
        try {
          recognition.start();
        } catch (e) {
          console.warn("Failed to start speech recognition:", e);
        }
      }

      // Request Alex's initial sales greeting
      const greetingRes = await requestAIResponse(activeCall.id, { force_greeting: true });
      const initialAiMsg: Message = {
        id: `greeting-${Date.now()}`,
        call_id: activeCall.id,
        speaker: "ai",
        text: greetingRes.ai_message,
        timestamp: new Date().toISOString(),
      };
      setMessages([initialAiMsg]);

      // Speak greeting
      speakAIResponse(greetingRes.ai_message, () => {
        setCallState("LISTENING");
      });
    } catch (err: any) {
      console.error("Error setting consent / connecting call:", err);
      setErrorMsg("Failed to connect call.");
      setCallState("ERROR");
    }
  };

  // End Call & Upload Audio
  const terminateCall = async () => {
    if (isEndingRef.current || !activeCall) return;
    isEndingRef.current = true;
    setCallState("ENDING");

    // Stop speech recognition and synthesis
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
    }

    // Stop microphone tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    // Stop MediaRecorder and collect final audio blob
    let audioBlob: Blob | null = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      await new Promise<void>((resolve) => {
        if (!mediaRecorderRef.current) return resolve();
        mediaRecorderRef.current.onstop = () => {
          if (audioChunksRef.current.length > 0) {
            audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          }
          resolve();
        };
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          resolve();
        }
      });
    }

    setIsRecording(false);
    setCallState("PROCESSING");

    // Upload recording if collected
    if (audioBlob && consentGranted) {
      try {
        await uploadRecording(activeCall.id, audioBlob, callDuration);
      } catch (upErr) {
        console.warn("Recording upload failed, but call transcript is safe:", upErr);
      }
    }

    // Finalize call and generate summary
    try {
      await endCall(activeCall.id, callDuration);
      // Refresh call detail
      const finalized = await getCallDetail(activeCall.id);
      setActiveCall(finalized);
      setMessages(finalized.messages || []);
      setCallState("COMPLETED");
    } catch (endErr) {
      console.error("Call finalization error:", endErr);
      setCallState("COMPLETED");
    }
  };

  return {
    callState,
    setCallState,
    activeCall,
    setActiveCall,
    messages,
    isRecording,
    consentGranted,
    callDuration,
    speechSupported,
    isAiSpeaking,
    audioLevel,
    errorMsg,
    isTextFallback,
    startCall,
    submitConsent,
    handleCustomerUtterance,
    terminateCall,
    speakAIResponse,
  };
}
