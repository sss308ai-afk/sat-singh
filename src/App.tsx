/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  Settings, 
  Monitor, 
  FileText, 
  Table, 
  Chrome, 
  CheckCircle2, 
  XCircle,
  ChevronDown,
  Command,
  Eraser,
  Undo2,
  CornerDownLeft,
  ArrowLeft,
  Search,
  RotateCcw,
  Plus,
  Bold,
  Italic,
  Type,
  Download,
  Save,
  Sparkles,
  Languages,
  ArrowRight
} from 'lucide-react';
import { classifyIntent } from './services/intentService';
import { orchestrateAI } from './services/aiService';
import { AIProvider, AppSettings, AppContent } from './types';

import ReactMarkdown from 'react-markdown';

const ALLOWED_APPS: ('Notepad' | 'Word' | 'Excel' | 'Chrome')[] = ['Notepad', 'Word', 'Excel', 'Chrome'];

const INITIAL_EXCEL = Array(20).fill(0).map(() => Array(10).fill(''));
const EXCEL_COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export default function App() {
  const [settings, setSettings] = useState<AppSettings>({
    activeAI: 'ChatGPT',
    isRecording: false,
    allowedApps: ALLOWED_APPS,
    activeApp: 'Notepad',
  });

  const [appContent, setAppContent] = useState<AppContent>({
    notepad: '',
    word: '',
    excel: INITIAL_EXCEL,
    chrome: {
      url: 'https://www.google.com',
      history: [],
      content: 'Google Search Results for: Voice Typing'
    }
  });

  const [excelCursor, setExcelCursor] = useState({ r: 0, c: 0 });
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [status, setStatus] = useState<'Idle' | 'Listening' | 'Processing' | 'Saved' | 'Typing...'>('Idle');
  const [history, setHistory] = useState<AppContent[]>([]);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error('Web Speech API is not supported in this browser.');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'hi-IN';

    recognitionRef.current.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          handleFinalTranscript(event.results[i][0].transcript);
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setInterimTranscript(interim);
    };

    recognitionRef.current.onend = () => {
      if (settings.isRecording) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error("Recognition restart failed", e);
        }
      }
    };

    return () => {
      recognitionRef.current?.stop();
    };
  }, [settings.isRecording]);

  const handleFinalTranscript = async (text: string) => {
    setTranscript(text);
    setStatus('Processing');
    
    const classification = classifyIntent(text, settings.activeApp);
    
    if (classification.action === 'command') {
      handleCommand(classification);
    } else if (classification.action === 'ai') {
      const result = await orchestrateAI(classification.text, classification.intent as any, settings.activeAI);
      injectText(result);
    } else {
      setStatus('Typing...');
      injectText(text);
      setTimeout(() => setStatus('Listening'), 1000);
      return;
    }
    
    setStatus('Listening');
  };

  const saveHistory = () => {
    setHistory(prev => [...prev.slice(-10), JSON.parse(JSON.stringify(appContent))]);
  };

  const injectText = (text: string) => {
    saveHistory();
    setAppContent(prev => {
      const next = { ...prev };
      if (settings.activeApp === 'Notepad') {
        next.notepad += (next.notepad ? ' ' : '') + text;
      } else if (settings.activeApp === 'Word') {
        next.word += (next.word ? ' ' : '') + text;
      } else if (settings.activeApp === 'Excel') {
        const newExcel = [...next.excel];
        newExcel[excelCursor.r][excelCursor.c] = text;
        next.excel = newExcel;
      } else if (settings.activeApp === 'Chrome') {
        next.chrome.url = text.includes('.') ? text : `https://www.google.com/search?q=${encodeURIComponent(text)}`;
      }
      return next;
    });
  };

  const handleCommand = (cmd: any) => {
    const lowerCmd = cmd.text.toLowerCase().trim();
    saveHistory();

    if (cmd.intent === 'UNDO') {
      if (history.length > 0) {
        const last = history[history.length - 1];
        setAppContent(last);
        setHistory(prev => prev.slice(0, -1));
      }
      return;
    }

    if (cmd.intent === 'SAVE') {
      setStatus('Saved');
      setTimeout(() => setStatus('Idle'), 2000);
      return;
    }

    if (cmd.intent === 'NEW') {
      setAppContent(prev => {
        const next = { ...prev };
        if (settings.activeApp === 'Notepad') next.notepad = '';
        if (settings.activeApp === 'Word') next.word = '';
        if (settings.activeApp === 'Excel') next.excel = INITIAL_EXCEL;
        return next;
      });
      return;
    }

    if (cmd.intent === 'DELETE_WORD') {
      setAppContent(prev => {
        const next = { ...prev };
        if (settings.activeApp === 'Notepad') next.notepad = next.notepad.split(' ').slice(0, -1).join(' ');
        if (settings.activeApp === 'Word') next.word = next.word.split(' ').slice(0, -1).join(' ');
        return next;
      });
      return;
    }

    if (cmd.intent === 'NEW_LINE') {
      setAppContent(prev => {
        const next = { ...prev };
        if (settings.activeApp === 'Notepad') next.notepad += '\n';
        if (settings.activeApp === 'Word') next.word += '\n';
        if (settings.activeApp === 'Excel') setExcelCursor(p => ({ ...p, r: Math.min(p.r + 1, 19), c: 0 }));
        return next;
      });
      return;
    }

    if (settings.activeApp === 'Excel') {
      if (cmd.intent === 'NEXT_CELL') {
        setExcelCursor(prev => ({ ...prev, c: Math.min(prev.c + 1, 9) }));
      } else if (cmd.intent === 'PREV_CELL') {
        setExcelCursor(prev => ({ ...prev, c: Math.max(prev.c - 1, 0) }));
      } else if (cmd.intent === 'NEXT_ROW') {
        setExcelCursor(prev => ({ ...prev, r: Math.min(prev.r + 1, 19) }));
      } else if (cmd.intent === 'PREV_ROW') {
        setExcelCursor(prev => ({ ...prev, r: Math.max(prev.r - 1, 0) }));
      } else if (cmd.intent === 'CLEAR_CELL') {
        setAppContent(prev => {
          const next = { ...prev };
          next.excel[excelCursor.r][excelCursor.c] = '';
          return next;
        });
      } else if (cmd.intent === 'CLEAR_ALL') {
        setAppContent(prev => ({ ...prev, excel: INITIAL_EXCEL }));
      } else if (cmd.intent === 'SUM_COLUMN') {
        const sum = appContent.excel.reduce((acc, row) => acc + (parseFloat(row[excelCursor.c]) || 0), 0);
        injectText(sum.toString());
      } else if (cmd.intent === 'AVERAGE_COLUMN') {
        const values = appContent.excel.map(row => parseFloat(row[excelCursor.c])).filter(v => !isNaN(v));
        const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        injectText(avg.toFixed(2));
      }
    } else if (settings.activeApp === 'Word') {
      if (cmd.intent === 'BOLD') {
        setAppContent(prev => ({ ...prev, word: prev.word + ' **' }));
      } else if (cmd.intent === 'ITALIC') {
        setAppContent(prev => ({ ...prev, word: prev.word + ' *' }));
      } else if (cmd.intent === 'HEADING') {
        setAppContent(prev => ({ ...prev, word: prev.word + '\n# ' }));
      } else if (cmd.intent === 'BULLET') {
        setAppContent(prev => ({ ...prev, word: prev.word + '\n- ' }));
      } else if (cmd.intent === 'CLEAR_DOC') {
        setAppContent(prev => ({ ...prev, word: '' }));
      }
    }
  };

  const downloadContent = () => {
    let content = '';
    let fileName = `${settings.activeApp}_export`;
    let mimeType = 'text/plain';

    if (settings.activeApp === 'Notepad') {
      content = appContent.notepad;
      fileName += '.txt';
    } else if (settings.activeApp === 'Word') {
      content = appContent.word;
      fileName += '.md';
    } else if (settings.activeApp === 'Excel') {
      content = appContent.excel.map(row => row.join(',')).join('\n');
      fileName += '.csv';
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleRecording = () => {
    if (settings.isRecording) {
      recognitionRef.current?.stop();
      setStatus('Idle');
    } else {
      try {
        recognitionRef.current?.start();
        setStatus('Listening');
      } catch (e) {
        console.error("Recognition start failed", e);
      }
    }
    setSettings(prev => ({ ...prev, isRecording: !prev.isRecording }));
  };

  const renderAppContent = () => {
    switch (settings.activeApp) {
      case 'Excel':
        return (
          <div className="flex-1 overflow-auto bg-zinc-950 p-4">
            <div className="inline-block min-w-full">
              <div className="grid grid-cols-[40px_repeat(10,150px)] gap-px bg-zinc-800 border border-zinc-800">
                {/* Header Row */}
                <div className="h-8 bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-500 uppercase">#</div>
                {EXCEL_COLS.map(col => (
                  <div key={col} className="h-8 bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    {col}
                  </div>
                ))}
                
                {/* Data Rows */}
                {appContent.excel.map((row, r) => (
                  <React.Fragment key={r}>
                    <div className="h-10 bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-600">
                      {r + 1}
                    </div>
                    {row.map((cell, c) => (
                      <div 
                        key={`${r}-${c}`}
                        onClick={() => setExcelCursor({ r, c })}
                        className={`h-10 bg-zinc-900 flex items-center px-4 text-sm font-mono transition-all overflow-hidden whitespace-nowrap ${
                          excelCursor.r === r && excelCursor.c === c 
                            ? 'ring-2 ring-green-500 bg-green-500/10 z-10' 
                            : 'hover:bg-zinc-800'
                        }`}
                      >
                        {cell}
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        );
      case 'Word':
        return (
          <div className="flex-1 overflow-auto p-8 flex flex-col items-center bg-zinc-950">
            <div className="w-[800px] min-h-[1000px] bg-white text-black p-16 shadow-2xl rounded-sm font-serif text-lg leading-relaxed prose prose-zinc max-w-none">
              {appContent.word ? (
                <ReactMarkdown>{appContent.word}</ReactMarkdown>
              ) : (
                <span className="text-zinc-300 italic">Start dictating your document...</span>
              )}
            </div>
          </div>
        );
      case 'Chrome':
        return (
          <div className="flex-1 flex flex-col bg-zinc-100 text-black overflow-auto">
            <div className="p-2 bg-zinc-200 flex items-center gap-2 border-b border-zinc-300 sticky top-0 z-20">
              <div className="flex gap-1 mr-2">
                <div className="w-3 h-3 rounded-full bg-zinc-400" />
                <div className="w-3 h-3 rounded-full bg-zinc-400" />
                <RotateCcw className="w-4 h-4 text-zinc-600 ml-2" />
              </div>
              <div className="flex-1 bg-white rounded-full px-4 py-1 text-xs flex items-center gap-2 border border-zinc-300">
                <Search className="w-3 h-3 text-zinc-400" />
                {appContent.chrome.url}
              </div>
              <Plus className="w-4 h-4 text-zinc-600" />
            </div>
            
            <div className="flex-1 p-8 max-w-4xl mx-auto w-full bg-white min-h-full">
              <div className="flex flex-col items-center gap-8 mb-12 pt-12">
                <h1 className="text-7xl font-bold tracking-tighter">
                  <span className="text-blue-500">G</span>
                  <span className="text-red-500">o</span>
                  <span className="text-yellow-500">o</span>
                  <span className="text-blue-500">g</span>
                  <span className="text-green-500">l</span>
                  <span className="text-red-500">e</span>
                </h1>
                <div className="w-full max-w-2xl relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="w-full bg-white border border-zinc-200 hover:shadow-md focus-within:shadow-md rounded-full py-3 pl-14 pr-6 transition-all text-lg">
                    {appContent.chrome.url.includes('q=') 
                      ? decodeURIComponent(appContent.chrome.url.split('q=')[1]) 
                      : 'Search Google or type a URL'}
                  </div>
                </div>
              </div>

              {appContent.chrome.url.includes('q=') ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="text-sm text-zinc-500 border-b border-zinc-100 pb-4">
                    About 1,270,000,000 results (0.45 seconds) for <span className="font-bold italic">"{decodeURIComponent(appContent.chrome.url.split('q=')[1])}"</span>
                  </div>
                  
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="group max-w-2xl">
                      <div className="text-sm text-zinc-700 mb-1 flex items-center gap-1">
                        <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-[10px]">🌐</div>
                        https://www.example-ai-result.com › topic-{i}
                      </div>
                      <div className="text-xl text-blue-800 group-hover:underline cursor-pointer mb-1 font-medium">
                        {decodeURIComponent(appContent.chrome.url.split('q=')[1])} - Comprehensive Guide & Resources {i}
                      </div>
                      <div className="text-sm text-zinc-600 leading-relaxed">
                        This is a simulated search result generated by your voice command. In a real browser, this would display live information from the web. Our AI integration ensures that your queries are processed with high accuracy.
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  <div className="flex gap-3">
                    <button className="px-5 py-2 bg-zinc-50 hover:bg-zinc-100 border border-transparent hover:border-zinc-200 rounded text-sm transition-all">Google Search</button>
                    <button className="px-5 py-2 bg-zinc-50 hover:bg-zinc-100 border border-transparent hover:border-zinc-200 rounded text-sm transition-all">I'm Feeling Lucky</button>
                  </div>
                  <div className="text-xs text-zinc-500">
                    Google offered in: 
                    <span className="text-blue-600 hover:underline cursor-pointer ml-2">हिन्दी</span>
                    <span className="text-blue-600 hover:underline cursor-pointer ml-2">বাংলা</span>
                    <span className="text-blue-600 hover:underline cursor-pointer ml-2">తెలుగు</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return (
          <textarea
            value={appContent.notepad}
            onChange={(e) => setAppContent(prev => ({ ...prev, notepad: e.target.value }))}
            placeholder={`Start speaking to type into Notepad...`}
            className="flex-1 p-8 bg-transparent outline-none resize-none font-mono text-lg leading-relaxed placeholder:text-zinc-700"
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-orange-500/30 overflow-hidden">
      {/* Simulated Desktop Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600 rounded-full blur-[120px]" />
      </div>

      <main className="relative z-10 h-screen flex flex-col p-8 gap-8">
        {/* Header / App Selector */}
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Multi-AI Voice Typer</h1>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Windows Prototype</p>
            </div>
          </div>

          <div className="flex gap-2 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
            {ALLOWED_APPS.map(app => (
              <button
                key={app}
                onClick={() => setSettings(prev => ({ ...prev, activeApp: app }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  settings.activeApp === app 
                    ? 'bg-zinc-800 text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {app === 'Notepad' && <FileText className="w-4 h-4" />}
                {app === 'Word' && <FileText className="w-4 h-4 text-blue-400" />}
                {app === 'Excel' && <Table className="w-4 h-4 text-green-400" />}
                {app === 'Chrome' && <Chrome className="w-4 h-4 text-orange-400" />}
                {app}
              </button>
            ))}
          </div>
        </header>

        {/* Main Content Area (Simulated App) */}
        <div className="flex-1 flex gap-8">
          <section className="flex-1 bg-zinc-900/30 rounded-3xl border border-zinc-800/50 flex flex-col overflow-hidden backdrop-blur-sm">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <span className="ml-2 text-sm font-mono text-zinc-400">{settings.activeApp}.exe</span>
              </div>
              <div className="flex gap-4 items-center">
                {settings.activeApp === 'Word' && (
                  <div className="flex gap-3 border-r border-zinc-800 pr-4">
                    <button onClick={() => handleCommand({ intent: 'BOLD', text: 'bold' })} className="p-1 hover:bg-zinc-800 rounded transition-colors" title="Bold (Ctrl+B)">
                      <Bold className="w-4 h-4 text-blue-400" />
                    </button>
                    <button onClick={() => handleCommand({ intent: 'ITALIC', text: 'italic' })} className="p-1 hover:bg-zinc-800 rounded transition-colors" title="Italic (Ctrl+I)">
                      <Italic className="w-4 h-4 text-blue-400" />
                    </button>
                    <button onClick={() => handleCommand({ intent: 'HEADING', text: 'heading' })} className="p-1 hover:bg-zinc-800 rounded transition-colors" title="Heading">
                      <Type className="w-4 h-4 text-blue-400" />
                    </button>
                    <button onClick={downloadContent} className="p-1 hover:bg-zinc-800 rounded transition-colors" title="Download File">
                      <Download className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>
                )}
                {settings.activeApp === 'Excel' && (
                  <div className="flex gap-3 border-r border-zinc-800 pr-4">
                    <button onClick={() => handleCommand({ intent: 'SUM_COLUMN', text: 'sum' })} className="p-1 hover:bg-zinc-800 rounded transition-colors" title="Sum">
                      <Plus className="w-4 h-4 text-green-400" />
                    </button>
                    <button onClick={() => handleCommand({ intent: 'CLEAR_ALL', text: 'clear all' })} className="p-1 hover:bg-zinc-800 rounded transition-colors" title="Clear All">
                      <RotateCcw className="w-4 h-4 text-red-400" />
                    </button>
                    <button onClick={downloadContent} className="p-1 hover:bg-zinc-800 rounded transition-colors" title="Download CSV">
                      <Download className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>
                )}
                {settings.activeApp === 'Notepad' && (
                  <div className="flex gap-3 border-r border-zinc-800 pr-4">
                    <button onClick={() => handleCommand({ intent: 'NEW', text: 'clear' })} className="p-1 hover:bg-zinc-800 rounded transition-colors" title="Clear Notepad">
                      <RotateCcw className="w-4 h-4 text-red-400" />
                    </button>
                    <button onClick={downloadContent} className="p-1 hover:bg-zinc-800 rounded transition-colors" title="Download Text">
                      <Download className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>
                )}
                <div className="text-xs text-zinc-500 font-mono">UTF-8 | Windows (CRLF)</div>
              </div>
            </div>
            {renderAppContent()}
          </section>

          {/* Floating UI Overlay (Simulated) */}
          <aside className="w-80 flex flex-col gap-4">
            <motion.div 
              layout
              className="bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden"
            >
              {/* Status Bar */}
              <div className="p-4 bg-zinc-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      status === 'Saved' ? 'bg-green-500' : 
                      settings.isRecording ? 'bg-red-500 animate-pulse' : 'bg-zinc-600'
                    }`} />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      {status === 'Saved' ? 'FILE SAVED' : status}
                    </span>
                </div>
                <Settings className="w-4 h-4 text-zinc-500 cursor-pointer hover:text-white transition-colors" />
              </div>

              {/* Live Transcript Area */}
              <div className="p-6 min-h-[120px] flex flex-col justify-center">
                <p className="text-zinc-500 text-xs uppercase font-bold mb-2 tracking-widest">Live Transcript</p>
                <p className="text-lg font-medium leading-tight">
                  {interimTranscript || transcript || (settings.isRecording ? "Listening for your voice..." : "Mic is currently OFF")}
                </p>
              </div>

              {/* AI Selector */}
              <div className="p-4 border-t border-zinc-800 grid grid-cols-3 gap-2">
                {(['ChatGPT', 'Gemini', 'Perplexity'] as AIProvider[]).map(ai => (
                  <button
                    key={ai}
                    onClick={() => setSettings(prev => ({ ...prev, activeAI: ai }))}
                    className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all border ${
                      settings.activeAI === ai 
                        ? 'bg-white text-black border-white' 
                        : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {ai === 'ChatGPT' ? 'GPT' : ai === 'Gemini' ? 'GEM' : 'PRP'}
                  </button>
                ))}
              </div>

              {/* Controls */}
              <div className="p-6 bg-zinc-800/20 flex items-center justify-between gap-4">
                <button
                  onClick={toggleRecording}
                  className={`flex-1 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 ${
                    settings.isRecording 
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                      : 'bg-white text-black shadow-lg shadow-white/10'
                  }`}
                >
                  {settings.isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  <span className="font-bold uppercase text-sm">{settings.isRecording ? 'Stop' : 'Start'}</span>
                </button>
                
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    ON
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase">
                    <Monitor className="w-3 h-3 text-blue-500" />
                    Active
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Command Guide */}
            <div className="bg-zinc-900/50 rounded-3xl border border-zinc-800/50 p-6 overflow-auto max-h-[400px]">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Voice Commands (EN/HI)</h3>
              <div className="space-y-3">
                <CommandItem icon={<Eraser className="w-3 h-3" />} text="delete word / शब्द हटाओ" />
                <CommandItem icon={<Undo2 className="w-3 h-3" />} text="undo / वापस जाओ" />
                <CommandItem icon={<CornerDownLeft className="w-3 h-3" />} text="new line / नई लाइन" />
                <CommandItem icon={<Save className="w-3 h-3" />} text="save file / सेव करो" />
                
                <div className="pt-2 border-t border-zinc-800">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase mb-2">App Specific</p>
                  {settings.activeApp === 'Excel' && (
                    <>
                      <CommandItem icon={<ArrowRight className="w-3 h-3" />} text="next cell / अगला सेल" />
                      <CommandItem icon={<Plus className="w-3 h-3" />} text="sum / जोड़ो" />
                      <CommandItem icon={<RotateCcw className="w-3 h-3" />} text="clear all / सब साफ करो" />
                    </>
                  )}
                  {settings.activeApp === 'Word' && (
                    <>
                      <CommandItem icon={<Bold className="w-3 h-3" />} text="bold / मोटा करो" />
                      <CommandItem icon={<Italic className="w-3 h-3" />} text="italic / तिरछा करो" />
                      <CommandItem icon={<Type className="w-3 h-3" />} text="heading / हेडिंग बनाओ" />
                    </>
                  )}
                </div>

                <div className="pt-2 border-t border-zinc-800">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase mb-2">AI Triggers</p>
                  <CommandItem icon={<Sparkles className="w-3 h-3 text-purple-400" />} text="correct... / सही करो..." />
                  <CommandItem icon={<Languages className="w-3 h-3 text-blue-400" />} text="translate... / अनुवाद करो..." />
                  <CommandItem icon={<Search className="w-3 h-3 text-orange-400" />} text="query... / सवाल..." />
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Footer Stats */}
        <footer className="flex justify-between items-center text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
          <div className="flex gap-6">
            <span>Latency: &lt;1s</span>
            <span>CPU: 12%</span>
            <span>Memory: 45MB</span>
          </div>
          <div className="flex gap-4">
            <span>No Mouse Control Enabled</span>
            <span>Secure API Connection</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

function CommandItem({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <div className="flex items-center justify-between group cursor-help">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
          {icon}
        </div>
        <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors italic">"{text}"</span>
      </div>
      <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 group-hover:bg-orange-500 transition-colors" />
    </div>
  );
}

