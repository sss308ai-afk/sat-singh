export interface VoiceCommand {
  text: string;
  action: 'type' | 'command' | 'ai' | 'format' | 'navigate';
  intent?: 'correct' | 'translate' | 'query' | 'sum' | 'bold' | 'italic' | 'heading' | 'bullet' | 'clear' | 'average';
  targetApp?: string;
}

export type AIProvider = 'ChatGPT' | 'Gemini' | 'Perplexity';

export interface AppContent {
  notepad: string;
  word: string;
  excel: string[][];
  chrome: {
    url: string;
    history: string[];
    content: string;
  };
}

export interface AppSettings {
  activeAI: AIProvider;
  isRecording: boolean;
  allowedApps: string[];
  activeApp: 'Notepad' | 'Word' | 'Excel' | 'Chrome';
}
