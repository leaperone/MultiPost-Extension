/**
 * Ayu Theme Unified Color Palette
 * 统一配色方案，供 CodeMirror / Markdown Style 等使用
 * 基于 ayu-theme/ayu-colors 官方配色
 */

export const ayuLight = {
  // 基础色
  bg: '#fcfcfc',
  bgSecondary: '#f8f9fa',
  bgWidget: '#fafafa',
  fg: '#5c6166',
  fgMuted: '#828e9f',
  fgComment: '#787b80',

  // 功能色
  accent: '#f29718',
  error: '#e65050',
  success: '#6cbf43',
  warning: '#f2a300',
  info: '#55b4d4',
  modified: '#478acc',

  // 语法色
  string: '#86b300',
  keyword: '#ff7e33',
  function: '#f2a300',
  type: '#399ee6',
  number: '#a37acc',
  regex: '#4cbf99',
  member: '#f07171',
  decorator: '#d9b077',
  operator: '#ed9366',
  tag: '#55b4d4',

  // UI 色
  borderSolid: '#e6e8eb',
  border: '#6b7d8f1f',
  selection: '#035bd626',
  activeLine: '#828e9f1a',
  cursor: '#f29718',
  highlight: '#ffe294',
} as const

export const ayuMirage = {
  // 基础色
  bg: '#1f2430',
  bgSecondary: '#242936',
  bgWidget: '#282e3b',
  fg: '#cccac2',
  fgMuted: '#707a8c',
  fgComment: '#b8cfe680',

  // 功能色
  accent: '#ffcc66',
  error: '#ff6666',
  success: '#87d96c',
  warning: '#ffcc66',
  info: '#5ccfe6',
  modified: '#80bfff',

  // 语法色
  string: '#d5ff80',
  keyword: '#ffa659',
  function: '#ffcd66',
  type: '#73d0ff',
  number: '#dfbfff',
  regex: '#95e6cb',
  member: '#f28779',
  decorator: '#d9be98',
  operator: '#f29e74',
  tag: '#5ccfe6',

  // UI 色
  borderSolid: '#282e3b',
  border: '#171b24',
  selection: '#409fff40',
  activeLine: '#1a1f29',
  cursor: '#ffcc66',
  highlight: '#736950',
} as const

export type AyuPalette = typeof ayuLight | typeof ayuMirage
