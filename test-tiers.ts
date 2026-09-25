import { performance } from 'perf_hooks';

const GROQ_API_KEY = 'process.env.GROQ_API_KEY || ''';
const OPENROUTER_API_KEY = 'process.env.OPENROUTER_API_KEY || ''';

const prompt = "Explain the fundamental theorem of calculus in 2 sentences with LaTeX math.";

async function testGroq(model: string) {
  const start = performance.now();
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
    });
    const duration = Math.round(performance.now() - start);
    if (!res.ok) {
      const err = await res.text();
      return { status: 'error', model, duration, error: err };
    }
    const data = await res.json() as any;
    const content = data.choices?.[0]?.message?.content || '';
    return { status: 'ok', model, duration, content, usage: data.usage };
  } catch (e: any) {
    return { status: 'exception', model, duration: Math.round(performance.now() - start), error: e.message };
  }
}

async function testOpenRouter(model: string) {
  const start = performance.now();
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://mytutor.local',
        'X-Title': 'My Tutor AI',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
    });
    const duration = Math.round(performance.now() - start);
    if (!res.ok) {
      const err = await res.text();
      return { status: 'error', model, duration, error: err };
    }
    const data = await res.json() as any;
    const content = data.choices?.[0]?.message?.content || '';
    return { status: 'ok', model, duration, content, usage: data.usage };
  } catch (e: any) {
    return { status: 'exception', model, duration: Math.round(performance.now() - start), error: e.message };
  }
}

async function testAntigravity(model: string) {
  const start = performance.now();
  try {
    const res = await fetch('http://127.0.0.1:8090/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
    });
    const duration = Math.round(performance.now() - start);
    if (!res.ok) {
      const err = await res.text();
      return { status: 'error', model, duration, error: err };
    }
    const data = await res.json() as any;
    const content = data.choices?.[0]?.message?.content || '';
    return { status: 'ok', model, duration, content, usage: data.usage };
  } catch (e: any) {
    return { status: 'exception', model, duration: Math.round(performance.now() - start), error: e.message };
  }
}

async function run() {
  console.log("=== Testing Tier 1: Groq Models ===");
  // Test common groq models
  const groqCandidates = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-120b',
    'deepseek-r1-distill-llama-70b',
    'mixtral-8x7b-32768'
  ];
  for (const m of groqCandidates) {
    const r = await testGroq(m);
    console.log(`[Groq] ${m}: ${r.status} (${r.duration}ms)`);
    if (r.status === 'ok') {
      console.log(`   Preview: ${r.content?.slice(0, 120)}...`);
    } else {
      console.log(`   Error: ${r.error?.slice(0, 120)}`);
    }
  }

  console.log("\n=== Testing Tier 2: OpenRouter Models (Nemotron & Free Tier) ===");
  const openRouterCandidates = [
    'nvidia/llama-3.1-nemotron-70b-instruct',
    'nvidia/llama-3.1-nemotron-70b-instruct:free',
    'nvidia/nemotron-3-ultra-550b-a55b:free',
    'nvidia/nemotron-3.5-lightning:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemini-2.0-flash-exp:free'
  ];
  for (const m of openRouterCandidates) {
    const r = await testOpenRouter(m);
    console.log(`[OpenRouter] ${m}: ${r.status} (${r.duration}ms)`);
    if (r.status === 'ok') {
      console.log(`   Preview: ${r.content?.slice(0, 120)}...`);
    } else {
      console.log(`   Error: ${r.error?.slice(0, 120)}`);
    }
  }

  console.log("\n=== Testing Tier 3: Hermes Antigravity Proxy (Port 8090) ===");
  const antigravityCandidates = [
    'gemini-3.8-flash-high',
    'gemini-3.8-flash',
    'gemini-3.8-flash-medium'
  ];
  for (const m of antigravityCandidates) {
    const r = await testAntigravity(m);
    console.log(`[Antigravity] ${m}: ${r.status} (${r.duration}ms)`);
    if (r.status === 'ok') {
      console.log(`   Preview: ${r.content?.slice(0, 120)}...`);
    } else {
      console.log(`   Error: ${r.error?.slice(0, 120)}`);
    }
  }
}

run();
