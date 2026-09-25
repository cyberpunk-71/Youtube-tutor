const OPENROUTER_API_KEY = 'process.env.OPENROUTER_API_KEY || ''';

async function listNemotron() {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}` }
  });
  const data = await res.json() as any;
  const models = data.data || [];
  const nvidia = models.filter((m: any) => m.id.includes('nemotron') || m.id.includes('nvidia') || m.id.includes('deepseek') || m.id.includes('qwen'));
  console.log("Nvidia / relevant models in OpenRouter:", nvidia.map((m: any) => m.id));
}

listNemotron();
