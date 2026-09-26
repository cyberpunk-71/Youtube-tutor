import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { CURATED_LIBRARY } from './curatedLibrary';
import { getVideoMetadata, captureVideoFrame } from './youtubeService';
import { askTutor } from './tutorService';
import { analyzeBlackboard } from './blackboardService';

const app = express();
const PORT = process.env.PORT || 3456;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frames if any are saved locally
const framesDir = path.join(process.cwd(), 'public', 'captured_frames');
if (!fs.existsSync(framesDir)) {
  fs.mkdirSync(framesDir, { recursive: true });
}
app.use('/captured_frames', express.static(framesDir));

// Serve production frontend bundle
const distDir = path.join(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', engine: 'My Tutor AI Video Engine', time: new Date().toISOString() });
});

app.get('/api/library', (req, res) => {
  res.json({ library: CURATED_LIBRARY });
});

app.post('/api/video/info', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Video URL or ID is required' });
    }
    const metadata = await getVideoMetadata(url);
    res.json(metadata);
  } catch (err: any) {
    console.error('Error fetching video info:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch video information' });
  }
});

app.post('/api/video/frame', async (req, res) => {
  try {
    const { videoId, timestamp } = req.body;
    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' });
    }
    const result = await captureVideoFrame(videoId, Number(timestamp) || 0);
    res.json(result);
  } catch (err: any) {
    console.error('Error capturing frame:', err);
    res.status(500).json({ error: err.message || 'Failed to capture frame' });
  }
});

app.post('/api/tutor/ask', async (req, res) => {
  try {
    const {
      question,
      mode,
      answerDepth,
      timestamp,
      videoId,
      videoTitle,
      channel,
      chapters,
      coveredHistory,
      nearbyTranscript,
      activeChapter,
      studentDrawingBase64,
      blackboardFrameBase64,
      frameUrl,
      canvasCoordinates
    } = req.body;

    if (!question && !studentDrawingBase64) {
      return res.status(400).json({ error: 'Question or drawing is required' });
    }

    const reply = await askTutor({
      question: question || 'Explain my drawing and whether my solution is correct',
      mode: mode || 'socratic',
      answerDepth: answerDepth || 'medium',
      timestamp: Number(timestamp) || 0,
      videoId,
      videoTitle: videoTitle || 'Lecture Video',
      channel: channel || 'Professor',
      chapters: chapters || [],
      coveredHistory: coveredHistory || [],
      nearbyTranscript: nearbyTranscript || '',
      activeChapter: activeChapter || null,
      studentDrawingBase64,
      blackboardFrameBase64,
      frameUrl,
      canvasCoordinates
    });

    res.json(reply);
  } catch (err: any) {
    console.error('Error in tutor query:', err);
    res.status(500).json({ error: err.message || 'AI Tutor query failed' });
  }
});

app.post('/api/tutor/analyze-frame', async (req, res) => {
  try {
    const { videoId, timestamp, videoTitle, chapterContext, imageBase64 } = req.body;
    const analysis = await analyzeBlackboard(
      videoId || 'video',
      Number(timestamp) || 0,
      videoTitle || 'Lecture',
      chapterContext,
      imageBase64
    );
    res.json(analysis);
  } catch (err: any) {
    console.error('Error in blackboard OCR analysis:', err);
    res.status(500).json({ error: err.message || 'Blackboard analysis failed' });
  }
});

app.post('/api/tutor/check-drawing', async (req, res) => {
  try {
    const { question, drawingBase64, timestamp, videoTitle, canvasCoordinates } = req.body;
    const reply = await askTutor({
      question: `Student drew their attempt on the whiteboard for "${question || 'the current problem'}". Check their drawing, evaluate if the logic/formulas/graph are correct, point out any specific mistakes, and provide constructive guidance.`,
      mode: 'sketch',
      timestamp: Number(timestamp) || 0,
      videoTitle: videoTitle || 'Lecture',
      channel: 'Professor',
      studentDrawingBase64: drawingBase64,
      canvasCoordinates
    });
    res.json(reply);
  } catch (err: any) {
    console.error('Error in checking drawing:', err);
    res.status(500).json({ error: err.message || 'Drawing check failed' });
  }
});

// Fallback to index.html for single-page app routing
app.use((req, res) => {
  const indexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('My Tutor backend is active. Run `bun run build` or start Vite dev server.');
  }
});

app.listen(PORT, () => {
  console.log(`✨ My Tutor Server running on http://0.0.0.0:${PORT}`);
});
