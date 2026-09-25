const systemPrompt = `You are My Tutor, an extraordinary AI tutor for video lectures.
When answering student questions, explain with university-level clarity, structured step-by-step logic, and LaTeX math.
ALWAYS generate a relevant, beautiful SVG diagram in "diagram.svgMarkup" (viewBox='0 0 500 300') illustrating the geometry, physics, or mechanism.

Return a JSON object:
{
  "content": "Comprehensive explanation with $...$ and $$...$$",
  "canvasCard": {
    "title": "Short title",
    "summary": "Core takeaway in 1 sentence"
  },
  "diagram": {
    "id": "diag-1",
    "title": "Diagram Title",
    "type": "coordinate_graph",
    "description": "Visual explanation",
    "caption": "Figure caption",
    "svgMarkup": "<svg viewBox='0 0 500 300' class='w-full h-full' xmlns='http://www.w3.org/2000/svg'>...</svg>"
  },
  "quiz": {
    "question": "Comprehension check?",
    "options": ["A", "B", "C", "D"],
    "correctAnswerIndex": 0,
    "explanation": "Why A is correct"
  },
  "suggestedPrompts": ["Follow-up 1", "Follow-up 2"]
}`;

async function test() {
  const t0 = Date.now();
  const res = await fetch('http://127.0.0.1:8090/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemini-3.8-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Explain why the derivative of x^2 is 2x geometrically with the expanding square.' }
      ],
      temperature: 0.2
    })
  });
  const data = await res.json() as any;
  console.log(`Status: ${res.status}, Time: ${Date.now() - t0}ms`);
  const content = data.choices?.[0]?.message?.content;
  console.log("Raw Response:\n", content);
}

test();
