import React from 'react';
import katex from 'katex';

interface MathTextProps {
  content: string;
  className?: string;
}

/**
 * Clean up LaTeX string from JSON double escapes and unneeded wraps
 */
function cleanLatex(input: string): string {
  if (!input) return '';
  let cleaned = input.trim();
  // If double escaped backslashes exist (e.g. \\frac -> \frac), normalize single escapes
  // But preserve \\ for line breaks in align/matrix environments
  cleaned = cleaned.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
  return cleaned;
}

export const MathText: React.FC<MathTextProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Render a block math string safely using KaTeX
  const renderBlockMath = (rawMath: string, key: string) => {
    const mathStr = cleanLatex(rawMath);
    try {
      const html = katex.renderToString(mathStr, {
        displayMode: true,
        throwOnError: false,
        trust: true
      });
      return (
        <div
          key={key}
          className="my-2.5 py-2 px-3 bg-white/90 border border-slate-200/80 rounded-xl overflow-x-auto shadow-2xs text-center text-slate-900"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } catch {
      return (
        <div key={key} className="my-2 p-2 bg-slate-100 rounded-lg text-xs font-mono text-slate-700">
          {rawMath}
        </div>
      );
    }
  };

  // Render an inline math string safely using KaTeX
  const renderInlineMath = (rawMath: string, key: string) => {
    const mathStr = cleanLatex(rawMath);
    try {
      const html = katex.renderToString(mathStr, {
        displayMode: false,
        throwOnError: false,
        trust: true
      });
      return (
        <span
          key={key}
          className="inline-math px-1 py-0.5 mx-0.5 rounded bg-blue-50/50 border border-blue-200/40 text-blue-950 font-medium inline-block text-[0.95em]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } catch {
      return <span key={key} className="font-mono text-[0.9em]">{rawMath}</span>;
    }
  };

  // Process text segment for inline math: $...$ or \(...\)
  const processInlineMathAndFormatting = (segment: string, segKey: string): React.ReactNode[] => {
    // Regex for inline math: $...$ or \(...\)
    const inlineRegex = /(\$([^\$\n]+?)\$|\\\(([\s\S]*?)\\\))/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = inlineRegex.exec(segment)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          renderMarkdownChunk(segment.slice(lastIndex, match.index), `${segKey}-txt-${lastIndex}`)
        );
      }

      // Group 2 is $...$, Group 3 is \(...\)
      const mathContent = match[2] !== undefined ? match[2] : match[3];
      parts.push(renderInlineMath(mathContent, `${segKey}-inmath-${match.index}`));
      lastIndex = inlineRegex.lastIndex;
    }

    if (lastIndex < segment.length) {
      parts.push(
        renderMarkdownChunk(segment.slice(lastIndex), `${segKey}-txt-end`)
      );
    }

    return parts.length > 0 ? parts : [renderMarkdownChunk(segment, `${segKey}-full`)];
  };

  // Render basic markdown chunks (bold, italic, headers, lists, code)
  const renderMarkdownChunk = (rawText: string, keyPrefix: string): React.ReactNode => {
    const lines = rawText.split('\n');

    return (
      <span key={keyPrefix}>
        {lines.map((line, lIdx) => {
          let lineContent: React.ReactNode = line;

          // Header 3: ###
          if (line.startsWith('### ')) {
            return (
              <h4 key={`${keyPrefix}-h3-${lIdx}`} className="text-xs font-bold text-slate-900 mt-2.5 mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
                <span>{line.replace('### ', '')}</span>
              </h4>
            );
          }

          // Header 2: ##
          if (line.startsWith('## ')) {
            return (
              <h3 key={`${keyPrefix}-h2-${lIdx}`} className="text-sm font-bold text-slate-900 mt-3 mb-1.5">
                {line.replace('## ', '')}
              </h3>
            );
          }

          // Bullet point: - or *
          if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            const bulletText = line.trim().replace(/^[-*]\s+/, '');
            return (
              <div key={`${keyPrefix}-li-${lIdx}`} className="flex items-start gap-1.5 my-1 pl-1 text-slate-800">
                <span className="text-blue-600 font-bold text-[10px] mt-0.5">•</span>
                <span>{formatInlineMarkdown(bulletText, `${keyPrefix}-li-b-${lIdx}`)}</span>
              </div>
            );
          }

          // Numbered list: 1. 2. etc
          const numMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
          if (numMatch) {
            return (
              <div key={`${keyPrefix}-num-${lIdx}`} className="flex items-start gap-1.5 my-1 pl-1 text-slate-800">
                <span className="text-blue-600 font-bold text-[11px] min-w-[16px]">{numMatch[1]}.</span>
                <span>{formatInlineMarkdown(numMatch[2], `${keyPrefix}-num-b-${lIdx}`)}</span>
              </div>
            );
          }

          // Bold & Italic inline formatting for standard text line
          lineContent = formatInlineMarkdown(line, `${keyPrefix}-line-${lIdx}`);

          return (
            <React.Fragment key={`${keyPrefix}-frag-${lIdx}`}>
              {lineContent}
              {lIdx < lines.length - 1 && <br />}
            </React.Fragment>
          );
        })}
      </span>
    );
  };

  // Helper for bold **text**, code `text`, and italic *text*
  const formatInlineMarkdown = (text: string, prefix: string): React.ReactNode => {
    // Split by code `...` and bold **...**
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

    return parts.map((part, pIdx) => {
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code key={`${prefix}-c-${pIdx}`} className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-mono text-slate-800">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={`${prefix}-b-${pIdx}`} className="font-semibold text-slate-950">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <em key={`${prefix}-i-${pIdx}`} className="italic text-slate-800">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  // Top-level block math parser: matches $$...$$ OR \[...\]
  const blockRegex = /(\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\])/g;
  const topParts: React.ReactNode[] = [];
  let lastTopIndex = 0;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockRegex.exec(content)) !== null) {
    if (blockMatch.index > lastTopIndex) {
      const textChunk = content.slice(lastTopIndex, blockMatch.index);
      topParts.push(
        ...processInlineMathAndFormatting(textChunk, `top-chunk-${lastTopIndex}`)
      );
    }

    // Group 2 is $$...$$, Group 3 is \[...\]
    const blockMathStr = blockMatch[2] !== undefined ? blockMatch[2] : blockMatch[3];
    topParts.push(renderBlockMath(blockMathStr, `top-block-${blockMatch.index}`));
    lastTopIndex = blockRegex.lastIndex;
  }

  if (lastTopIndex < content.length) {
    topParts.push(
      ...processInlineMathAndFormatting(content.slice(lastTopIndex), 'top-chunk-end')
    );
  }

  return (
    <div className={`text-xs leading-relaxed space-y-1 ${className}`}>
      {topParts}
    </div>
  );
};
