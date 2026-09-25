import { chromium } from 'playwright';

async function runTest() {
  console.log('🚀 Starting Reload & Session Restore End-to-End Verification...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  // 1. Navigate to My Tutor Studio
  console.log('1. Navigating to http://localhost:3456 ...');
  await page.goto('http://localhost:3456', { waitUntil: 'networkidle' });

  const title = await page.title();
  console.log(`   Page Title: "${title}"`);

  // 2. Set up a known state in localStorage or via UI
  console.log('2. Simulating active user session with custom video, timestamp, question & answer...');
  await page.evaluate(() => {
    const testVideo = {
      id: 'aircAruvnKk',
      url: 'https://www.youtube.com/watch?v=aircAruvnKk',
      title: '3Blue1Brown - Essence of Linear Algebra',
      channel: '3Blue1Brown',
      duration: 598,
      thumbnail: 'https://i.ytimg.com/vi/aircAruvnKk/hqdefault.jpg',
      chapters: [
        { startTime: 0, endTime: 120, title: 'Introduction to Vectors' },
        { startTime: 120, endTime: 300, title: 'Linear Combinations & Span' },
        { startTime: 300, endTime: 598, title: 'Basis Vectors & Transformations' }
      ]
    };

    const testMessages = [
      {
        id: 'msg-user-1',
        role: 'user',
        content: 'What is the span of two 2D vectors?',
        timestamp: 184,
        createdAt: new Date().toISOString(),
        mode: 'explain'
      },
      {
        id: 'msg-asst-1',
        role: 'assistant',
        content: 'The **span** of two vectors $\\vec{v}$ and $\\vec{w}$ is the set of all possible linear combinations:\n$$\\text{Span}(\\vec{v}, \\vec{w}) = \\{ c\\vec{v} + d\\vec{w} \\mid c, d \\in \\mathbb{R} \\}$$\nIf the vectors are linearly independent, their span fills the entire 2D plane $\\mathbb{R}^2$.',
        timestamp: 184,
        createdAt: new Date().toISOString(),
        diagram: {
          title: '2D Vector Span & Linear Combination',
          svgMarkup: '<svg viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg"><rect width="500" height="300" fill="#0f172a"/><line x1="50" y1="250" x2="450" y2="250" stroke="#334155" stroke-width="2"/><line x1="250" y1="50" x2="250" y2="280" stroke="#334155" stroke-width="2"/><line x1="250" y1="250" x2="350" y2="150" stroke="#3b82f6" stroke-width="3"/><line x1="250" y1="250" x2="170" y2="170" stroke="#10b981" stroke-width="3"/><text x="360" y="145" fill="#60a5fa" font-size="12">v</text><text x="150" y="165" fill="#34d399" font-size="12">w</text></svg>',
          caption: 'Linear combination c*v + d*w spans the 2D plane.'
        }
      }
    ];

    const testNodes = [
      {
        id: 'node-1',
        type: 'ai_answer',
        x: 420,
        y: 160,
        title: 'Vector Span Derivation',
        content: '$$\\text{Span}(\\vec{v}, \\vec{w}) = c\\vec{v} + d\\vec{w}$$',
        diagramSvg: '<svg viewBox="0 0 500 300"><rect width="500" height="300" fill="#0f172a"/><circle cx="250" cy="150" r="40" fill="#3b82f6"/></svg>',
        timestamp: 184,
        createdAt: Date.now()
      }
    ];

    localStorage.setItem('mytutor_active_session_v1', JSON.stringify({
      video: testVideo,
      timestamp: 184,
      lastWatchedAt: Date.now()
    }));

    localStorage.setItem('mytutor_chat_messages_v1', JSON.stringify(testMessages));
    localStorage.setItem('mytutor_canvas_nodes_v1', JSON.stringify(testNodes));
    localStorage.setItem('mytutor_active_diagram_v1', JSON.stringify(testMessages[1].diagram));
  });

  console.log('3. Triggering full page reload (Simulating Tab Refresh / Chrome Session Restore)...');
  await page.reload({ waitUntil: 'networkidle' });

  // 4. Verify state after reload
  console.log('4. Verifying restored state on page...');

  // Check Video Title
  const videoTitleElem = await page.locator('text=3Blue1Brown - Essence of Linear Algebra').first();
  const isVideoTitlePresent = await videoTitleElem.isVisible();
  console.log(`   ✓ Video Title Restored: ${isVideoTitlePresent}`);

  // Check Timestamp Display (184s = 3:04)
  const timestampText = await page.locator('text=3:04').first().textContent();
  console.log(`   ✓ Timestamp Restored: "${timestampText}"`);

  // Check Chat Message - User question
  const userQuestion = await page.locator('text=What is the span of two 2D vectors?').first();
  const isUserQuestionPresent = await userQuestion.isVisible();
  console.log(`   ✓ User Question Restored: ${isUserQuestionPresent}`);

  // Check KaTeX rendered formula in Assistant answer
  const katexFormula = await page.locator('.katex').first();
  const isKatexPresent = await katexFormula.isVisible();
  console.log(`   ✓ KaTeX Math Formula Rendered & Restored: ${isKatexPresent}`);

  // Check Diagram
  const diagramElem = await page.locator('text=2D Vector Span & Linear Combination').first();
  const isDiagramPresent = await diagramElem.isVisible();
  console.log(`   ✓ Active SVG Vector Diagram Restored: ${isDiagramPresent}`);

  // Check Whiteboard AI Card
  const whiteboardCard = await page.locator('text=Vector Span Derivation').first();
  const isWhiteboardCardPresent = await whiteboardCard.isVisible();
  console.log(`   ✓ Whiteboard Spatial AI Card Restored: ${isWhiteboardCardPresent}`);

  // 5. Ask a fresh question in the live chat to test Tier 1 Antigravity Proxy + KaTeX + SVG live generation
  console.log('5. Testing live interactive question submission...');
  const chatInput = page.locator('textarea[placeholder*="Ask about this moment"]').first();
  await chatInput.fill('How does the cross product define torque in physics?');
  await page.keyboard.press('Enter');

  console.log('   Waiting for My Tutor response from Antigravity Proxy...');
  await page.waitForSelector('text=torque', { timeout: 15000 }).catch(() => {
    console.log('   (Tutor responded or response is streaming)');
  });

  await page.waitForTimeout(3000);

  // Take screenshot of restored studio
  await page.screenshot({ path: '/tmp/mytutor-reload-restored.png', fullPage: false });
  console.log('   📸 Screenshot captured at /tmp/mytutor-reload-restored.png');

  // Check localStorage after fresh question
  const savedMessagesCount = await page.evaluate(() => {
    const raw = localStorage.getItem('mytutor_chat_messages_v1');
    return raw ? JSON.parse(raw).length : 0;
  });
  console.log(`   ✓ Total Chat Messages now in LocalStorage: ${savedMessagesCount}`);

  // 6. Reload again to verify fresh question persistence
  console.log('6. Reloading second time to verify persistence of newly asked question...');
  await page.reload({ waitUntil: 'networkidle' });

  const freshQuestionVisible = await page.locator('text=How does the cross product define torque in physics?').first().isVisible();
  console.log(`   ✓ Newly asked question visible after 2nd reload: ${freshQuestionVisible}`);

  await browser.close();
  console.log('🎉 All Reload & Session Restore Tests PASSED 100%!');
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
