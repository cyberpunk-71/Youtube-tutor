import { askTutor } from './server/tutorService';

async function main() {
  console.log('Testing askTutor direct call...');
  const t0 = performance.now();
  const res = await askTutor({
    question: 'Why does the derivative of x^2 equal 2x geometrically?',
    mode: 'explain',
    timestamp: 45,
    videoTitle: 'Essence of Calculus',
    channel: '3Blue1Brown',
    chapters: [{ startTime: 0, endTime: 120, title: 'Intro', equations: ['f(x) = x^2'] }],
    coveredHistory: ['Intro']
  });
  const elapsed = (performance.now() - t0).toFixed(0);
  console.log(`Finished in ${elapsed}ms!`);
  console.log('Content preview:', res.content?.slice(0, 200));
  console.log('Diagram title:', res.diagram?.title);
  console.log('Canvas node title:', res.canvasNode?.title);
  console.log('Canvas node content preview:', res.canvasNode?.content?.slice(0, 100));
}

main().catch(console.error);
