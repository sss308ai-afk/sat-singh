import { VoiceCommand } from "../types";

const GLOBAL_COMMANDS: Record<string, string> = {
  "delete last word": "DELETE_WORD",
  "undo": "UNDO",
  "new line": "NEW_LINE",
  "cursor left": "CURSOR_LEFT",
  "full stop": "FULL_STOP",
  "save file": "SAVE",
  "new file": "NEW",
  "सेव करो": "SAVE",
  "सुरक्षित करो": "SAVE",
  "नया बनाओ": "NEW",
  "पिछला कदम": "UNDO",
  "वापस जाओ": "UNDO",
  "नई लाइन": "NEW_LINE",
  "अगली लाइन": "NEW_LINE",
  "आखिरी शब्द मिटाओ": "DELETE_WORD",
  "शब्द हटाओ": "DELETE_WORD",
};

const EXCEL_COMMANDS: Record<string, string> = {
  "next cell": "NEXT_CELL",
  "previous cell": "PREV_CELL",
  "next row": "NEXT_ROW",
  "previous row": "PREV_ROW",
  "clear cell": "CLEAR_CELL",
  "clear all": "CLEAR_ALL",
  "sum this column": "SUM_COLUMN",
  "average this column": "AVERAGE_COLUMN",
  "औसत निकालो": "AVERAGE_COLUMN",
  "जोड़ो": "SUM_COLUMN",
  "योग करो": "SUM_COLUMN",
  "अगला सेल": "NEXT_CELL",
  "पिछला सेल": "PREV_CELL",
  "अगली पंक्ति": "NEXT_ROW",
  "पिछली पंक्ति": "PREV_ROW",
  "सब साफ करो": "CLEAR_ALL",
  "सेल साफ करो": "CLEAR_CELL",
};

const WORD_COMMANDS: Record<string, string> = {
  "bold": "BOLD",
  "italic": "ITALIC",
  "heading": "HEADING",
  "bullet point": "BULLET",
  "clear document": "CLEAR_DOC",
  "मोटा करो": "BOLD",
  "तिरछा करो": "ITALIC",
  "हेडिंग बनाओ": "HEADING",
  "लिस्ट बनाओ": "BULLET",
  "सब मिटाओ": "CLEAR_DOC",
  "डॉक्यूमेंट साफ करो": "CLEAR_DOC",
};

export const classifyIntent = (text: string, activeApp: string): VoiceCommand => {
  const lowerText = text.toLowerCase().trim();

  // Global Commands
  if (GLOBAL_COMMANDS[lowerText]) {
    return { text, action: 'command', intent: GLOBAL_COMMANDS[lowerText] as any };
  }

  // App-Specific Commands
  if (activeApp === 'Excel' && EXCEL_COMMANDS[lowerText]) {
    return { text, action: 'command', intent: EXCEL_COMMANDS[lowerText] as any };
  }
  if (activeApp === 'Word' && WORD_COMMANDS[lowerText]) {
    return { text, action: 'command', intent: WORD_COMMANDS[lowerText] as any };
  }

  // AI Triggers
  if (lowerText.includes("सुधारो") || lowerText.includes("correct") || lowerText.includes("ठीक करो")) {
    return { text: text.replace(/सुधारो|correct|ठीक करो/gi, "").trim(), action: 'ai', intent: 'correct' };
  }
  if (lowerText.includes("अनुवाद") || lowerText.includes("translate")) {
    return { text: text.replace(/अनुवाद|translate/gi, "").trim(), action: 'ai', intent: 'translate' };
  }
  if (lowerText.startsWith("क्या") || lowerText.startsWith("who") || lowerText.startsWith("how") || lowerText.startsWith("what")) {
    return { text, action: 'ai', intent: 'query' };
  }

  // Default to dictation
  return { text, action: 'type' };
};
