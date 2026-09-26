import { askTutor } from './server/tutorService';
import { CURATED_LIBRARY } from './server/curatedLibrary';
import { getLiveSceneState } from './src/utils/chapterHelper';

const numVideo = CURATED_LIBRARY.find(v => v.title.includes('Numerical Analysis'))!;

async function runTest() {
  console.log('Testing Numerical Analysis Video at multiple live timestamps...\n');

  const testCases = [
    {
      timestamp: 60,
      question: "What is the Bisection method doing at this point in the lecture?",
      mode: 'explain' as const
    },
    {
      timestamp: 450,
      question: "What problem are we setting up to solve on the blackboard and what is x_0?",
      mode: 'explain' as const
    },
    {
      timestamp: 530,
      question: "Explain Step 1 on the blackboard: how did we compute f(2), f'(2), and find x_1 = 2.1?",
      mode: 'explain' as const
    },
    {
      timestamp: 620,
      question: "Explain Step 2: what was f(2.1) and what is the new estimate x_2?",
      mode: 'explain' as const
    },
    {
      timestamp: 850,
      question: "How is the square root of 7 computed using the Babylonian formula on the board?",
      mode: 'explain' as const
    },
    {
      timestamp: 1000,
      question: "What does quadratic convergence mean and why does precision double?",
      mode: 'explain' as const
    },
    {
      timestamp: 530,
      question: "Generate a quiz to test my understanding so far",
      mode: 'quiz' as const
    }
  ];

  for (const tc of testCases) {
    const min = Math.floor(tc.timestamp / 60);
    const sec = String(Math.floor(tc.timestamp % 60)).padStart(2, '0');
    const liveScene = getLiveSceneState(numVideo.chapters, numVideo.transcript, tc.timestamp);

    console.log(`========================================================================`);
    console.log(`⏱ Timestamp: ${min}:${sec} (${tc.timestamp}s) | Mode: ${tc.mode}`);
    console.log(`🎯 Step Title: ${liveScene.stepTitle}`);
    console.log(`🗣 Live Spoken Line: "${liveScene.activeSpokenLine}"`);
    console.log(`❓ Question: "${tc.question}"`);

    const start = Date.now();
    const res = await askTutor({
      question: tc.question,
      mode: tc.mode,
      answerDepth: 'quick',
      timestamp: tc.timestamp,
      videoId: numVideo.id,
      videoTitle: numVideo.title,
      channel: numVideo.channel,
      chapters: numVideo.chapters,
      coveredHistory: numVideo.chapters?.filter(c => c.startTime <= tc.timestamp).map(c => c.title),
      nearbyTranscript: liveScene.surroundingContext,
      activeChapter: numVideo.chapters?.find(c => tc.timestamp >= c.startTime && tc.timestamp < c.endTime),
      activeMicroScene: liveScene
    });
    const elapsed = Date.now() - start;

    console.log(`⚡ Finished in ${elapsed}ms`);
    console.log(`📝 Content:\n${res.content}`);
    if (res.quiz) {
      console.log(`🧩 Quiz Question: ${res.quiz.question}`);
      console.log(`   Options: ${JSON.stringify(res.quiz.options)}`);
      console.log(`   Correct Index: ${res.quiz.correctAnswerIndex}`);
      console.log(`   Explanation: ${res.quiz.explanation}`);
    }
    console.log('');
  }
}

runTest().catch(console.error);
