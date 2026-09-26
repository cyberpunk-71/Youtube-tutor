import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { TutorMessage, InteractiveDiagram, QuizQuestion, TutorMode, CanvasNode } from '../src/types/tutor';
import { findActiveChapter, getLiveSceneState } from '../src/utils/chapterHelper';

const execFileAsync = promisify(execFile);

export interface ChatHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AskTutorParams {
  question: string;
  mode?: TutorMode;
  answerDepth?: 'detailed' | 'medium' | 'quick';
  timestamp: number;
  videoId?: string;
  videoTitle: string;
  channel: string;
  chapters?: any[];
  coveredHistory?: string[];
  nearbyTranscript?: string;
  activeChapter?: any;
  activeMicroScene?: any;
  chatHistory?: ChatHistoryTurn[];
  studentDrawingBase64?: string;
  blackboardFrameBase64?: string;
  frameUrl?: string;
  canvasCoordinates?: { x: number; y: number; width?: number; height?: number };
}

// 1. Local OCR Text Extraction via Tesseract (Sub-100ms)
export async function extractOcrTextFromBase64(base64Data?: string): Promise<string> {
  if (!base64Data || !base64Data.includes('base64,')) return '';
  const tmpFile = path.join('/tmp', `ocr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`);
  try {
    const cleanB64 = base64Data.split('base64,')[1];
    await fs.promises.writeFile(tmpFile, Buffer.from(cleanB64, 'base64'));
    const { stdout } = await execFileAsync('/usr/bin/tesseract', [tmpFile, 'stdout', '--psm', '6'], { timeout: 3500 });
    return (stdout || '').trim();
  } catch (err) {
    return '';
  } finally {
    try { await fs.promises.unlink(tmpFile); } catch {}
  }
}

// 2. High-Speed Multimodal Vision: NVIDIA NIM (Llama 3.2 11B Vision)
const NVIDIA_NIM_API_KEY = process.env.NVIDIA_NIM_API_KEY || '';
const NVIDIA_NIM_BASE_URL = process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1';

// 3. Ultra-Fast Text & Math Engine: Groq (Qwen 3.8 27B & GPT-OSS-120B)
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODELS = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b'];

// 4. Hermes Antigravity Proxy (:8090 - Gemini Flash Low Reasoning Effort for Fast Response)
const LOCAL_ANTIGRAVITY_MODELS = ['gemini-3.8-flash-low', 'gemini-3.7-flash-low'];

export async function askTutor(params: AskTutorParams): Promise<Partial<TutorMessage> & { canvasNode?: Partial<CanvasNode> }> {
  const {
    question,
    mode = 'explain',
    answerDepth = 'medium',
    timestamp,
    videoId,
    videoTitle,
    channel,
    chapters = [],
    coveredHistory = [],
    nearbyTranscript = '',
    activeChapter: customActiveChapter,
    activeMicroScene,
    chatHistory = [],
    studentDrawingBase64,
    blackboardFrameBase64,
    frameUrl,
    canvasCoordinates
  } = params;

  const currentMinSec = `${Math.floor(timestamp / 60)}:${String(Math.floor(timestamp % 60)).padStart(2, '0')}`;
  const activeChapter = customActiveChapter || findActiveChapter(chapters, timestamp);
  const liveScene = activeMicroScene || getLiveSceneState(chapters, undefined, timestamp);

  const activeFocusTitle = liveScene?.stepTitle || activeChapter?.title || 'Active Lecture Demonstration';
  const activeChalkboardNotes = liveScene?.blackboardNotes || liveScene?.blackboardText || activeChapter?.blackboardContent || '';
  const activeEquations = (liveScene?.visibleEquations && liveScene.visibleEquations.length > 0)
    ? liveScene.visibleEquations
    : (liveScene?.equations && liveScene.equations.length > 0)
    ? liveScene.equations
    : (activeChapter?.equations || []);

  const isQuizMode = mode === 'quiz' || question.toLowerCase().trim() === 'quiz me' || question.toLowerCase().includes('generate quiz') || question.toLowerCase().includes('test me');

  const depthDirective = answerDepth === 'quick'
    ? 'ANSWER DEPTH: QUICK. Provide a concise, direct explanation (2-3 sentences max) highlighting the core takeaway and essential formula. No filler.'
    : answerDepth === 'detailed'
    ? 'ANSWER DEPTH: DETAILED. Provide a comprehensive, rigorous university-level explanation with full step-by-step mathematical proofs, underlying theorems, calculation steps, edge cases, and deep conceptual breakdown.'
    : 'ANSWER DEPTH: MEDIUM. Provide a balanced, clear explanation (2-3 focused paragraphs) highlighting intuition, formula derivation, and connection to the screen.';

  let systemPrompt = '';

  if (isQuizMode) {
    systemPrompt = `You are My Tutor, an interactive university professor and quiz master embedded inside a video lecture player.
The student has watched "${videoTitle}" by ${channel} up to timestamp ${currentMinSec} (${timestamp}s).

================================================================================
🚨 TIME-BOUNDED WATCHED MATERIAL (0:00 to ${currentMinSec} ONLY)
================================================================================
- Current Watched Position: ${currentMinSec} (${timestamp}s)
- Active Chapter: "${activeChapter?.title || 'Current Section'}"
- Active Topic / Problem on Screen: "${activeFocusTitle}"
- Chalkboard Equations & Notes at this second:
  ${activeChalkboardNotes || 'N/A'}
- Visible Formulas: ${activeEquations.join(', ') || 'N/A'}
- Spoken Dialogue around this second:
  "${nearbyTranscript || 'N/A'}"
- Topics Covered SO FAR from 0:00 to ${currentMinSec}:
  ${coveredHistory.length > 0 ? coveredHistory.join(' -> ') : (activeChapter?.title || 'Introduction')}

================================================================================
MANDATORY QUIZ RULES:
================================================================================
1. STRICT TIME BOUNDARY (NO SPOILERS / NO FUTURE TOPICS):
   - ONLY test the student on concepts, equations, calculations, and ideas presented between 0:00 and ${currentMinSec}.
   - NEVER ask about topics, chapters, formulas, or theorems that occur AFTER ${currentMinSec} in this video.
2. LIVE SCREENSHOT & BLACKBOARD GROUNDING:
   - Base the quiz question strictly on the problem, equations, or concepts active at ${currentMinSec}.
   - If a live video screenshot is provided, read the exact problem, formulas, and calculations directly from the screenshot!
   - DO NOT invent or assume pre-canned examples.
3. HIGH-YIELD MULTIPLE CHOICE QUIZ:
   - Create a sharp, engaging multiple-choice question in the "quiz" field based strictly on what is visible on screen or spoken in the lecture.
   - Provide exactly 4 options in "options" (Option A, B, C, D) with LaTeX math where appropriate.
   - Set "correctAnswerIndex" (0, 1, 2, or 3).
   - Provide a clear, educational "explanation" explaining why the correct choice is true.
   - Set "targetedConcept" to the specific principle tested.
4. IN-CHAT TEXT ("content"):
   - Write a concise, friendly introductory message and summarize what the question tests.
5. DIAGRAM:
   - Set "diagram": null.
6. FOLLOW-UP PROMPTS:
   - Provide 2 relevant follow-up questions in "suggestedPrompts".

Return strictly a valid JSON object matching this schema:
{
  "content": "Friendly introductory message and brief summary of the tested concept",
  "diagram": null,
  "quiz": {
    "question": "The question to test?",
    "type": "multiple_choice",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswerIndex": 0,
    "explanation": "Why this option is correct and step-by-step logic",
    "targetedConcept": "Tested concept name"
  },
  "suggestedPrompts": [
    "Follow-up question 1",
    "Follow-up question 2"
  ]
}`;
  } else {
    systemPrompt = `You are My Tutor, a brilliant, world-class university AI professor and teaching assistant embedded directly inside an interactive video lecture player.
You are tutoring a student watching "${videoTitle}" by ${channel}.

================================================================================
🚨 CURRENT VIDEO SCREEN & TIMELINE STATE AT ${currentMinSec} (${timestamp}s)
================================================================================
- Video Title: "${videoTitle}" (${channel})
- Paused Timestamp: ${currentMinSec} (${timestamp}s)
- Current Lecture Chapter: "${activeChapter?.title || 'Current Section'}"
- Active Topic / Problem on Screen: "${activeFocusTitle}"
- Chalkboard Equations & Notes at this second (${currentMinSec}):
${activeChalkboardNotes ? `  ${activeChalkboardNotes.split('\n').join('\n  ')}` : '  N/A'}
- Visible Formulas at this second: ${activeEquations.join(', ') || 'N/A'}
- PROFESSOR'S SPOKEN WORDS AT THIS SECOND:
  "${nearbyTranscript || 'N/A'}"
- PRECEDING TOPICS IN THIS LECTURE:
  ${coveredHistory.join(' -> ') || 'Beginning of lecture'}

Student's Interaction Mode: "explain"
${depthDirective}

================================================================================
🚨 MANDATORY NON-REFUSAL & LIVE LECTURE GROUNDING RULES:
================================================================================
1. NEVER REFUSE TO ANSWER:
   - NEVER say "I am unable to see the specific question", "no image or text of the problem is currently displayed on the screen", or "could you please provide a screenshot".
   - You have the exact video timestamp (${currentMinSec}), the active topic ("${activeFocusTitle}"), the active chalkboard equations and notes, and the spoken dialogue.
   - When the student asks "explain this question", "solve this", "explain step 2", or similar, ALWAYS authoritatively explain and solve the problem and calculations being worked on at this exact second (${currentMinSec})!
2. MULTIMODAL VISION PRECEDENCE:
   - If an image or screenshot is attached, inspect the image directly and prioritize any handwritten nuances, annotations, or student drawings.
   - If no screenshot is attached, solve and explain using the active chalkboard notes, formulas, and spoken dialogue at ${currentMinSec} provided above.
3. CONCRETE STEP-BY-STEP MATHEMATICAL SOLUTION:
   - Always state the underlying principle and governing recurrence/formula clearly.
   - Substitute the numerical values for the specific problem being demonstrated on the board at ${currentMinSec}.
   - Walk through the exact calculation steps, intermediate approximations, and final answer with mathematical precision.
4. MULTI-TURN CONVERSATION MEMORY:
   - Inspect previous chat turns. If the student is asking a follow-up, build directly on what was discussed without repetitive introductions.
5. CLEAN MATH FORMATTING:
   - Use standard LaTeX with $...$ for inline math (e.g. $f'(x) = 3x^2 - 2$).
   - Use $$...$$ on their own lines for display block equations.
6. DIAGRAM DIRECTIVE:
   - Set "diagram": null unless the student explicitly asks for an SVG drawing/plot.
7. COMPREHENSION QUIZ & FOLLOW-UP PROMPTS:
   - Include a comprehension quiz question in "quiz" checking the concept just explained.
   - Provide 2-3 natural follow-up questions in "suggestedPrompts".

Return your response strictly as a valid JSON object matching this schema:
{
  "content": "Your conversational explanation formatted in markdown with LaTeX $...$ and $$...$$",
  "diagram": null,
  "quiz": {
    "question": "Comprehension check question?",
    "type": "multiple_choice",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswerIndex": 0,
    "explanation": "Why this option is correct",
    "targetedConcept": "Targeted concept"
  },
  "suggestedPrompts": [
    "Relevant follow-up question 1",
    "Relevant follow-up question 2"
  ]
}`;
  }

  let imageBase64ToUse = blackboardFrameBase64 || studentDrawingBase64;

  if (!imageBase64ToUse && (frameUrl || videoId)) {
    const targetUrl = frameUrl || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null);
    if (targetUrl) {
      try {
        const imgResp = await fetch(targetUrl, { signal: AbortSignal.timeout(3000) });
        if (imgResp.ok) {
          const buf = await imgResp.arrayBuffer();
          const b64 = Buffer.from(buf).toString('base64');
          const mime = targetUrl.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
          imageBase64ToUse = `data:${mime};base64,${b64}`;
        }
      } catch (err) {
        console.warn('Could not fetch video frame for vision:', err);
      }
    }
  }

  const hasLiveImage = Boolean(imageBase64ToUse && imageBase64ToUse.startsWith('data:image'));

  // Extract live OCR from captured screen in <100ms
  let ocrExtractedText = '';
  if (hasLiveImage) {
    try {
      ocrExtractedText = await extractOcrTextFromBase64(imageBase64ToUse);
    } catch (_) {}
  }

  // Format previous turns for multi-turn LLM context
  const chatHistoryMessages: Array<{ role: 'user' | 'assistant'; content: string }> = (chatHistory || [])
    .slice(-8)
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    }));

  const userPromptText = isQuizMode
    ? `[Quiz Request at ${currentMinSec} in "${videoTitle}"]\nActive Topic: ${activeFocusTitle}\n` +
      (ocrExtractedText ? `SCREEN/BLACKBOARD OCR TEXT (Captured Frame):\n${ocrExtractedText}\n\n` : '') +
      `Chalkboard Notes @ ${currentMinSec}: ${activeChalkboardNotes}\nFormulas: ${activeEquations.join(', ')}\nSpoken Words: "${nearbyTranscript || 'N/A'}"\nTopics covered so far: ${coveredHistory.join(' -> ') || activeChapter?.title || 'Lecture'}\nPlease inspect the screen and dialogue at ${currentMinSec}, and generate an interactive multiple choice quiz testing only what was watched up to ${currentMinSec}.`
    : `[Lecture Screen at ${currentMinSec} in "${videoTitle}"]\nActive Topic / Problem: "${activeFocusTitle}"\n` +
      (ocrExtractedText ? `SCREEN/BLACKBOARD OCR TEXT (Captured Frame):\n${ocrExtractedText}\n\n` : '') +
      `Chalkboard Notes & Problem Statement @ ${currentMinSec}:\n${activeChalkboardNotes || 'N/A'}\nKey Formulas @ ${currentMinSec}: ${activeEquations.join(', ') || 'N/A'}\nSpoken Words: "${nearbyTranscript || 'N/A'}"\n\nStudent Question: "${question}" (Answer depth: ${answerDepth})\n\nPlease solve/explain the active problem shown on the screen at ${currentMinSec} step-by-step with formulas and exact numbers. Ground your explanation directly in what is visible on the blackboard/screen. Do not refuse or ask for a screenshot; answer directly!`;

  const multimodalMessages: any[] = [
    { role: 'system', content: systemPrompt },
    ...chatHistoryMessages
  ];

  if (hasLiveImage) {
    multimodalMessages.push({
      role: 'user',
      content: [
        { type: 'text', text: userPromptText },
        { type: 'image_url', image_url: { url: imageBase64ToUse } }
      ]
    });
  } else {
    multimodalMessages.push({
      role: 'user',
      content: userPromptText
    });
  }

  const textOnlyMessages: any[] = [
    { role: 'system', content: systemPrompt },
    ...chatHistoryMessages,
    { role: 'user', content: userPromptText }
  ];

  // =========================================================================
  // MODEL EXECUTION WATERFALL
  // 1. Groq Ultra-Fast (Sub-second with OCR-augmented prompt)
  // 2. NVIDIA NIM Multimodal Vision (Llama 3.2 11B Vision for direct images)
  // 3. Hermes Antigravity Proxy (:8090 - Gemini Flash Low Effort)
  // 4. Dynamic Context-Aware Fallback
  // =========================================================================

  const callGroq = async (): Promise<any | null> => {
    for (const model of GROQ_MODELS) {
      try {
        const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0'
          },
          body: JSON.stringify({
            model,
            response_format: { type: 'json_object' },
            messages: textOnlyMessages,
            max_tokens: answerDepth === 'quick' ? 800 : 2048,
            temperature: 0.2
          }),
          signal: AbortSignal.timeout(9000)
        });

        if (groqResp.ok) {
          const data = await groqResp.json() as any;
          const text = data?.choices?.[0]?.message?.content || '';
          if (text && !text.toLowerCase().includes('rate limit')) {
            const parsed = parseAIResponse(text, question, timestamp, canvasCoordinates);
            if (parsed && parsed.content && parsed.content.length > 20) {
              return parsed;
            }
          }
        }
      } catch (err) {
        console.warn('Groq model notice for', model, err);
      }
    }
    return null;
  };

  const callNvidiaNimVision = async (): Promise<any | null> => {
    if (!hasLiveImage) return null;
    try {
      const nimResp = await fetch(`${NVIDIA_NIM_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NVIDIA_NIM_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'meta/llama-3.2-11b-vision-instruct',
          messages: multimodalMessages,
          max_tokens: answerDepth === 'quick' ? 800 : 1800,
          temperature: 0.2
        }),
        signal: AbortSignal.timeout(7000)
      });

      if (nimResp.ok) {
        const data = await nimResp.json() as any;
        const text = data?.choices?.[0]?.message?.content || '';
        if (text && text.length > 20) {
          const parsed = parseAIResponse(text, question, timestamp, canvasCoordinates);
          if (parsed && parsed.content && parsed.content.length > 20) {
            return parsed;
          }
        }
      }
    } catch (err) {
      console.warn('NVIDIA NIM vision notice:', err);
    }
    return null;
  };

  const callAntigravity = async (): Promise<any | null> => {
    for (const localModel of LOCAL_ANTIGRAVITY_MODELS) {
      try {
        const localResp = await fetch('http://127.0.0.1:8090/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: localModel,
            no_cache: true,
            messages: textOnlyMessages,
            temperature: 0.2
          }),
          signal: AbortSignal.timeout(15000)
        });

        if (localResp.ok) {
          const data = await localResp.json() as any;
          const text = data?.choices?.[0]?.message?.content || '';
          if (text &&
              !text.toLowerCase().includes('invalid model') &&
              !text.toLowerCase().includes('authentication failed') &&
              !text.toLowerCase().includes('timed out') &&
              !text.toLowerCase().includes('rate limit')) {
            const parsed = parseAIResponse(text, question, timestamp, canvasCoordinates);
            if (parsed && parsed.content && parsed.content.length > 20) {
              return parsed;
            }
          }
        }
      } catch (err) {
        console.warn('Antigravity Proxy notice for', localModel, err);
      }
    }
    return null;
  };

  // Execution order:
  // 1. High-speed Groq LLM (Sub-second execution with OCR-extracted screen text!)
  const groqReply = await callGroq();
  if (groqReply) return groqReply;

  // 2. Multimodal Vision via NVIDIA NIM if image was provided
  if (hasLiveImage) {
    const nimVisionReply = await callNvidiaNimVision();
    if (nimVisionReply) return nimVisionReply;
  }

  // 3. Hermes Antigravity Proxy (Gemini Flash Low Reasoning Effort)
  const antigravityReply = await callAntigravity();
  if (antigravityReply) return antigravityReply;

  // 4. Dynamic Context-Aware Fallback (No hardcoded diagrams or static canned answers)
  return generateDynamicHeuristicReply(question, timestamp, videoTitle, activeChapter, nearbyTranscript, isQuizMode, liveScene);
}

function parseAIResponse(rawText: string, question: string, timestamp: number, canvasCoordinates?: any): Partial<TutorMessage> & { canvasNode?: Partial<CanvasNode> } {
  let cleanedStr = rawText.trim();
  const jsonBlockMatch = cleanedStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    cleanedStr = jsonBlockMatch[1].trim();
  }

  let parsed: any = null;

  // 1. Direct JSON parse
  try {
    parsed = JSON.parse(cleanedStr);
  } catch {
    // 2. Sanitize unescaped LaTeX backslashes (\frac, \lim, \Delta, \partial, etc.)
    try {
      const sanitized = cleanedStr.replace(/\\([^"\\\/bfnrtu]|u(?!([0-9a-fA-F]{4})))/g, '\\\\$1');
      parsed = JSON.parse(sanitized);
    } catch {
      // 3. Substring extract { ... }
      try {
        const start = cleanedStr.indexOf('{');
        const end = cleanedStr.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          const slice = cleanedStr.substring(start, end + 1);
          const sanitizedSlice = slice.replace(/\\([^"\\\/bfnrtu]|u(?!([0-9a-fA-F]{4})))/g, '\\\\$1');
          parsed = JSON.parse(sanitizedSlice);
        }
      } catch {
        parsed = {};
        const contentMatch = cleanedStr.match(/"content"\s*:\s*"([\s\S]*?)"\s*,\s*"(?:diagram|quiz|suggestedPrompts)/);
        if (contentMatch) {
          parsed.content = contentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
      }
    }
  }

  // Ensure content is clean text and never a raw JSON dump
  let finalContent = parsed?.content || '';
  if (!finalContent || typeof finalContent !== 'string' || finalContent.trim().startsWith('{')) {
    const stripJsonMatch = rawText.match(/"content"\s*:\s*"([\s\S]*?)"\s*,\s*"/);
    if (stripJsonMatch) {
      finalContent = stripJsonMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    } else {
      finalContent = rawText
        .replace(/^\s*\{\s*"content"\s*:\s*"/, '')
        .replace(/"\s*,\s*"diagram[\s\S]*$/, '')
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"');
    }
  }

  // Pure dynamic diagram handling: ONLY keep diagram if AI genuinely returned valid SVG markup
  let diagram: InteractiveDiagram | null = null;
  if (parsed?.diagram?.svgMarkup && typeof parsed.diagram.svgMarkup === 'string' && parsed.diagram.svgMarkup.includes('<svg')) {
    diagram = parsed.diagram;
  } else {
    const directSvgMatch = rawText.match(/<svg[\s\S]*?<\/svg>/);
    if (directSvgMatch) {
      diagram = {
        id: `diag-${Date.now()}`,
        title: parsed?.diagram?.title || 'Visual Model',
        svgMarkup: directSvgMatch[0],
        caption: parsed?.diagram?.caption || 'Geometric lecture model'
      };
    }
  }

  return {
    role: 'assistant',
    content: finalContent,
    diagram: diagram || null,
    quiz: parsed?.quiz,
    suggestedPrompts: parsed?.suggestedPrompts || [
      'Can you break down the next step in this calculation?',
      'Why did the formula work this way on the screen?'
    ],
    timestamp
  };
}

function generateDynamicHeuristicReply(
  question: string,
  timestamp: number,
  videoTitle: string,
  activeChapter?: any,
  nearbyTranscript?: string,
  isQuizMode: boolean = false,
  liveScene?: any
): Partial<TutorMessage> & { canvasNode?: Partial<CanvasNode> } {
  const minSec = `${Math.floor(timestamp / 60)}:${String(Math.floor(timestamp % 60)).padStart(2, '0')}`;
  const topicTitle = liveScene?.stepTitle || activeChapter?.title || 'Active Lecture Concept';
  const notes = liveScene?.blackboardNotes || liveScene?.blackboardText || activeChapter?.blackboardContent || '';
  const equations = (liveScene?.visibleEquations && liveScene.visibleEquations.length > 0)
    ? liveScene.visibleEquations
    : (activeChapter?.equations || []);
  const spokenDialogue = nearbyTranscript ? `\n\n> **Spoken Context @ ${minSec}**: *"${nearbyTranscript}"*` : '';

  if (isQuizMode) {
    return {
      role: 'assistant',
      content: `### Knowledge Check @ ${minSec}\n\nHere is a quick question to check your understanding of what has been covered up to **${minSec}** in **${videoTitle}**:`,
      diagram: null,
      quiz: {
        question: `In "${topicTitle}" (at ${minSec}), what is the primary concept or calculation being demonstrated?`,
        type: 'multiple_choice',
        options: [
          equations[0] || activeChapter?.keyConcepts?.[0] || 'The core mathematical formula from this lecture section',
          'A subsequent chapter formula',
          'Arbitrary constant offset',
          'Unrelated unit conversion'
        ],
        correctAnswerIndex: 0,
        explanation: `At ${minSec}, the lecture focuses on ${topicTitle}.`,
        targetedConcept: topicTitle
      },
      suggestedPrompts: [
        'Can you explain this step in more detail?',
        'How does this relate to the previous step?'
      ],
      timestamp
    };
  }

  const eqBlock = equations.length > 0
    ? `\n\n**Active Equations & Formulas**:\n${equations.map((eq: string) => `- $${eq}$`).join('\n')}`
    : '';

  const notesBlock = notes ? `\n\n**Board Demonstration & Working**:\n${notes}` : '';

  const content = `### ${topicTitle} (${minSec})

At **${minSec}** in **${videoTitle}**:
${spokenDialogue}${notesBlock}${eqBlock}

**Step-by-step breakdown**:
The professor at this moment is demonstrating the active recurrence and calculation shown above. Each iteration directly substitutes the current approximation into the governing formula to generate the next improved estimate.`;

  return {
    role: 'assistant',
    content,
    diagram: null,
    quiz: {
      question: `What is the core principle or formula explored in "${topicTitle}" at ${minSec}?`,
      type: 'multiple_choice',
      options: [
        equations[0] || activeChapter?.keyConcepts?.[0] || 'The core principle demonstrated on screen',
        'Unrelated preliminary note',
        'Standard constant factor',
        'Alternative unit system'
      ],
      correctAnswerIndex: 0,
      explanation: `At ${minSec}, the focus is on ${topicTitle}.`,
      targetedConcept: topicTitle
    },
    suggestedPrompts: [
      `Can you break down the next calculation step?`,
      `Why is this approach taken at ${minSec}?`
    ],
    timestamp
  };
}
