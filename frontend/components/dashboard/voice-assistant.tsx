"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Blob as GenaiBlob, FunctionDeclaration, LiveServerMessage } from "@google/genai";
import { GoogleGenAI, Type, Modality } from "@google/genai";

/** Gemini live SDK types a custom Blob; browser Blob is accepted at runtime for PCM chunks. */
function createBlob(data: Float32Array): GenaiBlob {
  return new Blob([new Uint8Array(data.buffer)]) as unknown as GenaiBlob;
}

async function decodeAudioData(base64: string, ctx: AudioContext, _sampleRate: number, _channels: number): Promise<AudioBuffer> {
  const audioData = atob(base64);
  const arrayBuffer = new ArrayBuffer(audioData.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < audioData.length; i++) {
    view[i] = audioData.charCodeAt(i);
  }
  return ctx.decodeAudioData(arrayBuffer);
}

function decode(base64: string): string {
  return atob(base64);
}

interface VoiceAssistantProps {
  onAdjustStock: (name: string, amount: number) => string;
  onClose: () => void;
}

export function VoiceAssistant({ onAdjustStock, onClose }: VoiceAssistantProps) {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState('');
  const sessionRef = useRef<unknown>(null);
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());

  const startSession = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };
      const AudioContextCtor = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
      if (AudioContextCtor == null) {
        throw new Error('AudioContext is not supported in this browser');
      }
      const inputCtx = new AudioContextCtor({ sampleRate: 16000 });
      const outputCtx = new AudioContextCtor({ sampleRate: 24000 });
      audioContextsRef.current = { input: inputCtx, output: outputCtx };

      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

      const adjustStockTool: FunctionDeclaration = {
        name: 'adjustStock',
        parameters: {
          type: Type.OBJECT,
          description: 'Adjust the quantity of a pantry item. Positive adds, negative removes.',
          properties: {
            itemName: { type: Type.STRING, description: 'The name of the item to adjust' },
            amount: { type: Type.NUMBER, description: 'The amount to add or remove' },
          },
          required: ['itemName', 'amount'],
        },
      };

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const outCtx = audioContextsRef.current!.output;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const buffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outCtx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.outputTranscription) {
              setTranscription((prev) => prev + message.serverContent!.outputTranscription!.text);
            }
            if (message.serverContent?.turnComplete) {
              setTranscription('');
            }

            if (message.toolCall?.functionCalls != null) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'adjustStock' && fc.args != null) {
                  const result = onAdjustStock(fc.args.itemName as string, fc.args.amount as number);
                  sessionPromise.then((s) =>
                    s.sendToolResponse({
                      functionResponses: [{ id: fc.id, name: fc.name, response: { result } }],
                    })
                  );
                }
              }
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach((s) => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => setIsActive(false),
          onerror: (e) => console.error('Live session error:', e),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          tools: [{ functionDeclarations: [adjustStockTool] }],
          systemInstruction:
            'You are a helpful pantry manager. You can adjust item quantities. If a user says they used something, deduct it. If they bought something, add it. Be brief and friendly.',
          outputAudioTranscription: {},
        },
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('Failed to start voice session', err);
      alert('Microphone access is required for voice support.');
      onClose();
    }
  };

  useEffect(() => {
    startSession();
    return () => {
      if (sessionRef.current != null) (sessionRef.current as { close: () => void }).close();
      if (audioContextsRef.current != null) {
        audioContextsRef.current.input.close();
        audioContextsRef.current.output.close();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-sm p-8 flex flex-col items-center gap-8 shadow-2xl mx-4">
        <div className="relative">
          <div
            className={`absolute inset-0 bg-emerald-400 rounded-full blur-xl opacity-20 animate-pulse ${
              isActive ? 'scale-150' : ''
            }`}
          />
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-inner transition-all ${
              isActive ? 'bg-emerald-500 text-white scale-110' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {isActive ? '🎙️' : '⏳'}
          </div>
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-slate-800">{isActive ? 'Listening...' : 'Connecting...'}</h3>
          <p className="text-slate-500 text-sm italic min-h-[1.5rem]">
            {transcription || '"Try saying: I used 3 eggs"'}
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-colors"
        >
          End Session
        </button>
      </div>
    </div>
  );
};