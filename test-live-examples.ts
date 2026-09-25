import { CURATED_LIBRARY } from './server/curatedLibrary';

async function testMoment(videoId: string, timestamp: number, question: string, depth: 'quick' | 'medium' | 'detailed') {
  const video = CURATED_LIBRARY.find(v => v.id === videoId)!;
  const activeChapter = video.chapters.find(c => timestamp >= c.startTime && timestamp <= c.endTime) || video.chapters[0];
  const nearbyTranscript = video.transcript
    ?.filter(t => t.start <= timestamp + 30 && t.start + (t.duration || 15) >= timestamp - 90)
    .map(t => `[${Math.floor(t.start/60)}:${String(Math.floor(t.start%60)).padStart(2,'0')}] ${t.text}`)
    .join(' ') || '';

  console.log(`\n========================================================================`);
  console.log(`🎬 Video: "${video.title}" | Timestamp: ${Math.floor(timestamp/60)}:${String(Math.floor(timestamp%60)).padStart(2,'0')} (${timestamp}s)`);
  console.log(`📌 Active Chapter: "${activeChapter.title}"`);
  console.log(`📋 On-Screen Blackboard: "${activeChapter.blackboardContent?.slice(0, 100)}..."`);
  console.log(`💬 User Question: "${question}" [${depth.toUpperCase()}]`);

  const t0 = performance.now();
  const res = await fetch('http://localhost:3456/api/tutor/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      mode: 'explain',
      answerDepth: depth,
      timestamp,
      videoTitle: video.title,
      channel: video.channel,
      chapters: video.chapters,
      coveredHistory: video.chapters.filter(c => c.startTime <= timestamp).map(c => c.title),
      nearbyTranscript,
      activeChapter
    })
  });

  const elapsed = (performance.now() - t0).toFixed(0);
  const data = await res.json() as any;
  console.log(`⚡ Response in ${elapsed}ms:`);
  console.log(`📝 AI Answer:\n${data.content}\n`);
  console.log(`🗂 Canvas Card Title: ${data.canvasNode?.title}`);
  console.log(`📐 Diagram: ${data.diagram ? 'YES (' + data.diagram.title + ')' : 'NO (null)'}`);
}

async function main() {
  // Test 1: 3Blue1Brown Calculus at 50s (Circle concentric rings)
  await testMoment('WUvTyaaNkzM', 50, 'What is the circle being divided into on screen and why?', 'quick');

  // Test 2: 3Blue1Brown Calculus at 200s (Parabola y = x^2 and dx slice)
  await testMoment('WUvTyaaNkzM', 200, 'Explain the graph on screen: what is dx and why does dA = x^2 dx?', 'quick');

  // Test 3: 3Blue1Brown Calculus at 500s (Car position s(t) = t^3)
  await testMoment('WUvTyaaNkzM', 500, 'Why did the video switch to a car and what does s(t) = t^3 represent?', 'quick');

  // Test 4: Walter Lewin at 300s (Static friction critical angle)
  await testMoment('aRDOq75yEwk', 300, 'Why does tan theta_c equal mu_s on the blackboard?', 'quick');
}

main().catch(console.error);
