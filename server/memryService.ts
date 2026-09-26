import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { Database } from 'bun:sqlite';

const MEMRY_VAULT = '/home/opc/memry-vault';
const MEMRY_DB_PATH = path.join(MEMRY_VAULT, '.memry', 'data.db');
const SYNC_BIN = '/usr/local/bin/eva-memry-sync';

export interface SaveToMemryOptions {
  title?: string;
  content: string;
  videoTitle?: string;
  videoId?: string;
  videoUrl?: string;
  timestamp?: number;
  folder?: string;
  tags?: string[];
  captureSource?: string;
}

export interface SaveToMemryResult {
  success: boolean;
  inboxId?: string;
  title: string;
  notePath?: string;
  folder: string;
  tags: string[];
  syncTriggered: boolean;
  error?: string;
}

function generateId(prefix = 'inbox'): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  let rand = '';
  for (let i = 0; i < 12; i++) {
    rand += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix}_${rand}`;
}

function cleanFilename(str: string): string {
  return str.replace(/[\\/*?:"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Lecture Note';
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export async function saveToMemryInbox(options: SaveToMemryOptions): Promise<SaveToMemryResult> {
  const {
    content,
    videoTitle = 'YouTube Lecture',
    videoId = '',
    timestamp = 0,
    folder = '02 - Studies & UPSC',
    captureSource = 'lumotutor_eva_chief'
  } = options;

  if (!content || !content.trim()) {
    return {
      success: false,
      title: 'Empty Content',
      folder,
      tags: [],
      syncTriggered: false,
      error: 'Content cannot be empty'
    };
  }

  // 1. Determine Title
  let title = options.title;
  const isGeneric = !title || !title.trim() || /^(given values|step|formula|solution|notes?)/i.test(title.replace(/[📌📐⚡🎯*#\s]/g, ''));
  if (isGeneric) {
    const headingMatch = content.match(/^#+\s*(.+)$/m);
    if (headingMatch && headingMatch[1].trim() && !/^(given|step|formula)/i.test(headingMatch[1].trim())) {
      title = cleanFilename(headingMatch[1].replace(/[*_`]/g, '').trim());
    } else {
      title = cleanFilename(`${videoTitle} (${formatTimestamp(timestamp)})`);
    }
  } else {
    title = cleanFilename(title!);
  }

  // 2. Format YouTube URL
  let targetUrl = options.videoUrl;
  if (!targetUrl && videoId) {
    targetUrl = `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(timestamp)}s`;
  }

  // 3. Tags
  const defaultTags = ['lumotutor', 'maths', 'eva-chief', 'study'];
  const userTags = options.tags || [];
  const mergedTags = Array.from(new Set([...defaultTags, ...userTags.map(t => t.replace(/^#/, '').toLowerCase().trim())]));

  // 4. Create Note in Vault Folder
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];
  const nowIso = now.toISOString();

  const targetDir = path.join(MEMRY_VAULT, folder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const filename = `${title}.md`;
  const notePath = path.join(targetDir, filename);

  const briefSnippet = content
    .replace(/[#*`$]/g, '')
    .split('\n')
    .filter(line => line.trim().length > 20)
    .slice(0, 3)
    .join(' ')
    .slice(0, 300) || 'Lecture solution and formula notes captured from video screen.';

  const mdContent = `---
title: "${title}"
created: ${dateStr} ${timeStr}
tags: [${mergedTags.join(', ')}]
category: "${folder}"
source: "${targetUrl || videoTitle}"
type: "document"
status: "recorded"
capture_channel: "${captureSource}"
---

# 📑 ${title}

> [!NOTE]
> **Captured by Eva Chief & LumoTutor** on ${dateStr} at ${timeStr}
> **Lecture**: [${videoTitle}](${targetUrl || '#'}) (Timestamp: \`${formatTimestamp(timestamp)}\`)
> **Vault Collection**: \`${folder}\` | **Tags**: ${mergedTags.map(t => `#${t}`).join(' ')}

## 💡 Executive Brief
${briefSnippet}

## 🎯 Mathematical Formulation, Derivation & Steps
${content}

---
*Related: [[00 - Active Brain Dashboard]], [[02 - Studies & UPSC]], [[Eva Chief]]*
`;

  try {
    fs.writeFileSync(notePath, mdContent, 'utf-8');
  } catch (err: any) {
    console.error('[memryService] Failed to write markdown file:', err);
  }

  // 5. Register in SQLite Memry Database
  let inboxId = generateId('inbox');
  try {
    if (fs.existsSync(MEMRY_DB_PATH)) {
      const db = new Database(MEMRY_DB_PATH);

      // Insert into inbox_items
      const insertInbox = db.prepare(`
        INSERT INTO inbox_items (
          id, type, title, content, created_at, modified_at,
          filed_at, filed_to, filed_action, processing_status,
          source_url, source_title, capture_source
        ) VALUES (
          ?, 'document', ?, ?, ?, ?, NULL, NULL, NULL, 'complete', ?, ?, ?
        )
      `);
      insertInbox.run(
        inboxId,
        title,
        briefSnippet,
        nowIso,
        nowIso,
        targetUrl || '',
        videoTitle,
        captureSource
      );

      // Register tags
      const tagColors = ['#7048e8', '#3b5bdb', '#2f9e44', '#f59f00', '#e03131', '#0ca678'];
      const insertTagDef = db.prepare(`
        INSERT INTO tag_definitions (name, color, created_at)
        VALUES (?, ?, ?)
        ON CONFLICT(name) DO NOTHING
      `);
      const insertItemTag = db.prepare(`
        INSERT INTO inbox_item_tags (id, item_id, tag, created_at)
        VALUES (?, ?, ?, ?)
      `);

      for (let i = 0; i < mergedTags.length; i++) {
        const tag = mergedTags[i];
        const color = tagColors[i % tagColors.length];
        insertTagDef.run(tag, color, nowIso);
        insertItemTag.run(generateId('itag'), inboxId, tag, nowIso);
      }

      db.close();
      console.log(`[memryService] Successfully registered note in inbox_items: ${inboxId}`);
    }
  } catch (dbErr: any) {
    console.error('[memryService] SQLite insertion error:', dbErr);
  }

  // 6. Trigger Background Sync
  let syncTriggered = false;
  try {
    if (fs.existsSync(SYNC_BIN)) {
      const child = spawn(SYNC_BIN, [], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      syncTriggered = true;
    }
  } catch (syncErr: any) {
    console.warn('[memryService] Sync trigger notice:', syncErr);
  }

  return {
    success: true,
    inboxId,
    title,
    notePath,
    folder,
    tags: mergedTags,
    syncTriggered
  };
}
