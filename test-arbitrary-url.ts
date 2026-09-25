import { getVideoMetadata } from './server/youtubeService';

async function testArbitraryUrl(url: string) {
  console.log(`\n======================================================`);
  console.log(`Testing Arbitrary URL: ${url}`);
  const t0 = performance.now();
  const meta = await getVideoMetadata(url);
  const elapsed = (performance.now() - t0).toFixed(0);
  console.log(`⚡ Extracted metadata in ${elapsed}ms:`);
  console.log(`   Title: "${meta.title}" (${meta.channel})`);
  console.log(`   Duration: ${meta.duration}s | Chapters: ${meta.chapters.length} | Transcript Lines: ${meta.transcript?.length || 0}`);
  console.log(`\n📋 First 3 Chapters:`);
  for (const ch of meta.chapters.slice(0, 3)) {
    console.log(`   - [${ch.startTime}s - ${ch.endTime}s] ${ch.title}`);
    console.log(`     Summary: ${ch.summary}`);
    console.log(`     Blackboard: ${ch.blackboardContent?.slice(0, 80)}...`);
    console.log(`     Equations: ${ch.equations.join(', ')}`);
  }
}

async function run() {
  // Test 1: Random MIT OpenCourseWare Video
  await testArbitraryUrl('https://www.youtube.com/watch?v=7uT_q9Vq3G4'); // MIT 18.06 Strang Linear Algebra

  // Test 2: Random CS50 or Chemistry Video
  await testArbitraryUrl('https://www.youtube.com/watch?v=WS4_KkZkH_A'); // Organic Chemistry Tutor
}

run().catch(console.error);
