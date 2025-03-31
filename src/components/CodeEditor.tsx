'use client';

import React, { useEffect, useRef } from 'react';
import Editor, { EditorProps } from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string;
  width?: string;
  theme?: 'vs-dark' | 'light';
  readOnly?: boolean;
  options?: Record<string, any>;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'typescript',
  height = '400px',
  width = '100%',
  theme = 'vs-dark',
  readOnly = false,
  options = {}
}) => {
  const editorRef = useRef<any>(null);

  // Handle editor mount
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Register PineScript language if not already registered
    if (language === 'pine' && !monaco.languages.getLanguages().some((lang: any) => lang.id === 'pine')) {
      registerPineScriptLanguage(monaco);
    }
  };

  // Register PineScript syntax highlighting
  const registerPineScriptLanguage = (monaco: any) => {
    monaco.languages.register({ id: 'pine' });
    
    monaco.languages.setMonarchTokensProvider('pine', {
      // Set tokenizer
      tokenizer: {
        root: [
          // Comments
          [/\/\/.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
          
          // Strings
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string'],
          
          // Keywords
          [/\b(if|else|for|to|by|while|study|strategy|var|series|simple|line|label|function|export|import|return|from|when|and|or|not|na|switch|case|default)\b/, 'keyword'],
          
          // Types
          [/\b(int|float|bool|color|string|label|line|series|simple)\b/, 'type'],
          
          // Built-in functions
          [/\b(plot|hline|fill|barcolor|bgcolor|strategy\.entry|strategy\.exit|strategy\.close|strategy\.risk\.allow_entry_in|input|ta\.sma|ta\.ema|ta\.rsi|ta\.macd|ta\.stoch|ta\.crossover|ta\.crossunder|request\.security)\b/, 'function'],
          
          // TradingView operators
          [/=>|:|\?|\[|\]|<|>|==|!=|<=|>=|=|!|\+|-|\*|\/|%|\(|\)|,/, 'operator'],
          
          // Numbers
          [/\b\d+(\.\d+)?\b/, 'number'],
          
          // Variables
          [/[a-zA-Z_]\w*/, 'variable'],
        ],
        comment: [
          [/[^/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[/*]/, 'comment']
        ],
        string: [
          [/[^\\"]+/, 'string'],
          [/\\./, 'string.escape'],
          [/"/, 'string', '@pop']
        ]
      }
    });
    
    // Set configuration for the editor when Pine script is active
    monaco.editor.defineTheme('pine-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'variable', foreground: '9CDCFE' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'operator', foreground: 'D4D4D4' }
      ],
      colors: {
        'editor.foreground': '#D4D4D4',
        'editor.background': '#1E1E1E',
        'editor.selectionBackground': '#264F78',
        'editor.lineHighlightBackground': '#2A2D2E'
      }
    });
  };

  return (
    <Editor
      height={height}
      width={width}
      language={language}
      value={value}
      theme={language === 'pine' ? 'pine-dark' : theme}
      onChange={(value) => onChange(value || '')}
      options={{
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        readOnly,
        fontSize: 14,
        ...options
      }}
      onMount={handleEditorDidMount}
    />
  );
}; 