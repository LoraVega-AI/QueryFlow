import path from 'path';
import { readFile } from 'fs/promises';

/**
 * Lightweight language detector used during project scanning. Primarily relies on
 * file extension but can fall back to simple content heuristics (shebangs or
 * language-specific keywords) when the extension is ambiguous or missing.
 */
export class LanguageDetector {
  private static EXTENSION_MAP: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.php': 'php',
    '.rb': 'ruby',
    '.java': 'java',
    '.cs': 'csharp',
    '.go': 'go',
    '.rs': 'rust',
    '.c': 'c',
    '.cpp': 'cpp',
    '.mjs': 'javascript',
    '.json': 'json',
    '.yml': 'yaml',
    '.yaml': 'yaml'
  };

  static async detect(filePath: string): Promise<string | null> {
    const ext = path.extname(filePath).toLowerCase();
    if (ext && this.EXTENSION_MAP[ext]) {
      return this.EXTENSION_MAP[ext];
    }

    // Fallback: read first 5 lines for shebangs / keywords
    try {
      const content = await readFile(filePath, 'utf-8');
      const head = content.split(/\r?\n/).slice(0, 5).join('\n');
      if (head.startsWith('#!/usr/bin/env python') || head.startsWith('#!/usr/bin/python')) {
        return 'python';
      }
      if (head.startsWith('#!/usr/bin/env node')) {
        return 'javascript';
      }
      if (/package\s+main/.test(head)) {
        return 'go';
      }
      // Add more heuristics as necessary
    } catch {
      // ignore read errors
    }
    return null;
  }
}

export default LanguageDetector;
