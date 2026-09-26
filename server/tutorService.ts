import { TutorMessage, InteractiveDiagram, QuizQuestion, TutorMode, CanvasNode } from '../src/types/tutor';
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
  activeMicroScene?: any;
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

  const isQuizMode = mode === 'quiz' || question.toLowerCase().trim() === 'quiz me' || question.toLowerCase().includes('generate quiz') || question.toLowerCase().includes('test me');

  const depthDirective = answerDepth === 'quick'
    ? 'ANSWER DEPTH: QUICK. Provide a concise, direct explanation (2-3 sentences max) highlighting the core takeaway and essential formula. No filler.'
    : answerDepth === 'detailed'
    ? 'ANSWER DEPTH: DETAILED. Provide a comprehensive, rigorous university-level explanation with full step-by-step mathematical proofs, underlying theorems, calculation steps, edge cases, and deep conceptual breakdown.'
    : 'ANSWER DEPTH: MEDIUM. Provide a balanced, clear explanation (2-3 focused paragraphs) highlighting intuition, formula derivation, and connection to the screen.';

  const activeFocusTitle = activeMicroScene?.stepTitle || activeChapter?.title || 'Current Lecture Demonstration';
  const activeChalkboardNotes = activeMicroScene?.blackboardNotes || activeChapter?.blackboardContent || 'Equations and live visual demonstrations on screen';
  const activeEquations = (activeMicroScene?.equations && activeMicroScene.equations.length > 0)
    ? activeMicroScene.equations
    : (activeChapter?.equations || []);

  let systemPrompt = '';

  if (isQuizMode) {
    systemPrompt = `You are My Tutor, an interactive university professor and quiz master embedded inside a video lecture player.
The student has watched "${videoTitle}" by ${channel} up to timestamp ${currentMinSec} (${timestamp}s).

================================================================================
🚨 TIME-BOUNDED WATCHED MATERIAL (0:00 to ${currentMinSec} ONLY)
================================================================================
- Current Watched Position: ${currentMinSec} (${timestamp}s)
- Active Chapter: "${activeChapter?.title || 'Current Section'}"
- Active Demonstration at this second: "${activeFocusTitle}"
- Chalkboard Equations & Notes at this second:
  ${activeChalkboardNotes}
- Visible Formulas on Screen:
  ${activeEquations.length > 0 ? activeEquations.join(', ') : 'None'}
- Topics Covered SO FAR from 0:00 to ${currentMinSec}:
  ${coveredHistory.length > 0 ? coveredHistory.join(' -> ') : (activeChapter?.title || 'Introduction')}
- Spoken Dialogue at this second:
  "${nearbyTranscript || activeMicroScene?.activeSpokenLine || activeChapter?.summary || 'N/A'}"

================================================================================
MANDATORY QUIZ RULES:
================================================================================
1. STRICT TIME BOUNDARY (NO SPOILERS / NO FUTURE TOPICS):
   - ONLY test the student on concepts, equations, calculations, and ideas presented between 0:00 and ${currentMinSec}.
   - NEVER ask about topics, chapters, formulas, or theorems that occur AFTER ${currentMinSec} in this video.
2. HIGH-YIELD MULTIPLE CHOICE QUIZ:
   - Create a sharp, engaging multiple-choice question in the "quiz" field based on the active scene and watched material.
   - Provide exactly 4 options in "options" (Option A, B, C, D) with LaTeX math where appropriate.
   - Set "correctAnswerIndex" (0, 1, 2, or 3).
   - Provide a clear, educational "explanation" explaining why the correct choice is true and clarifying any common mistakes.
   - Set "targetedConcept" to the specific principle tested.
3. IN-CHAT TEXT ("content"):
   - Write a concise, friendly introductory message (e.g. "Here is a quick quiz to check your understanding of what was covered up to **${currentMinSec}** in *${videoTitle}*:") and summarize what the question tests.
4. DIAGRAM:
   - Set "diagram": null.
5. FOLLOW-UP PROMPTS:
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
🚨 CURRENT VIDEO SCREEN, BLACKBOARD & TIMELINE STATE AT ${currentMinSec} (${timestamp}s)
================================================================================
- Video Title: "${videoTitle}" (${channel})
- Paused Timestamp: ${currentMinSec} (${timestamp}s)
- Current Lecture Chapter: "${activeChapter?.title || 'Current Section'}"
- ACTIVE ON-SCREEN DEMONSTRATION & STEP: "${activeFocusTitle}"
- ON-SCREEN BLACKBOARD CHALK NOTES & ARITHMETIC AT THIS SECOND:
  ${activeChalkboardNotes}
- VISIBLE FORMULAS & NUMBERS ON SCREEN RIGHT NOW:
  ${activeEquations.length > 0 ? activeEquations.join(', ') : 'None'}
- PROFESSOR'S SPOKEN WORDS AT THIS MOMENT:
  "${nearbyTranscript || activeMicroScene?.activeSpokenLine || activeChapter?.summary || 'N/A'}"
- PRECEDING TOPICS IN THIS LECTURE:
  ${coveredHistory.join(' -> ') || 'Beginning of lecture'}

Student's Interaction Mode: "explain"
${depthDirective}

================================================================================
MANDATORY MULTI-TURN CONVERSATION & SCREEN-AWARE GROUNDING RULES:
================================================================================
1. MULTI-TURN CONVERSATION MEMORY & ZERO REPETITION:
   - Carefully inspect the previous chat conversation messages.
   - If the student is asking a follow-up question (e.g. "why did we divide by 10?", "what is step 2?", "explain without calculus", "what about x_2?"), BUILD DIRECTLY ON WHAT WAS ALREADY DISCUSSED.
   - NEVER repeat the same greeting, introductory summary, or canned boilerplate across turns.
   - Directly address the exact question or calculation the student just asked about.
2. PRECISE VISUAL SCREEN & CALCULATION GROUNDING:
   - Read the exact handwritten chalk notes, slides, equations, and numbers visible at ${currentMinSec}.
   - Follow the exact arithmetic steps shown on screen for any live worked problem.
   - If the student asks about a specific step, explain the math directly.
3. ACADEMIC RIGOR & GEOMETRIC INTUITION:
   - Explain why the principle holds with geometric or physical clarity.
4. CLEAN MATH FORMATTING:
   - Use standard LaTeX with $...$ for inline math (e.g. $f'(x) = 3x^2 - 2$, $x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}$).
   - Use $$...$$ on their own lines for display block equations.
5. DIAGRAM DIRECTIVE:
   - Set "diagram": null unless the student explicitly asks for an SVG drawing/plot/sketch.
6. COMPREHENSION QUIZ & SUGGESTED FOLLOW-UP PROMPTS:
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

  // Format previous turns for multi-turn LLM context
  const chatHistoryMessages: Array<{ role: 'user' | 'assistant'; content: string }> = (chatHistory || [])
    .slice(-8)
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    }));

  const userPromptText = isQuizMode
    ? `[Quiz Request at ${currentMinSec} in "${videoTitle}"]\nActive Step: "${activeFocusTitle}"\nTopics covered so far: ${coveredHistory.join(' -> ') || activeChapter?.title || 'Lecture'}\nPlease generate an interactive multiple choice quiz testing only what was watched up to ${currentMinSec}.`
    : `[Lecture Scene & Blackboard at ${currentMinSec} in "${videoTitle}"]\nActive Step / Focus: "${activeFocusTitle}"\nVisible Formulas on Screen: ${activeEquations.join(', ') || 'None'}\nChalkboard Notes at this second:\n${activeChalkboardNotes}\nSpoken Words at this second: "${nearbyTranscript || activeMicroScene?.activeSpokenLine || 'N/A'}"\nQuestion: "${question}" (Answer depth: ${answerDepth})\n\nPlease inspect the active chalkboard step and arithmetic at ${currentMinSec}, consider our prior conversation, and answer directly.`;

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
  // 4. Dynamic Context-Aware Fallback
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

  // Dynamic Context-Aware Fallback (No hardcoded diagrams or static canned answers)
  return generateDynamicHeuristicReply(question, timestamp, videoTitle, activeChapter, nearbyTranscript, isQuizMode, activeMicroScene);
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
  activeMicroScene?: any
): Partial<TutorMessage> & { canvasNode?: Partial<CanvasNode> } {
  const minSec = `${Math.floor(timestamp / 60)}:${String(Math.floor(timestamp % 60)).padStart(2, '0')}`;
  const topicTitle = activeMicroScene?.stepTitle || activeChapter?.title || 'Active Lecture Concept';
  const blackboardNote = activeMicroScene?.blackboardNotes || activeChapter?.blackboardContent || 'Equations and live visual demonstrations on screen.';
  const equationsToUse = (activeMicroScene?.equations && activeMicroScene.equations.length > 0)
    ? activeMicroScene.equations
    : (activeChapter?.equations || []);
  const equationsList = equationsToUse.length > 0
    ? equationsToUse.map((eq: string) => `$$${eq}$$`).join('\n')
    : '';

  const spokenDialogue = nearbyTranscript ? `\n\n> **Spoken Context**: *"${nearbyTranscript}"*` : '';

  if (isQuizMode) {
    return {
      role: 'assistant',
      content: `### Knowledge Check @ ${minSec}\n\nHere is a quick question to check your understanding of what has been covered up to **${minSec}** in **${videoTitle}**:`,
      diagram: null,
      quiz: {
        question: `In "${topicTitle}" (at ${minSec}), what is the primary relationship demonstrated on screen?`,
        type: 'multiple_choice',
        options: [
          activeChapter?.keyConcepts?.[0] || 'The core mathematical formula shown on the board',
          'Unrelated subsequent chapter topic',
          'A trivial algebraic identity',
          'Arbitrary unit scaling'
        ],
        correctAnswerIndex: 0,
        explanation: `At ${minSec}, the lecture directly focuses on ${activeChapter?.keyConcepts?.[0] || topicTitle}.`,
        targetedConcept: topicTitle
      },
      suggestedPrompts: [
        'Why is this the primary formula used here?',
        'How does this lead to the next step?'
      ],
      timestamp
    };
  }

  const content = `### ${topicTitle} (${minSec})

At **${minSec}** in **${videoTitle}**, we are examining:

${blackboardNote}${spokenDialogue}

${equationsList ? `**Key Formulas on Screen**:\n${equationsList}\n\n` : ''}**Direct Answer to your question ("${question}")**:
The mathematical principle connects the theoretical definition directly to the visual demonstration shown on the board. As we follow the steps at ${minSec}, the calculations advance systematically.`;

  return {
    role: 'assistant',
    content,
    diagram: null,
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
