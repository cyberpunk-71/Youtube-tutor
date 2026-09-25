const OPENROUTER_API_KEY = 'process.env.OPENROUTER_API_KEY || ''';

async function testModels() {
  const models = [
    'nvidia/nemotron-3.5-lightning',
    'nvidia/nemotron-3-super-120b-a12b',
    'nvidia/nemotron-3-nano-30b-a3b',
    'deepseek/deepseek-chat',
    'qwen/qwen-2.5-72b-instruct'
  ];
  for (const m of models) {
    const start = Date.now();
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
          model: m,
          messages: [{ role: 'user', content: 'Explain the fundamental theorem of calculus in 2 sentences with LaTeX math.' }],
          temperature: 0.3
        })
      });
      const dur = Date.now() - start;
      const data = await res.json() as any;
      if (res.ok) {
        console.log(`[OpenRouter OK] ${m} (${dur}ms):`, data.choices?.[0]?.message?.content?.slice(0, 150));
      } else {
        console.log(`[OpenRouter FAIL] ${m} (${dur}ms):`, res.status, data.error?.message || data);
      }
    } catch (e: any) {
      console.log(`[OpenRouter ERR] ${m}:`, e.message);
    }
  }
}

testModels();
