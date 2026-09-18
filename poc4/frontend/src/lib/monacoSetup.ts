import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === 'json') return new jsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
    if (label === 'typescript' || label === 'javascript') return new tsWorker();
    return new editorWorker();
  },
};

loader.config({ monaco });

monaco.editor.defineTheme('manao-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '68766f', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'dfff82' },
    { token: 'keyword.control', foreground: 'dfff82' },
    { token: 'string', foreground: '9ed7c3' },
    { token: 'number', foreground: 'f2c879' },
    { token: 'type', foreground: '87c7ff' },
    { token: 'type.identifier', foreground: '87c7ff' },
    { token: 'delimiter', foreground: 'aab7b1' },
    { token: 'tag', foreground: 'dfff82' },
    { token: 'attribute.name', foreground: '87c7ff' },
  ],
  colors: {
    'editor.background': '#0b100e',
    'editor.foreground': '#e7efeb',
    'editorCursor.foreground': '#dfff82',
    'editorLineNumber.foreground': '#44514b',
    'editorLineNumber.activeForeground': '#dfff82',
    'editor.selectionBackground': '#294436',
    'editor.inactiveSelectionBackground': '#1b2c24',
    'editor.lineHighlightBackground': '#121a16',
    'editor.lineHighlightBorder': '#00000000',
    'editorIndentGuide.background1': '#1c2823',
    'editorIndentGuide.activeBackground1': '#43544c',
    'editorGutter.background': '#0b100e',
    'editorWidget.background': '#141c18',
    'editorWidget.border': '#2a3731',
    'editorSuggestWidget.background': '#141c18',
    'editorSuggestWidget.border': '#2a3731',
    'editorSuggestWidget.selectedBackground': '#25342c',
    'editorHoverWidget.background': '#141c18',
    'editorHoverWidget.border': '#2a3731',
    'minimap.background': '#0b100e',
    'scrollbarSlider.background': '#43544c55',
    'scrollbarSlider.hoverBackground': '#5e726866',
    'scrollbarSlider.activeBackground': '#dfff8255',
  },
});

const monacoGlobal = globalThis as typeof globalThis & { monaco?: typeof monaco };
monacoGlobal.monaco = monaco;
