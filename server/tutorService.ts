import { TutorMessage, InteractiveDiagram, QuizQuestion, TutorMode, CanvasNode } from '../src/types/tutor';
import { analyzeBlackboard } from './blackboardService';
import { findActiveChapter } from '../src/utils/chapterHelper';

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
  chatHistory?: ChatHistoryTurn[];
  studentDrawingBase64?: string;
  blackboardFrameBase64?: string;
  frameUrl?: string;
  canvasCoordinates?: { x: number; y: number; width?: number; height?: number };
}

// 1. Primary Engine: Groq Ultra-Fast Intelligence (GPT-OSS-120B & Qwen 3.8 27B)
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'];

// 2. Multimodal Vision & Deep Reasoning: Hermes Antigravity Proxy (Port 8090)
const LOCAL_ANTIGRAVITY_MODELS = ['gemini-3.8-flash-high', 'gemini-3.8-flash-medium', 'gemini-3.8-flash'];

// 3. Tertiary Engine: OpenRouter Free Fallback Models
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODELS = [
  'google/gemma-4-31b-it:free',
  'qwen/qwen3.8-27b:free',
  'liquid/lfm-2.5-2.6b:free'
];

export async function askTutor(params: AskTutorParams): Promise<Partial<TutorMessage> & { canvasNode?: Partial<CanvasNode> }> {
  const {
    question,
    mode = 'socratic',
    answerDepth = 'medium',
    timestamp,
    videoId,
    videoTitle,
    channel,
    chapters = [],
    coveredHistory = [],
    nearbyTranscript = '',
    activeChapter: customActiveChapter,
    chatHistory = [],
    studentDrawingBase64,
    blackboardFrameBase64,
    frameUrl,
    canvasCoordinates
  } = params;

  const currentMinSec = `${Math.floor(timestamp / 60)}:${String(Math.floor(timestamp % 60)).padStart(2, '0')}`;
  const activeChapter = customActiveChapter || findActiveChapter(chapters, timestamp);

  const depthDirective = answerDepth === 'quick'
    ? 'ANSWER DEPTH: QUICK. Provide a concise, highly direct explanation (2-3 sentences max) highlighting the single core takeaway and essential formula. Crystal-clear and easy to understand at a glance with no unnecessary filler.'
    : answerDepth === 'detailed'
    ? 'ANSWER DEPTH: DETAILED. Provide a comprehensive, rigorous university-level explanation with full step-by-step mathematical proofs, underlying theorems, arithmetic steps, edge cases, and deep conceptual breakdown.'
    : 'ANSWER DEPTH: MEDIUM. Provide a balanced, clear explanation (2-3 focused paragraphs) highlighting the geometric/physical intuition, key formula derivation, and direct connection to what is on screen.';

  const systemPrompt = `You are My Tutor, a brilliant, world-class university AI professor and teaching assistant embedded directly inside an interactive video lecture player.
You are tutoring a student watching "${videoTitle}" by ${channel}.

================================================================================
🚨 CURRENT VIDEO SCREEN, BLACKBOARD & TIMELINE STATE AT ${currentMinSec} (${timestamp}s)
================================================================================
- Video Title: "${videoTitle}" (${channel})
- Paused Timestamp: ${currentMinSec} (${timestamp}s)
- Current Lecture Chapter: "${activeChapter?.title || 'Current Section'}"
- Chapter Summary & Focus: ${activeChapter?.summary || 'Active topic discussion'}
- ON-SCREEN BLACKBOARD CHALK NOTES & VISUAL DEMONSTRATION:
  ${activeChapter?.blackboardContent || 'Equations and live visual demonstrations on screen'}
- VISIBLE FORMULAS & NUMBERS ON SCREEN RIGHT NOW:
  ${activeChapter?.equations?.length ? activeChapter.equations.join(', ') : 'None'}
- KEY CONCEPTS ACTIVELY BEING DEMONSTRATED:
  ${activeChapter?.keyConcepts?.join(', ') || 'Core principles'}
- PROFESSOR'S SPOKEN WORDS AT THIS MOMENT:
  "${nearbyTranscript || activeChapter?.summary || 'N/A'}"
- PRECEDING TOPICS IN THIS LECTURE:
  ${coveredHistory.join(' -> ') || 'Beginning of lecture'}

Student's Interaction Mode: "${mode}" (options: socratic, explain, blackboard_ocr, quiz)
${depthDirective}

================================================================================
MANDATORY MULTI-TURN CONVERSATION & SCREEN-AWARE GROUNDING RULES:
================================================================================
1. MULTI-TURN CONVERSATION MEMORY & ZERO REPETITION:
   - Carefully inspect the previous chat conversation messages.
   - If the student is asking a follow-up question (e.g. "why did we divide by 10?", "what is step 2?", "explain without calculus", "what about x_2?"), BUILD DIRECTLY ON WHAT WAS ALREADY DISCUSSED.
   - NEVER repeat the same greeting, introductory summary, or canned boilerplate across turns.
   - Directly address the exact doubt or arithmetic step the student just asked about.
2. PRECISE VISUAL SCREEN & CALCULATION GROUNDING:
   - Read the exact handwritten chalk notes, slides, equations, and numbers visible at ${currentMinSec}.
   - If the instructor is solving an example (e.g. in Numerical Analysis Newton-Raphson $f(x)=x^3-2x-5=0$ with $x_0=2 \\to x_1=2.1 \\to x_2=2.094568$), follow the exact numbers, derivatives, and iterations shown on screen.
   - If the student asks about a different equation or asks for clarification, provide accurate mathematics directly answering their question.
3. ACADEMIC RIGOR & GEOMETRIC INTUITION:
   - Explain why the principle holds with geometric or physical clarity.
4. CLEAN MATH FORMATTING:
   - Use standard LaTeX with $...$ for inline math (e.g. $f'(x) = 3x^2 - 2$, $x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}$).
   - Use $$...$$ on their own lines for display block equations.
5. VISUAL DIAGRAM DIRECTIVE (STRICT RELEVANCE ONLY):
   - ONLY include an SVG diagram in "diagram" if the concept fundamentally requires a geometric, spatial, graphical, or physical visual model to understand (e.g. curve tangent iterations, area strips, force balance) OR if the user explicitly asks for a drawing/diagram/plot.
   - If the question is conceptual, textual, algebraic, or does not need a visual representation, SET "diagram": null.
   - When generating a diagram: use viewBox="0 0 500 300" with crisp modern styling.
6. COMPREHENSION QUIZ & SUGGESTED FOLLOW-UP PROMPTS:
   - Provide an insightful comprehension quiz question in "quiz".
   - Provide 2-3 natural, highly relevant follow-up questions in "suggestedPrompts" that the student can click to explore further.

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

  // Format previous turns for multi-turn LLM context
  const chatHistoryMessages: Array<{ role: 'user' | 'assistant'; content: string }> = (chatHistory || [])
    .slice(-8)
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    }));

  const userPromptText = `[Lecture Scene & Blackboard at ${currentMinSec} in "${videoTitle}"]\nSpoken Words at this second: "${nearbyTranscript || 'N/A'}"\nActive Chapter: "${activeChapter?.title || 'Current Section'}"\nQuestion: "${question}" (Answer depth: ${answerDepth})\n\nPlease inspect the chalkboard state, read the visible formulas and visual demonstrations at ${currentMinSec}, consider our prior conversation, and answer directly.`;

  const multimodalMessages: any[] = [
    { role: 'system', content: systemPrompt },
    ...chatHistoryMessages
  ];

  if (imageBase64ToUse && imageBase64ToUse.startsWith('data:image')) {
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
  // 1. Groq (Fastest sub-second LLM with GPT-OSS-120B & Qwen 27B)
  // 2. Hermes Antigravity Proxy (:8090 - Gemini 3.8 Flash Flagship)
  // 3. OpenRouter Free Models
  // 4. Dynamic Context-Aware Pedagogical Fallback
  // =========================================================================

  const callGroq = async (): Promise<any | null> => {
    for (const model of GROQ_MODELS) {
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
            messages: textOnlyMessages,
            max_tokens: answerDepth === 'quick' ? 800 : 2048,
            temperature: 0.2
          }),
          signal: AbortSignal.timeout(10000)
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

  const callAntigravity = async (): Promise<any | null> => {
    for (const localModel of LOCAL_ANTIGRAVITY_MODELS) {
      try {
        const localResp = await fetch('http://127.0.0.1:8090/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: localModel,
            messages: multimodalMessages,
            temperature: 0.2
          }),
          signal: AbortSignal.timeout(20000)
        });

        if (localResp.ok) {
          const data = await localResp.json() as any;
          const text = data?.choices?.[0]?.message?.content || '';
          if (text && !text.toLowerCase().includes('invalid model selection')) {
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

  const callOpenRouter = async (): Promise<any | null> => {
    for (const model of OPENROUTER_MODELS) {
      try {
        const openRouterResp = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://mytutor.local',
            'X-Title': 'My Tutor AI',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: textOnlyMessages,
            max_tokens: answerDepth === 'quick' ? 800 : 2048,
            temperature: 0.2
          }),
          signal: AbortSignal.timeout(10000)
        });

        if (openRouterResp.ok) {
          const data = await openRouterResp.json() as any;
          const text = data?.choices?.[0]?.message?.content || '';
          if (text && !text.toLowerCase().includes('rate limit')) {
            const parsed = parseAIResponse(text, question, timestamp, canvasCoordinates);
            if (parsed && parsed.content && parsed.content.length > 20) {
              return parsed;
            }
          }
        }
      } catch (err) {
        console.warn('OpenRouter notice for', model, err);
      }
    }
    return null;
  };

  // Execution order: Groq is fastest and most deterministic (~1-2s) -> Antigravity -> OpenRouter
  const groqReply = await callGroq();
  if (groqReply) return groqReply;

  const antigravityReply = await callAntigravity();
  if (antigravityReply) return antigravityReply;

  const openRouterReply = await callOpenRouter();
  if (openRouterReply) return openRouterReply;

  // =========================================================================
  // 4. QUATERNARY TIER: Dynamic Context-Aware Pedagogical Generator
  // =========================================================================
  return generateDynamicHeuristicReply(question, timestamp, videoTitle, activeChapter, nearbyTranscript, canvasCoordinates);
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

  // Ensure diagram only exists if genuinely provided by the AI with valid svgMarkup, or if user explicitly requested a diagram
  let diagram = parsed?.diagram;
  if (!diagram || !diagram.svgMarkup || typeof diagram.svgMarkup !== 'string' || diagram.svgMarkup.trim() === '') {
    const directSvgMatch = rawText.match(/<svg[\s\S]*?<\/svg>/);
    if (directSvgMatch) {
      diagram = {
        id: `diag-${Date.now()}`,
        title: parsed?.diagram?.title || 'Visual Model',
        svgMarkup: directSvgMatch[0],
        caption: parsed?.diagram?.caption || 'Geometric lecture model'
      };
    } else {
      const qLower = (question || '').toLowerCase();
      const isExplicitDiagramRequest = qLower.includes('draw') || qLower.includes('diagram') || qLower.includes('plot') || qLower.includes('sketch') || qLower.includes('graph');
      if (isExplicitDiagramRequest) {
        diagram = generateFallbackDiagram(question, timestamp);
      } else {
        diagram = null; // NEVER force an unneeded diagram
      }
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

function generateFallbackDiagram(question: string, timestamp: number): InteractiveDiagram | null {
  const q = question.toLowerCase();

  if (q.includes('area') || q.includes('integral') || q.includes('curve') || q.includes('parabola') || q.includes('tangent') || q.includes('slope') || q.includes('draw') || q.includes('diagram') || q.includes('plot')) {
    return {
      id: 'diag-integral',
      title: 'Area Under Curve & Differential Strip: $y = x^2$',
      type: 'calculus_integral',
      description: 'As we slice the area under the parabola into thin strips of width $dx$, the area increments by $dA = x^2 dx$.',
      caption: 'Accumulated area $A(x) = \\int_0^x t^2 dt = \\frac{1}{3}x^3$',
      svgMarkup: `
        <svg viewBox="0 0 500 300" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect width="500" height="300" fill="#0f172a" rx="12" />
          <line x1="60" y1="260" x2="460" y2="260" stroke="#334155" stroke-width="2" />
          <line x1="60" y1="260" x2="60" y2="30" stroke="#334155" stroke-width="2" />
          <text x="470" y="265" font-size="14" font-weight="bold" fill="#94a3b8">x</text>
          <text x="50" y="25" font-size="14" font-weight="bold" fill="#94a3b8">y</text>
          <path d="M 60,260 Q 200,250 320,100 L 320,260 Z" fill="#3b82f6" fill-opacity="0.25" />
          <path d="M 60,260 Q 200,250 420,50" fill="none" stroke="#60a5fa" stroke-width="3.5" stroke-linecap="round" />
          <rect x="300" y="125" width="20" height="135" fill="#f59e0b" fill-opacity="0.8" stroke="#d97706" stroke-width="1.5" />
          <line x1="300" y1="275" x2="320" y2="275" stroke="#f59e0b" stroke-width="2" />
          <text x="310" y="292" font-size="13" font-weight="600" text-anchor="middle" fill="#fcd34d">dx</text>
          <text x="310" y="115" font-size="13" font-weight="bold" text-anchor="middle" fill="#fcd34d">dA = x² dx</text>
          <text x="200" y="210" font-size="18" font-family="serif" font-style="italic" fill="#93c5fd">A(x)</text>
          <text x="380" y="70" font-size="16" font-family="serif" font-weight="bold" fill="#60a5fa">y = x²</text>
        </svg>
      `
    };
  }

  if (q.includes('newton') || q.includes('raphson') || q.includes('root') || q.includes('bisection') || q.includes('numerical') || q.includes('iteration')) {
    return {
      id: 'diag-newton-raphson',
      title: 'Newton-Raphson Tangent Iteration: $x_{n+1} = x_n - \\frac{f(x_n)}{f\'(x_n)}$',
      type: 'calculus_integral',
      description: 'The tangent line at $(x_n, f(x_n))$ with slope $f\'(x_n)$ intercepts the x-axis at $x_{n+1}$, rapidly converging to root $r$.',
      caption: 'Tangent formula: $y - f(x_n) = f\'(x_n)(x - x_n) \\implies x_{n+1} = x_n - \\frac{f(x_n)}{f\'(x_n)}$',
      svgMarkup: `
        <svg viewBox="0 0 500 300" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect width="500" height="300" fill="#0f172a" rx="12" />
          <!-- Axes -->
          <line x1="40" y1="230" x2="470" y2="230" stroke="#475569" stroke-width="2" />
          <line x1="80" y1="280" x2="80" y2="20" stroke="#475569" stroke-width="2" />
          <text x="475" y="235" font-size="14" font-weight="bold" fill="#94a3b8">x</text>
          <text x="75" y="18" font-size="14" font-weight="bold" fill="#94a3b8">y</text>
          
          <!-- Curve y = f(x) -->
          <path d="M 100,270 Q 230,240 440,30" fill="none" stroke="#60a5fa" stroke-width="3.5" stroke-linecap="round" />
          <text x="445" y="45" font-size="14" font-family="serif" font-weight="bold" fill="#60a5fa">y = f(x)</text>
          
          <!-- True Root r on x-axis -->
          <circle cx="215" cy="230" r="5" fill="#10b981" />
          <text x="215" y="255" font-size="13" font-weight="bold" text-anchor="middle" fill="#34d399">Root r</text>
          
          <!-- Point 1: (x0, f(x0)) -->
          <line x1="380" y1="230" x2="380" y2="65" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4 4" />
          <circle cx="380" cy="65" r="5" fill="#f59e0b" />
          <text x="380" y="250" font-size="13" font-weight="bold" text-anchor="middle" fill="#fcd34d">x₀</text>
          <text x="390" y="60" font-size="12" fill="#fcd34d">(x₀, f(x₀))</text>
          
          <!-- Tangent Line 1 from (x0, f(x0)) to x1 -->
          <line x1="420" y1="25" x2="280" y2="230" stroke="#ef4444" stroke-width="2.5" />
          <circle cx="280" cy="230" r="4.5" fill="#ef4444" />
          <text x="280" y="250" font-size="13" font-weight="bold" text-anchor="middle" fill="#f87171">x₁</text>
          
          <!-- Point 2: (x1, f(x1)) -->
          <line x1="280" y1="230" x2="280" y2="155" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="4 4" />
          <circle cx="280" cy="155" r="4.5" fill="#38bdf8" />
          
          <!-- Tangent Line 2 from (x1, f(x1)) to x2 -->
          <line x1="310" y1="120" x2="225" y2="230" stroke="#a855f7" stroke-width="2.5" />
          <circle cx="225" cy="230" r="4" fill="#a855f7" />
          <text x="235" y="222" font-size="12" font-weight="bold" fill="#c084fc">x₂</text>
          
          <!-- Key Formula Box -->
          <rect x="100" y="30" width="230" height="50" fill="#1e293b" rx="8" stroke="#334155" />
          <text x="112" y="52" font-size="12" font-family="monospace" font-weight="bold" fill="#38bdf8">x₁ = x₀ - f(x₀)/f'(x₀)</text>
          <text x="112" y="70" font-size="11" fill="#94a3b8">Quadratic error: |ε₁| ≈ C |ε₀|²</text>
        </svg>
      `
    };
  }

  if (q.includes('friction') || q.includes('force') || q.includes('normal') || q.includes('ramp') || q.includes('incline') || q.includes('gravity') || q.includes('free body')) {
    return {
      id: 'diag-ramp-friction',
      title: 'Free Body Diagram: Ramp with Friction',
      type: 'free_body_forces',
      description: 'Resolution of gravity into parallel component $mg\\sin\\theta$ and perpendicular component $mg\\cos\\theta$.',
      caption: 'Equilibrium condition: $N = mg\\cos\\theta$, Net Force $F_{net} = mg\\sin\\theta - f_k$',
      svgMarkup: `
        <svg viewBox="0 0 500 300" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect width="500" height="300" fill="#0f172a" rx="12" />
          <polygon points="60,260 440,260 440,80" fill="#1e293b" stroke="#475569" stroke-width="2" />
          <path d="M 120,260 A 60 60 0 0 0 110,240" fill="none" stroke="#94a3b8" stroke-width="2" />
          <text x="135" y="250" font-size="14" fill="#94a3b8" font-style="italic">θ</text>
          <g transform="translate(250, 170) rotate(-26)">
            <rect x="-35" y="-35" width="70" height="70" fill="#2563eb" fill-opacity="0.8" stroke="#60a5fa" stroke-width="2" rx="4" />
            <text x="0" y="5" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">m</text>
            <line x1="0" y1="0" x2="0" y2="-90" stroke="#10b981" stroke-width="3" />
            <text x="15" y="-75" font-size="13" font-weight="bold" fill="#34d399">N = mg cos θ</text>
            <line x1="0" y1="0" x2="-80" y2="0" stroke="#f59e0b" stroke-width="3" />
            <text x="-95" y="-10" font-size="13" font-weight="bold" fill="#fcd34d">f_k = μ_k N</text>
            <line x1="0" y1="0" x2="80" y2="0" stroke="#38bdf8" stroke-width="3" />
            <text x="25" y="25" font-size="13" font-weight="bold" fill="#7dd3fc">mg sin θ</text>
          </g>
          <line x1="250" y1="170" x2="250" y2="280" stroke="#ef4444" stroke-width="3" />
          <text x="260" y="270" font-size="13" font-weight="bold" fill="#f87171">F_g = mg</text>
        </svg>
      `
    };
  }

  return null;
}

function generateDynamicHeuristicReply(
  question: string,
  timestamp: number,
  videoTitle: string,
  activeChapter?: any,
  nearbyTranscript?: string,
  canvasCoordinates?: any
): Partial<TutorMessage> & { canvasNode?: Partial<CanvasNode> } {
  const minSec = `${Math.floor(timestamp / 60)}:${String(Math.floor(timestamp % 60)).padStart(2, '0')}`;
  const diagram = generateFallbackDiagram(question, timestamp);

  const topicTitle = activeChapter?.title || 'Active Lecture Concept';
  const blackboardNote = activeChapter?.blackboardContent || 'Equations and live visual demonstrations on screen.';
  const equationsList = activeChapter?.equations && activeChapter.equations.length > 0
    ? activeChapter.equations.map((eq: string) => `$$${eq}$$`).join('\n')
    : '';

  const spokenDialogue = nearbyTranscript ? `\n\n> **Spoken Context**: *"${nearbyTranscript}"*` : '';

  const content = `### ${topicTitle} (${minSec})

At **${minSec}** in **${videoTitle}**, we are examining:

${blackboardNote}${spokenDialogue}

${equationsList ? `**Key Formulas on Screen**:\n${equationsList}\n\n` : ''}**Direct Answer to your question ("${question}")**:
The core mathematical principle connects the theoretical definition directly to the visual demonstration on the screen. As shown on the board, each step advances the solution systematically.`;

  return {
    role: 'assistant',
    content,
    diagram: diagram || null,
    quiz: {
      question: `What is the core principle demonstrated in "${topicTitle}" at ${minSec}?`,
      type: 'multiple_choice',
      options: [
        activeChapter?.keyConcepts?.[0] || 'The primary formula on the board',
        'Unrelated background setup',
        'Standard unit conversion',
        'Alternative notation definition'
      ],
      correctAnswerIndex: 0,
      explanation: `At ${minSec}, the focus is directly on ${activeChapter?.keyConcepts?.[0] || topicTitle}.`,
      targetedConcept: topicTitle
    },
    suggestedPrompts: [
      `Can you break down the next calculation step?`,
      `Why is this equation used at ${minSec}?`
    ],
    timestamp
  };
}
