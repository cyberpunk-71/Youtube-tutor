const OPENROUTER_API_KEY = 'process.env.OPENROUTER_API_KEY || ''';

async function checkModels() {
  const models = [
    'deepseek/deepseek-chat',
    'deepseek/deepseek-r1:free',
    'qwen/qwen-2.5-72b-instruct',
    'meta-llama/llama-3.1-8b-instruct:free',
    'mistralai/mistral-7b-instruct:free',
    'nvidia/nemotron-4-340b-instruct',
    'nvidia/llama-3.1-nemotron-70b-instruct'
  ];
  for (const m of models) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: m,
          messages: [{ role: 'user', content: 'Say hello in one word' }],
          max_tokens: 10
        })
      });
      const data = await res.json() as any;
      console.log(`[OpenRouter] ${m}:`, res.status, data?.choices?.[0]?.message?.content || data?.error?.message || data);
    } catch (e: any) {
      console.log(`[OpenRouter] ${m} error:`, e.message);
    }
  }
}

checkModels();
