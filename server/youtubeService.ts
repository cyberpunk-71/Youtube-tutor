import { VideoMetadata, VideoChapter, TranscriptItem } from '../src/types/tutor';
import { CURATED_LIBRARY } from './curatedLibrary';
import fs from 'fs';
import path from 'path';

// In-memory cache for fast lookups
const videoCache = new Map<string, VideoMetadata>();

// Filesystem cache directory
const CACHE_DIR = path.join(process.cwd(), '.cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export function extractYoutubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const cleaned = urlOrId.trim();
  
  // Direct ID check (11 chars alphanumeric + _ -)
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleaned)) {
    return cleaned;
  }

  // Matches standard watch, embed, v, shorts, youtu.be
  const match = cleaned.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
}

export function toSeconds(val: any): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    const parts = trimmed.split(':').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    const num = Number(trimmed);
    if (!isNaN(num)) return num;
  }
  return 0;
}

export function parseJsonWithLatexSanitization(rawText: string): any | null {
  if (!rawText) return null;
  let cleaned = rawText.trim();
  const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) cleaned = match[1].trim();

  // 1. Direct parse
  try {
    return JSON.parse(cleaned);
  } catch {}

  // 2. Sanitize unescaped LaTeX backslashes
  try {
    const sanitized = cleaned.replace(/\\([^"\\\/bfnrtu]|u(?!([0-9a-fA-F]{4})))/g, '\\\\$1');
    return JSON.parse(sanitized);
  } catch {}

  // 3. Substring extract { ... }
  try {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      const slice = cleaned.substring(start, end + 1);
      const sanitized = slice.replace(/\\([^"\\\/bfnrtu]|u(?!([0-9a-fA-F]{4})))/g, '\\\\$1');
      return JSON.parse(sanitized);
    }
  } catch {}

  return null;
}

function extractJsonObject(str: string, startIndex: number): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIndex; i < str.length; i++) {
    const c = str[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\') {
      escape = true;
      continue;
    }
    if (c === '"' && !escape) {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          return str.substring(startIndex, i + 1);
        }
      }
    }
  }
  return null;
}

interface ScrapedDetails {
  title: string;
  author: string;
  description: string;
  duration: number;
  thumbnail: string;
  rawChapters: Array<{ timeStr: string; seconds: number; title: string }>;
}

async function scrapeYoutubeDetails(videoId: string): Promise<ScrapedDetails | null> {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!resp.ok) return null;
    const html = await resp.text();

    const startData = html.indexOf('ytInitialData = ');
    let title = '';
    let author = '';
    let description = '';
    let duration = 600;
    let thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    const rawChapters: Array<{ timeStr: string; seconds: number; title: string }> = [];

    // Length from HTML
    const lengthMatch = html.match(/"lengthSeconds":"(\d+)"/);
    if (lengthMatch) {
      duration = parseInt(lengthMatch[1], 10) || 600;
    }

    if (startData !== -1) {
      const braceIndex = html.indexOf('{', startData);
      const rawData = extractJsonObject(html, braceIndex);
      if (rawData) {
        try {
          const data = JSON.parse(rawData);
          const twoCol = data.contents?.twoColumnWatchNextResults;
          const primary = twoCol?.results?.results?.contents?.find((c: any) => c.videoPrimaryInfoRenderer)?.videoPrimaryInfoRenderer;
          if (primary) {
            title = primary.title?.runs?.map((r: any) => r.text).join('') || '';
          }
          const secondary = twoCol?.results?.results?.contents?.find((c: any) => c.videoSecondaryInfoRenderer)?.videoSecondaryInfoRenderer;
          if (secondary) {
            author = secondary.owner?.videoOwnerRenderer?.title?.runs?.map((r: any) => r.text).join('') || '';
            description = secondary.attributedDescription?.content || '';
          }

          // Macro marker chapters
          for (const p of data.engagementPanels || []) {
            const macroMarkers = p.engagementPanelSectionListRenderer?.content?.macroMarkersListRenderer?.contents;
            if (macroMarkers && macroMarkers.length > 0) {
              for (const m of macroMarkers) {
                const item = m.macroMarkersListItemRenderer;
                if (item) {
                  const chTitle = item.title?.simpleText || item.title?.runs?.map((r: any) => r.text).join('') || '';
                  const timeStr = item.timeDescription?.simpleText || item.timeDescription?.runs?.map((r: any) => r.text).join('') || '0:00';
                  rawChapters.push({ timeStr, seconds: toSeconds(timeStr), title: chTitle });
                }
              }
            }
          }
        } catch (e) {
          console.warn('Error parsing ytInitialData JSON:', e);
        }
      }
    }

    // Fallback title from <title> tag if not found
    if (!title) {
      const titleMatch = html.match(/<title>(.*?)<\/title>/);
      if (titleMatch) {
        title = titleMatch[1].replace(' - YouTube', '').trim();
      }
    }

    // Fallback description from meta tag if not found
    if (!description) {
      const descMatch = html.match(/<meta name="description" content="([\s\S]*?)">/);
      if (descMatch) {
        description = descMatch[1].trim();
      }
    }

    // If macro markers were empty, extract timestamps from description
    if (rawChapters.length === 0 && description) {
      const timeRegex = /(?:^|\n)\s*(\d{1,2}:\d{2}(?::\d{2})?)\s+[-–—:]?\s*([^\n\r]+)/g;
      let match;
      while ((match = timeRegex.exec(description)) !== null) {
        const timeStr = match[1];
        const chTitle = match[2].trim();
        rawChapters.push({ timeStr, seconds: toSeconds(timeStr), title: chTitle });
      }
    }

    return {
      title: title || `Lecture (${videoId})`,
      author: author || 'Educator',
      description,
      duration,
      thumbnail,
      rawChapters
    };
  } catch (err) {
    console.warn('Error in scrapeYoutubeDetails:', err);
    return null;
  }
}

export async function getVideoMetadata(urlOrId: string): Promise<VideoMetadata> {
  const videoId = extractYoutubeId(urlOrId);
  if (!videoId) {
    throw new Error('Invalid YouTube URL or Video ID');
  }

  // 1. Check in-memory cache
  if (videoCache.has(videoId)) {
    return videoCache.get(videoId)!;
  }

  // 2. Check curated library for instant high-precision payload
  const existing = CURATED_LIBRARY.find(v => v.id === videoId);
  if (existing) {
    videoCache.set(videoId, existing);
    return existing;
  }

  // 3. Check persistent disk cache
  const cacheFilePath = path.join(CACHE_DIR, `video_meta_${videoId}.json`);
  if (fs.existsSync(cacheFilePath)) {
    try {
      const cachedData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
      if (cachedData && cachedData.chapters && cachedData.chapters.length > 0) {
        videoCache.set(videoId, cachedData);
        return cachedData;
      }
    } catch {}
  }

  // 4. Scrape real YouTube video details (title, author, duration, real author chapters, description)
  const scraped = await scrapeYoutubeDetails(videoId);

  let title = scraped?.title || `YouTube Lecture (${videoId})`;
  let channel = scraped?.author || 'YouTube Educator';
  let duration = scraped?.duration || 600;
  let thumbnail = scraped?.thumbnail || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  let description = scraped?.description || '';
  const rawChapters = scraped?.rawChapters || [];

  // Fallback to oEmbed if title is still generic
  if (title.startsWith('YouTube Lecture') || channel === 'YouTube Educator') {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const resp = await fetch(oembedUrl);
      if (resp.ok) {
        const data = await resp.json() as any;
        if (data.title) title = data.title;
        if (data.author_name) channel = data.author_name;
        if (data.thumbnail_url) thumbnail = data.thumbnail_url;
      }
    } catch {}
  }

  // 5. Synthesize rich blackboard content, LaTeX equations, and transcript
  let chapters: VideoChapter[] = [];
  let transcript: TranscriptItem[] = [];

  const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

  const chapterPromptContext = rawChapters.length > 0
    ? `Author's Defined Chapters & Timestamps:\n${rawChapters.map((c, i) => `${i + 1}. [${c.timeStr}] ${c.title}`).join('\n')}`
    : `Please partition this ${duration}-second lecture into 5 to 7 logical sequential micro-chapters.`;

  const prompt = `You are a world-renowned university STEM professor and lecture blackboard analyst.
Video Title: "${title}"
Channel/Instructor: "${channel}"
Duration: ${duration} seconds.
Description snippet: "${description.substring(0, 500)}"

${chapterPromptContext}

For EACH chapter in this lecture:
Generate the exact on-screen visual demonstration, chalkboard diagrams, mathematical variables, and LaTeX equations that a student sees on the blackboard during that segment.

For each chapter provide:
1. chapterNumber (integer starting at 1)
2. startTime (seconds)
3. endTime (seconds)
4. title (clear section title)
5. summary (1-2 sentences on pedagogical concept)
6. blackboardContent (detailed description of visual chalkboard drawings, graphs, geometric shapes, variables, and worked problems on screen)
7. equations (array of LaTeX strings visible or derived, e.g. ["\\\\mathbf{a}^{(0)}", "\\\\sigma(w x + b)"])
8. keyConcepts (array of 3-5 strings)
9. sampleTranscript (2-3 sentences of spoken dialogue at this moment)

Return pure JSON matching this schema:
\`\`\`json
{
  "chapters": [
    {
      "chapterNumber": 1,
      "startTime": 0,
      "endTime": 120,
      "title": "Title",
      "summary": "Summary",
      "blackboardContent": "Blackboard drawings and formulas",
      "equations": ["LaTeX string"],
      "keyConcepts": ["Concept 1", "Concept 2"],
      "sampleTranscript": "What the professor is saying"
    }
  ]
}
\`\`\``;

  const tryParseSyllabus = (rawText: string): boolean => {
    const parsed = parseJsonWithLatexSanitization(rawText);
    if (!parsed) return false;

    if (parsed.chapters && Array.isArray(parsed.chapters) && parsed.chapters.length > 0) {
      chapters = parsed.chapters.map((ch: any, idx: number) => {
        const start = toSeconds(ch.startTime);
        let end = toSeconds(ch.endTime);
        if (!end || end <= start) {
          end = idx < parsed.chapters.length - 1
            ? toSeconds(parsed.chapters[idx + 1].startTime)
            : Math.max(start + 180, duration);
        }

        if (ch.sampleTranscript) {
          transcript.push({
            start,
            duration: Math.max(10, Math.min(60, end - start)),
            text: String(ch.sampleTranscript)
          });
        }

        return {
          id: ch.id || `ch-${videoId}-${idx + 1}`,
          chapterNumber: ch.chapterNumber || (idx + 1),
          startTime: start,
          endTime: end,
          title: ch.title || `Section ${idx + 1}`,
          summary: ch.summary || '',
          blackboardContent: ch.blackboardContent || '',
          equations: Array.isArray(ch.equations) ? ch.equations : [],
          keyConcepts: Array.isArray(ch.keyConcepts) ? ch.keyConcepts : []
        };
      });
    }

    // Sort transcript by timestamp
    transcript.sort((a, b) => a.start - b.start);
    return chapters.length > 0;
  };

  // 1. Tier 1: Groq Fast High-Precision LLM (GPT-OSS-120B / Qwen 27B in ~1.5s)
  if (GROQ_API_KEY) {
    for (const model of ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b']) {
      try {
        const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            response_format: { type: 'json_object' },
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 3000
          }),
          signal: AbortSignal.timeout(12000)
        });
        if (groqResp.ok) {
          const gData = await groqResp.json() as any;
          const text = gData?.choices?.[0]?.message?.content || '';
          if (tryParseSyllabus(text)) break;
        }
      } catch (err) {
        console.warn('Groq syllabus synthesis notice for', model, err);
      }
    }
  }

  // 2. Tier 2: Local Antigravity Gemini Proxy (:8090)
  if (chapters.length === 0) {
    try {
      const localResp = await fetch('http://127.0.0.1:8090/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-3.8-flash',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2
        }),
        signal: AbortSignal.timeout(20000)
      });
      if (localResp.ok) {
        const aiData = await localResp.json() as any;
        const text = aiData?.choices?.[0]?.message?.content || '';
        tryParseSyllabus(text);
      }
    } catch (err) {
      console.warn('Antigravity Proxy syllabus synthesis failed:', err);
    }
  }

  // 3. Tier 3: OpenRouter Free Models
  if (chapters.length === 0 && OPENROUTER_API_KEY) {
    for (const model of ['google/gemma-4-31b-it:free', 'qwen/qwen3.8-27b:free']) {
      try {
        const openRouterResp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://mytutor.local'
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 3000
          }),
          signal: AbortSignal.timeout(12000)
        });
        if (openRouterResp.ok) {
          const oData = await openRouterResp.json() as any;
          const text = oData?.choices?.[0]?.message?.content || '';
          if (tryParseSyllabus(text)) break;
        }
      } catch (err) {
        console.warn('OpenRouter syllabus synthesis notice for', model, err);
      }
    }
  }

  // 4. Deterministic fallback from rawChapters if AI synthesis failed
  if (chapters.length === 0 && rawChapters.length > 0) {
    chapters = rawChapters.map((rc, idx) => {
      const nextRc = rawChapters[idx + 1];
      const end = nextRc ? nextRc.seconds : duration;
      return {
        id: `ch-${videoId}-${idx + 1}`,
        chapterNumber: idx + 1,
        startTime: rc.seconds,
        endTime: end,
        title: rc.title,
        summary: `Lecture section: ${rc.title}`,
        blackboardContent: `Visual presentation and discussion of ${rc.title}`,
        equations: [],
        keyConcepts: [rc.title]
      };
    });
  }

  // 5. Default fallback chapters if everything else failed
  if (chapters.length === 0) {
    chapters = [
      {
        id: `ch-${videoId}-1`,
        chapterNumber: 1,
        startTime: 0,
        endTime: Math.min(duration, 300),
        title: 'Lecture Introduction & Setup',
        summary: 'Overview of the central topic, background concepts, and roadmap.',
        blackboardContent: 'Topic overview & key definitions',
        equations: [],
        keyConcepts: ['Introduction', 'Core definitions']
      },
      {
        id: `ch-${videoId}-2`,
        chapterNumber: 2,
        startTime: Math.min(duration, 300),
        endTime: duration,
        title: 'Deep Dive & Derivation',
        summary: 'Step-by-step mathematical derivation and physical examples.',
        blackboardContent: 'Main proof and example applications',
        equations: [],
        keyConcepts: ['Derivation', 'Examples']
      }
    ];
  }

  const result: VideoMetadata = {
    id: videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title,
    channel,
    duration,
    thumbnail,
    chapters,
    transcript: transcript.length > 0 ? transcript : undefined
  };

  // Cache in memory and on disk
  videoCache.set(videoId, result);
  try {
    fs.writeFileSync(cacheFilePath, JSON.stringify(result, null, 2), 'utf-8');
  } catch {}

  return result;
}

export async function captureVideoFrame(videoId: string, timestampSeconds: number): Promise<{ frameUrl: string; base64?: string }> {
  // Ensure frames output directory exists
  const framesDir = path.join(process.cwd(), 'public', 'captured_frames');
  if (!fs.existsSync(framesDir)) {
    fs.mkdirSync(framesDir, { recursive: true });
  }

  const filename = `${videoId}_t${Math.floor(timestampSeconds)}.jpg`;
  const filepath = path.join(framesDir, filename);
  const relativeUrl = `/captured_frames/${filename}`;

  if (fs.existsSync(filepath)) {
    const base64 = fs.readFileSync(filepath).toString('base64');
    return { frameUrl: relativeUrl, base64: `data:image/jpeg;base64,${base64}` };
  }

  // Use YouTube's high quality frame thumbnail
  const thumbUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  return { frameUrl: thumbUrl };
}
