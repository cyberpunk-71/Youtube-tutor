async function testAsk(question: string, answerDepth: 'quick' | 'medium' | 'detailed', timestamp: number) {
  console.log(`\n======================================================`);
  console.log(`🧪 Testing [${answerDepth.toUpperCase()}] Mode: "${question}" at timestamp ${timestamp}s`);
  const t0 = performance.now();
  
  const res = await fetch('http://localhost:3456/api/tutor/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      mode: 'socratic',
      answerDepth,
      timestamp,
      videoTitle: 'The Essence of Calculus, Chapter 1',
      channel: '3Blue1Brown',
      nearbyTranscript: 'So if we look at a tiny nudge in x, dt or dx, how much does the area increase?',
      activeChapter: {
        title: 'The Paradox of the Derivative',
        summary: 'How instantaneous rate of change is defined through limits.',
        equations: ['f\'(x) = lim (f(x+dx) - f(x))/dx']
      },
      chapters: [
        { startTime: 0, endTime: 120, title: 'Introduction', summary: 'Intro to calculus' },
        { startTime: 120, endTime: 300, title: 'The Paradox of the Derivative', summary: 'Limits and rates of change' }
      ],
      coveredHistory: ['Introduction']
    })
  });

  const elapsed = (performance.now() - t0).toFixed(0);
  if (!res.ok) {
    console.error(`❌ Request failed: ${res.status} ${res.statusText}`);
    return;
  }

  const data = await res.json() as any;
  console.log(`⚡ Response received in ${elapsed}ms`);
  console.log(`📝 Content Preview:\n${data.content?.slice(0, 300)}...`);
  console.log(`📐 Diagram Present: ${data.diagram ? 'YES (' + data.diagram.title + ')' : 'NO (null as expected)'}`);
  console.log(`🗂 Canvas Node Title: ${data.canvasNode?.title}`);
}

async function runAllTests() {
  // Test 1: Quick conceptual question -> Should be fast (<1000ms), no diagram
  await testAsk('What is the simple intuitive definition of a derivative?', 'quick', 45);

  // Test 2: Detailed mathematical proof -> Rigorous, math formulas
  await testAsk('Can you provide the step by step limit definition proof for the derivative of x^2?', 'detailed', 140);

  // Test 3: Visual geometric question -> Should include an SVG diagram
  await testAsk('Draw and explain the geometric diagram showing the differential strip dA under y = x^2', 'medium', 180);
}

runAllTests().catch(console.error);
