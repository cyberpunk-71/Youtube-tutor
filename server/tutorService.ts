import { TutorMessage, InteractiveDiagram, QuizQuestion, TutorMode, CanvasNode } from '../src/types/tutor';
import { analyzeBlackboard } from './blackboardService';

interface AskTutorParams {
  question: string;
  mode: TutorMode;
  answerDepth?: 'detailed' | 'medium' | 'quick';
  timestamp: number;
  videoTitle: string;
  channel: string;
  chapters?: any[];
  coveredHistory?: string[];
  nearbyTranscript?: string;
  activeChapter?: any;
  studentDrawingBase64?: string;
  blackboardFrameBase64?: string;
  canvasCoordinates?: { x: number; y: number; width?: number; height?: number };
}

// 1. Primary Engine: Hermes Antigravity Proxy (Port 8090 - Gemini 3.8 Flash Flagship)
const LOCAL_ANTIGRAVITY_MODELS = ['gemini-3.8-flash'];

// 2. Secondary Fast Engine: Groq Cloud
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODELS = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b'];

// 3. Tertiary Engine: OpenRouter Nemotron & Qwen
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODELS = [
  'nvidia/nemotron-3-nano-30b-a3b',
  'nvidia/nemotron-3-super-120b-a12b',
  'qwen/qwen-2.5-72b-instruct'
];

export async function askTutor(params: AskTutorParams): Promise<Partial<TutorMessage> & { canvasNode?: Partial<CanvasNode> }> {
  const {
    question,
    mode = 'socratic',
    answerDepth = 'medium',
    timestamp,
    videoTitle,
    channel,
    chapters = [],
    coveredHistory = [],
    nearbyTranscript = '',
    activeChapter: customActiveChapter,
    studentDrawingBase64,
    canvasCoordinates
  } = params;

  const currentMinSec = `${Math.floor(timestamp / 60)}:${String(Math.floor(timestamp % 60)).padStart(2, '0')}`;
  const activeChapter = customActiveChapter || chapters.find(c => timestamp >= c.startTime && timestamp <= c.endTime) || chapters[0];

  const depthDirective = answerDepth === 'quick'
    ? 'ANSWER DEPTH: QUICK. Provide a concise, intuitive explanation (2-3 sentences max) focusing on the core takeaway and essential formula. Make it crystal-clear and easy to understand at a glance. No unnecessary preamble.'
    : answerDepth === 'detailed'
    ? 'ANSWER DEPTH: DETAILED. Provide a comprehensive, rigorous university-level explanation with full step-by-step mathematical proofs, underlying theorems, edge cases, and deep conceptual breakdown.'
    : 'ANSWER DEPTH: MEDIUM. Provide a balanced, clear explanation (2-3 concise paragraphs) highlighting the geometric/physical intuition, key formula derivation, and direct connection to what is on screen.';

  const systemPrompt = `You are My Tutor, an extraordinary university-level AI tutor built directly into an interactive video lecture player and infinite spatial whiteboard canvas.
You act like a brilliant MIT/Stanford professor and teaching assistant sitting right next to the student with a digital whiteboard pen.

================================================================================
🚨 CRITICAL LIVE LECTURE SCENE & BLACKBOARD STATE AT ${currentMinSec} (${timestamp}s)
================================================================================
- Video: "${videoTitle}" (${channel})
- Paused Timestamp: ${currentMinSec} (${timestamp}s)
- Current Lecture Chapter: "${activeChapter?.title || 'Current Section'}"
- Chapter Goal & Summary: ${activeChapter?.summary || ''}
- ON-SCREEN BLACKBOARD CHALK NOTES & VISUAL DEMONSTRATION:
  ${activeChapter?.blackboardContent || 'Equations and live visual demonstrations on screen'}
- BLACKBOARD EQUATIONS VISIBLE RIGHT NOW:
  ${activeChapter?.equations?.length ? activeChapter.equations.join(', ') : 'None'}
- KEY CONCEPTS ACTIVELY BEING DEMONSTRATED:
  ${activeChapter?.keyConcepts?.join(', ') || 'Core principles'}
- PROFESSOR'S SPOKEN WORDS AT THIS EXACT SECOND:
  "${nearbyTranscript || 'N/A'}"
- PRECEDING TOPICS IN THIS LECTURE:
  ${coveredHistory.join(' -> ') || 'Beginning of lecture'}

Student's Interaction Mode: "${mode}" (options: socratic, explain, blackboard_ocr, quiz, sketch)
${depthDirective}

================================================================================
MANDATORY PEDAGOGICAL GROUNDING & BLACKBOARD ALIGNMENT RULES:
================================================================================
1. DIRECT ON-SCREEN ALIGNMENT:
   - The student is watching the video and looking at the blackboard at timestamp ${currentMinSec}.
   - You MUST explain the EXACT example, shapes, numbers, variables, and blackboard drawings shown in this scene.
   - For example:
     * If the video is demonstrating concentric rings of a circle, explain the concentric rings, thickness $dr$, circumference $2\\pi r$, and why unrolling them produces strips of area $dA = 2\\pi r \\, dr$ that form a right triangle.
     * If the video is on an inclined plane, explain mass $m$, angle $\\theta$, normal force $N = mg \\cos\\theta$, and friction forces shown on the board.
     * If the video is on the parabola $y = x^2$, explain the thin rectangle strip of area $dA = x^2 dx$ and why $\\frac{dA}{dx} = x^2$.
     * If the video is on a moving car with $s(t) = t^3$, explain the position formula, $(t+dt)^3$, and why the instantaneous velocity is $v(t) = 3t^2$.
     * If the video is on water $H_2O$ and VSEPR, explain the 2 bonding pairs and 2 lone pairs compressing the bond angle to $104.5^\\circ$.
   - NEVER give detached, generic textbook definitions that ignore the live example running on screen.
2. Academic Rigor & Intuition: Explain step-by-step why the formula, principle, or theorem holds with crystal-clear geometric or physical intuition.
3. Clean Math Formatting:
   - Use standard LaTeX with $...$ for inline math (e.g. $f'(x) = 2x$, $\\Delta x \\to 0$, $v(t) = \\frac{dx}{dt}$).
   - Use $$...$$ on their own lines for display block equations (e.g. $$\\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h} = f'(x)$$).
   - NEVER output broken formatting or raw unrendered code blocks for math.
4. VISUAL DIAGRAM DIRECTIVE (STRICT RELEVANCE ONLY):
   - ONLY generate an SVG diagram if the concept fundamentally requires a geometric, spatial, graphical, or physical visual model to understand (e.g. geometric proofs, curves, vectors, force balance, circuit schematics, trees) OR if the user explicitly asks for a visual drawing/diagram.
   - If the question is conceptual, textual, algebraic, a quick definition, or does not need a visual representation, SET "diagram": null.
   - When generating a diagram: use viewBox="0 0 500 300" with crisp dark/light styling.
5. In-Canvas Card: Provide a concise concept title and 1-2 sentence core formula takeaway in "canvasCard".

Return your response strictly as a valid JSON object matching this schema:
{
  "content": "Your conversational explanation formatted in markdown with LaTeX $...$ and $$...$$",
  "canvasCard": {
    "title": "Descriptive concept title (e.g. Concentric Rings Area Derivation)",
    "summary": "Core formula or 1-2 sentence takeaway",
    "suggestedX": ${Math.round((canvasCoordinates?.x || 300) + 120)},
    "suggestedY": ${Math.round((canvasCoordinates?.y || 200) + 40)}
  },
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

  const messages: any[] = [
    { role: 'system', content: systemPrompt }
  ];

  if (studentDrawingBase64 && studentDrawingBase64.startsWith('data:image')) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: `Here is what I drew and asked on the canvas at ${currentMinSec}: "${question}"` },
        { type: 'image_url', image_url: { url: studentDrawingBase64 } }
      ]
    });
  } else {
    messages.push({
      role: 'user',
      content: `I paused at ${currentMinSec} in "${videoTitle}". Question: "${question}" (Answer depth: ${answerDepth})`
    });
  }

  // =========================================================================
  // MODEL EXECUTION WATERFALL
  // Quick Mode -> Groq (250ms sub-second) -> Antigravity -> OpenRouter
  // Medium / Detailed Mode -> Antigravity (:8090) -> Groq -> OpenRouter
  // =========================================================================

  const callAntigravity = async (): Promise<any | null> => {
    for (const localModel of LOCAL_ANTIGRAVITY_MODELS) {
      try {
        const localResp = await fetch('http://127.0.0.1:8090/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: localModel,
            messages: messages.map(m => {
              if (Array.isArray(m.content)) {
                const txt = m.content.find((c: any) => c.type === 'text')?.text || '';
                return { role: m.role, content: txt };
              }
              return m;
            }),
            temperature: 0.2
          }),
          signal: AbortSignal.timeout(45000)
        });

        if (localResp.ok) {
          const data = await localResp.json() as any;
          const text = data?.choices?.[0]?.message?.content || '';
          if (text && !text.toLowerCase().includes('invalid model selection')) {
            return parseAIResponse(text, question, timestamp, canvasCoordinates);
          }
        }
      } catch (err) {
        console.warn('Antigravity Proxy notice for', localModel, err);
      }
    }
    return null;
  };

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
            messages: messages.map(m => {
              if (Array.isArray(m.content)) {
                const txt = m.content.find((c: any) => c.type === 'text')?.text || '';
                return { role: m.role, content: txt };
              }
              return m;
            }),
            max_tokens: answerDepth === 'quick' ? 600 : 1500,
            temperature: 0.3
          }),
          signal: AbortSignal.timeout(8000)
        });

        if (groqResp.ok) {
          const data = await groqResp.json() as any;
          const text = data?.choices?.[0]?.message?.content || '';
          if (text && !text.toLowerCase().includes('invalid model selection')) {
            return parseAIResponse(text, question, timestamp, canvasCoordinates);
          }
        }
      } catch {}
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
            messages: messages.map(m => {
              if (Array.isArray(m.content)) {
                const txt = m.content.find((c: any) => c.type === 'text')?.text || '';
                return { role: m.role, content: txt };
              }
              return m;
            }),
            max_tokens: answerDepth === 'quick' ? 600 : 1500,
            temperature: 0.3
          }),
          signal: AbortSignal.timeout(10000)
        });

        if (openRouterResp.ok) {
          const data = await openRouterResp.json() as any;
          const text = data?.choices?.[0]?.message?.content || '';
          if (text && !text.toLowerCase().includes('rate limit')) {
            return parseAIResponse(text, question, timestamp, canvasCoordinates);
          }
        }
      } catch {}
    }
    return null;
  };

  // Dispatch according to answerDepth preference
  if (answerDepth === 'quick') {
    const quickReply = await callGroq();
    if (quickReply) return quickReply;

    const antigravityReply = await callAntigravity();
    if (antigravityReply) return antigravityReply;

    const openRouterReply = await callOpenRouter();
    if (openRouterReply) return openRouterReply;
  } else {
    const antigravityReply = await callAntigravity();
    if (antigravityReply) return antigravityReply;

    const groqReply = await callGroq();
    if (groqReply) return groqReply;

    const openRouterReply = await callOpenRouter();
    if (openRouterReply) return openRouterReply;
  }

  // =========================================================================
  // 4. QUATERNARY TIER: Resilient Heuristic Math & Diagram Generator
  // =========================================================================
  return generateHeuristicTutorReply(question, timestamp, videoTitle, canvasCoordinates);
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
        // 4. Targeted Regex Field Extraction
        parsed = {};
        
        // Extract content field
        const contentMatch = cleanedStr.match(/"content"\s*:\s*"([\s\S]*?)"\s*,\s*"(?:canvasCard|diagram|quiz)/);
        if (contentMatch) {
          parsed.content = contentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }

        // Extract SVG markup
        const svgMatch = cleanedStr.match(/<svg[\s\S]*?<\/svg>/);
        if (svgMatch) {
          parsed.diagram = {
            id: `diag-${Date.now()}`,
            title: 'Visual Conceptual Model',
            svgMarkup: svgMatch[0],
            caption: 'Procedural visual derivation'
          };
        }

        // Extract canvas title
        const titleMatch = cleanedStr.match(/"title"\s*:\s*"([^"]+)"/);
        if (titleMatch) {
          parsed.canvasCard = { title: titleMatch[1] };
        }
      }
    }
  }

  // Ensure content is clean text and never a raw JSON dump
  let finalContent = parsed?.content || '';
  if (!finalContent || typeof finalContent !== 'string' || finalContent.trim().startsWith('{')) {
    // If rawText starts with JSON object, clean it
    const stripJsonMatch = rawText.match(/"content"\s*:\s*"([\s\S]*?)"\s*,\s*"/);
    if (stripJsonMatch) {
      finalContent = stripJsonMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    } else {
      // Strip outer braces if present
      finalContent = rawText
        .replace(/^\s*\{\s*"content"\s*:\s*"/, '')
        .replace(/"\s*,\s*"canvasCard[\s\S]*$/, '')
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"');
    }
  }

  // Ensure diagram only exists if genuinely provided by the AI
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
      diagram = null; // NEVER force an unneeded diagram
    }
  }

  const targetX = canvasCoordinates?.x ? canvasCoordinates.x + 140 : 450;
  const targetY = canvasCoordinates?.y ? canvasCoordinates.y - 20 : 150;

  const canvasNode: Partial<CanvasNode> = {
    id: `node-${Date.now()}`,
    type: 'ai_answer',
    x: parsed?.canvasCard?.suggestedX || targetX,
    y: parsed?.canvasCard?.suggestedY || targetY,
    title: parsed?.canvasCard?.title || 'My Tutor Insight & Derivation',
    content: finalContent,
    diagramSvg: diagram?.svgMarkup,
    timestamp,
    targetDrawingBox: canvasCoordinates ? {
      x: canvasCoordinates.x,
      y: canvasCoordinates.y,
      width: canvasCoordinates.width || 60,
      height: canvasCoordinates.height || 40
    } : undefined,
    createdAt: Date.now()
  };

  return {
    role: 'assistant',
    content: finalContent,
    diagram: diagram || null,
    quiz: parsed?.quiz,
    suggestedPrompts: parsed?.suggestedPrompts || [
      'Can you break down the next step geometrically?',
      'How does this relate to the lecture video?'
    ],
    timestamp,
    canvasNode
  };
}

function generateFallbackDiagram(question: string, timestamp: number): InteractiveDiagram | null {
  const q = question.toLowerCase();

  if (q.includes('area') || q.includes('integral') || q.includes('curve') || q.includes('parabola') || q.includes('graph') || q.includes('tangent') || q.includes('slope') || q.includes('geometry') || q.includes('draw') || q.includes('diagram') || q.includes('plot')) {
    return {
      id: 'diag-integral',
      title: 'Area Under Curve & Differential Strip: $y = x^2$',
      type: 'calculus_integral',
      description: 'As we slice the area under the parabola into thin strips of width $dx$, the area increments by $dA = x^2 dx$.',
      caption: 'Accumulated area $A(x) = \\int_0^x t^2 dt = \\frac{1}{3}x^3$',
      svgMarkup: `
        <svg viewBox="0 0 500 300" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect width="500" height="300" fill="#0f172a" rx="12" />
          <!-- Grid lines -->
          <line x1="60" y1="260" x2="460" y2="260" stroke="#334155" stroke-width="2" />
          <line x1="60" y1="260" x2="60" y2="30" stroke="#334155" stroke-width="2" />
          <text x="470" y="265" font-size="14" font-weight="bold" fill="#94a3b8">x</text>
          <text x="50" y="25" font-size="14" font-weight="bold" fill="#94a3b8">y</text>
          
          <!-- Shaded Area -->
          <path d="M 60,260 Q 200,250 320,100 L 320,260 Z" fill="#3b82f6" fill-opacity="0.25" />
          
          <!-- Parabola Curve y = x^2 -->
          <path d="M 60,260 Q 200,250 420,50" fill="none" stroke="#60a5fa" stroke-width="3.5" stroke-linecap="round" />
          
          <!-- Differential Strip dA -->
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

  if (q.includes('friction') || q.includes('force') || q.includes('normal') || q.includes('ramp') || q.includes('incline') || q.includes('gravity') || q.includes('vector') || q.includes('free body')) {
    return {
      id: 'diag-ramp-friction',
      title: 'Free Body Diagram: Ramp with Friction',
      type: 'free_body_forces',
      description: 'Resolution of gravity into parallel component $mg\\sin\\theta$ and perpendicular component $mg\\cos\\theta$.',
      caption: 'Equilibrium condition: $N = mg\\cos\\theta$, Net Force $F_{net} = mg\\sin\\theta - f_k$',
      svgMarkup: `
        <svg viewBox="0 0 500 300" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect width="500" height="300" fill="#0f172a" rx="12" />
          <!-- Inclined Plane (Ramp) -->
          <polygon points="60,260 440,260 440,80" fill="#1e293b" stroke="#475569" stroke-width="2" />
          <path d="M 120,260 A 60 60 0 0 0 110,240" fill="none" stroke="#94a3b8" stroke-width="2" />
          <text x="135" y="250" font-size="14" fill="#94a3b8" font-style="italic">θ</text>
          
          <!-- Box on Ramp -->
          <g transform="translate(250, 170) rotate(-26)">
            <rect x="-35" y="-35" width="70" height="70" fill="#2563eb" fill-opacity="0.8" stroke="#60a5fa" stroke-width="2" rx="4" />
            <text x="0" y="5" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">m</text>
            
            <!-- Normal Force N (upwards perp) -->
            <line x1="0" y1="0" x2="0" y2="-90" stroke="#10b981" stroke-width="3" />
            <text x="15" y="-75" font-size="13" font-weight="bold" fill="#34d399">N = mg cos θ</text>
            
            <!-- Friction fk (backwards parallel) -->
            <line x1="0" y1="0" x2="-80" y2="0" stroke="#f59e0b" stroke-width="3" />
            <text x="-95" y="-10" font-size="13" font-weight="bold" fill="#fcd34d">f_k = μ_k N</text>
            
            <!-- Downslope component mg sin theta -->
            <line x1="0" y1="0" x2="80" y2="0" stroke="#38bdf8" stroke-width="3" />
            <text x="25" y="25" font-size="13" font-weight="bold" fill="#7dd3fc">mg sin θ</text>
          </g>
          
          <!-- True Gravity Vector (Straight down) -->
          <line x1="250" y1="170" x2="250" y2="280" stroke="#ef4444" stroke-width="3" />
          <text x="260" y="270" font-size="13" font-weight="bold" fill="#f87171">F_g = mg</text>
        </svg>
      `
    };
  }

  // Non-visual / conceptual questions return null to prevent unwanted diagram popups
  return null;
}

function generateHeuristicTutorReply(question: string, timestamp: number, videoTitle: string, canvasCoordinates?: any): Partial<TutorMessage> & { canvasNode?: Partial<CanvasNode> } {
  const minSec = `${Math.floor(timestamp / 60)}:${String(Math.floor(timestamp % 60)).padStart(2, '0')}`;
  const diagram = generateFallbackDiagram(question, timestamp);

  const targetX = canvasCoordinates?.x ? canvasCoordinates.x + 140 : 450;
  const targetY = canvasCoordinates?.y ? canvasCoordinates.y - 20 : 150;

  const content = `### Analysis at ${minSec}\n\nWhen we examine the concept at this exact timestamp in **${videoTitle}**:\n\n1. **Fundamental Mechanism**: A small perturbation in the input $\\Delta x$ produces an instantaneous rate of change in the output:\n$$\\frac{dy}{dx} = \\lim_{\\Delta x \\to 0} \\frac{f(x + \\Delta x) - f(x)}{\\Delta x}$$\n\n2. **Conceptual Significance**: The derivative represents the instantaneous rate of change and slope of the tangent line at $(x, f(x))$.\n\n3. **Application**: Notice how this directly relates to what the professor is explaining at ${minSec}.`;

  return {
    role: 'assistant',
    content,
    diagram: diagram || null,
    quiz: {
      question: 'What does the derivative geometrically represent on the curve?',
      type: 'multiple_choice',
      options: [
        'The slope of the tangent line at that exact point',
        'The total accumulated area under the curve',
        'The average height of the function',
        'The distance between two intercepts'
      ],
      correctAnswerIndex: 0,
      explanation: 'The derivative $f\'(x)$ represents the instantaneous rate of change, which corresponds exactly to the slope of the tangent line at that point.',
      targetedConcept: 'Geometric definition of the derivative'
    },
    suggestedPrompts: [
      'Why is the power rule $(x^n)\' = n x^{n-1}$ true geometrically?',
      'How does this connect to what is shown on the blackboard?'
    ],
    timestamp,
    canvasNode: {
      id: `node-${Date.now()}`,
      type: 'ai_answer',
      x: targetX,
      y: targetY,
      title: 'Derivative & Step-by-Step Derivation',
      content,
      diagramSvg: diagram?.svgMarkup || undefined,
      timestamp,
      createdAt: Date.now()
    }
  };
}
