
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
// Fix: Added ActivityType to imports from types.ts
import { PantryItem, Activity, ActivityType, ScanResult, UsageResult } from './types';
import { scanReceipt, analyzeUsage } from './services/geminiService';

// --- Audio Utilities ---
// Custom implementation of decode as required by guidelines
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Custom implementation of encode as required by guidelines
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Audio decoding for raw PCM stream
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Create blob for real-time input
function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// --- App Components ---
type View = 'dashboard' | 'inventory' | 'ledger' | 'scan-receipt' | 'scan-usage';

const Navbar: React.FC<{ activeView: View; setView: (v: View) => void }> = ({ activeView, setView }) => {
  const links: { id: View; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'ledger', label: 'Ledger', icon: '📜' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex justify-around items-center md:top-0 md:bottom-auto md:border-t-0 md:border-b md:justify-start md:gap-8 z-50">
      <div className="hidden md:block font-bold text-xl text-emerald-600 mr-4">PantryPal</div>
      {links.map((link) => (
        <button
          key={link.id}
          onClick={() => setView(link.id)}
          className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-1 rounded-lg transition-colors ${
            activeView === link.id ? 'text-emerald-600 font-semibold bg-emerald-50' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <span className="text-xl md:text-lg">{link.icon}</span>
          <span className="text-xs md:text-sm">{link.label}</span>
        </button>
      ))}
    </nav>
  );
};

const VoiceAssistant: React.FC<{ 
  onAdjustStock: (name: string, amount: number) => string;
  onClose: () => void;
}> = ({ onAdjustStock, onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState('');
  const sessionRef = useRef<any>(null);
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());

  const startSession = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextsRef.current = { input: inputCtx, output: outputCtx };

      // Initialize GoogleGenAI right before starting the session
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
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
              // Use sessionPromise to prevent race conditions
              sessionPromise.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
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

            // Handle Transcriptions
            if (message.serverContent?.outputTranscription) {
              setTranscription(prev => prev + message.serverContent!.outputTranscription!.text);
            }
            if (message.serverContent?.turnComplete) {
              setTranscription('');
            }

            // Handle Function Calls
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'adjustStock') {
                  const result = onAdjustStock(fc.args.itemName as string, fc.args.amount as number);
                  sessionPromise.then(s => s.sendToolResponse({
                    functionResponses: [{ id: fc.id, name: fc.name, response: { result } }]
                  }));
                }
              }
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
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
          systemInstruction: 'You are a helpful pantry manager. You can adjust item quantities. If a user says they used something, deduct it. If they bought something, add it. Be brief and friendly.',
          outputAudioTranscription: {},
        }
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
      if (sessionRef.current) sessionRef.current.close();
      if (audioContextsRef.current) {
        audioContextsRef.current.input.close();
        audioContextsRef.current.output.close();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-sm p-8 flex flex-col items-center gap-8 shadow-2xl mx-4">
        <div className="relative">
          <div className={`absolute inset-0 bg-emerald-400 rounded-full blur-xl opacity-20 animate-pulse ${isActive ? 'scale-150' : ''}`} />
          <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-inner transition-all ${isActive ? 'bg-emerald-500 text-white scale-110' : 'bg-slate-100 text-slate-400'}`}>
            {isActive ? '🎙️' : '⌛'}
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

const App: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [inventory, setInventory] = useState<PantryItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  useEffect(() => {
    const savedInv = localStorage.getItem('pantry_inventory');
    const savedAct = localStorage.getItem('pantry_activities');
    if (savedInv) {
      setInventory(JSON.parse(savedInv));
    } else {
      setInventory([
        { id: '1', name: 'Milk', quantity: 2, unit: 'Gallons', category: 'Dairy', lastUpdated: new Date().toISOString() },
        { id: '2', name: 'Eggs', quantity: 12, unit: 'Pieces', category: 'Dairy', lastUpdated: new Date().toISOString() },
      ]);
    }
    if (savedAct) setActivities(JSON.parse(savedAct));
  }, []);

  useEffect(() => {
    if (inventory.length > 0) localStorage.setItem('pantry_inventory', JSON.stringify(inventory));
    localStorage.setItem('pantry_activities', JSON.stringify(activities));
  }, [inventory, activities]);

  const addActivity = (item: { id: string; name: string }, type: ActivityType, amount: number, source: Activity['source']) => {
    const newActivity: Activity = {
      id: Math.random().toString(36).substr(2, 9),
      itemId: item.id,
      itemName: item.name,
      type,
      amount: Math.abs(amount),
      timestamp: new Date().toISOString(),
      source,
    };
    setActivities(prev => [newActivity, ...prev].slice(0, 100));
  };

  const adjustStock = useCallback((name: string, amount: number) => {
    let resultMessage = "";
    setInventory(prev => {
      const updated = [...prev];
      const existing = updated.find(i => i.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        existing.quantity = Math.max(0, existing.quantity + amount);
        existing.lastUpdated = new Date().toISOString();
        addActivity({ id: existing.id, name: existing.name }, amount >= 0 ? 'ADD' : 'REMOVE', amount, 'VISUAL_USAGE');
        resultMessage = `Successfully updated ${name} to ${existing.quantity}.`;
      } else if (amount > 0) {
        const newItem: PantryItem = {
          id: Math.random().toString(36).substr(2, 9),
          name: name.charAt(0).toUpperCase() + name.slice(1),
          quantity: amount,
          unit: 'units',
          category: 'Voice Added',
          lastUpdated: new Date().toISOString()
        };
        updated.push(newItem);
        addActivity({ id: newItem.id, name: newItem.name }, 'ADD', amount, 'VISUAL_USAGE');
        resultMessage = `Added new item ${name} with quantity ${amount}.`;
      } else {
        resultMessage = `Could not find ${name} to remove.`;
      }
      return updated;
    });
    return resultMessage;
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'receipt' | 'usage') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        if (mode === 'receipt') {
          const results = await scanReceipt(base64);
          results.forEach(r => adjustStock(r.name, r.quantity));
        } else {
          const results = await analyzeUsage(base64);
          results.forEach(r => adjustStock(r.name, -r.quantityUsed));
        }
        setView('inventory');
      } catch (err) {
        alert('Error processing image.');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pt-16 max-w-5xl mx-auto px-4 sm:px-6">
      <Navbar activeView={view} setView={setView} />
      
      {isVoiceActive && (
        <VoiceAssistant 
          onAdjustStock={adjustStock} 
          onClose={() => setIsVoiceActive(false)} 
        />
      )}

      <main className="py-8">
        {view === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold text-slate-900">Welcome Home!</h1>
              <p className="text-slate-500">How would you like to update your pantry?</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setView('scan-receipt')}
                className="bg-emerald-600 text-white p-6 rounded-2xl flex flex-col items-start gap-4 hover:shadow-xl transition-all shadow-lg"
              >
                <div className="bg-white/20 p-3 rounded-xl text-2xl">🧾</div>
                <div className="text-left">
                  <h3 className="text-xl font-bold">Log Groceries</h3>
                  <p className="text-emerald-100 text-sm">Scan a receipt</p>
                </div>
              </button>

              <button
                onClick={() => setView('scan-usage')}
                className="bg-amber-500 text-white p-6 rounded-2xl flex flex-col items-start gap-4 hover:shadow-xl transition-all shadow-lg"
              >
                <div className="bg-white/20 p-3 rounded-xl text-2xl">🍳</div>
                <div className="text-left">
                  <h3 className="text-xl font-bold">Log Cooking</h3>
                  <p className="text-amber-100 text-sm">Scan counter items</p>
                </div>
              </button>

              <button
                onClick={() => setIsVoiceActive(true)}
                className="bg-indigo-600 text-white p-6 rounded-2xl flex flex-col items-start gap-4 hover:shadow-xl transition-all shadow-lg"
              >
                <div className="bg-white/20 p-3 rounded-xl text-2xl">🎙️</div>
                <div className="text-left">
                  <h3 className="text-xl font-bold">Voice Assistant</h3>
                  <p className="text-indigo-100 text-sm">"I used 2 apples"</p>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-semibold">Total Items</p>
                <p className="text-2xl font-bold text-slate-800">{inventory.length}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-semibold">Low Stock</p>
                <p className="text-2xl font-bold text-rose-500">{inventory.filter(i => i.quantity < 3).length}</p>
              </div>
            </div>
          </div>
        )}

        {view === 'inventory' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-slate-800">Your Pantry</h2>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="px-6 py-4">Item</th>
                    <th className="px-6 py-4">Quantity</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventory.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-800">{item.name}</td>
                      <td className="px-6 py-4 text-slate-600">{item.quantity} {item.unit}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${item.quantity < 3 ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'}`}>
                          {item.quantity < 3 ? 'Low' : 'Healthy'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'ledger' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Activity Ledger</h2>
            <div className="space-y-3">
              {activities.map(activity => (
                <div key={activity.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-800">{activity.itemName}</p>
                    <p className="text-xs text-slate-400">{new Date(activity.timestamp).toLocaleString()} • {activity.source.replace('_', ' ')}</p>
                  </div>
                  <p className={`font-bold ${activity.type === 'ADD' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {activity.type === 'ADD' ? '+' : '-'}{activity.amount}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(view === 'scan-receipt' || view === 'scan-usage') && (
          <div className="max-w-md mx-auto space-y-8 text-center">
            <h2 className="text-2xl font-bold">{view === 'scan-receipt' ? 'Scan Receipt' : 'Scan Usage'}</h2>
            <div className={`border-2 border-dashed border-slate-300 rounded-3xl p-12 ${isProcessing ? 'bg-slate-50' : 'bg-white'}`}>
              {isProcessing ? (
                <div className="animate-pulse space-y-4">
                  <div className="text-4xl">🌀</div>
                  <p className="text-emerald-600 font-bold">AI Analyzing...</p>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="text-6xl mb-4">{view === 'scan-receipt' ? '🧾' : '🥕'}</div>
                  <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileUpload(e, view === 'scan-receipt' ? 'receipt' : 'usage')} className="hidden" />
                  <span className="bg-emerald-600 text-white px-6 py-2 rounded-full font-bold">Take Photo</span>
                </label>
              )}
            </div>
            <button onClick={() => setView('dashboard')} className="text-slate-500">Go Back</button>
          </div>
        )}
      </main>

      <button
        onClick={() => setIsVoiceActive(true)}
        className="fixed bottom-20 right-6 md:bottom-8 md:right-8 bg-indigo-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-all z-40"
      >
        🎙️
      </button>
    </div>
  );
};

export default App;
