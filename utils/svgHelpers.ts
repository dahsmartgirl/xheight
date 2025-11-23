import { Stroke, FontMap, CHAR_SET, Point } from '../types';
import opentype from 'opentype.js';

// --- STROKE PROCESSING HELPERS ---

// Smooths points using a simple moving average algorithm to reduce jitter
export const smoothStrokes = (strokes: Stroke[]): Stroke[] => {
  return strokes.map(stroke => {
    const points = stroke.points;
    if (points.length < 3) return stroke;

    const newPoints: Point[] = [points[0]];
    
    // Apply 3-point moving average
    for (let i = 1; i < points.length - 1; i++) {
        const p0 = points[i-1];
        const p1 = points[i];
        const p2 = points[i+1];
        
        newPoints.push({
            x: (p0.x + p1.x + p2.x) / 3,
            y: (p0.y + p1.y + p2.y) / 3
        });
    }
    newPoints.push(points[points.length-1]);
    
    return { ...stroke, points: newPoints };
  });
};

const DESCENDERS = ['g', 'j', 'p', 'q', 'y'];

// Centers strokes both horizontally and vertically in the canvas
// If 'char' is provided and is a descender, it applies a lower center point
export const centerStrokes = (inputStrokes: Stroke[], width: number, height: number, char?: string): Stroke[] => {
    if (inputStrokes.length === 0) return inputStrokes;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    inputStrokes.forEach(s => s.points.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }));

    // Safety check
    if (minX === Infinity) return inputStrokes;

    const contentCenterX = minX + (maxX - minX) / 2;
    const contentCenterY = minY + (maxY - minY) / 2;

    const targetCenterX = width / 2;
    
    // Default vertical center is the middle of the canvas
    let targetCenterY = height / 2;

    // Smart Descender Logic
    if (char && DESCENDERS.includes(char)) {
        // Shift the center target down by ~12% of height
        // This keeps the "body" of the letter closer to the baseline 
        // while allowing the tail to extend down.
        targetCenterY = height * 0.62;
    }

    const offsetX = targetCenterX - contentCenterX;
    const offsetY = targetCenterY - contentCenterY;

    // Don't shift if it's already very close (prevents micro-jitters)
    if (Math.abs(offsetX) < 1 && Math.abs(offsetY) < 1) return inputStrokes;

    return inputStrokes.map(s => ({
        ...s,
        points: s.points.map(p => ({
            x: p.x + offsetX,
            y: p.y + offsetY
        }))
    }));
};

// Aligns strokes horizontally to the center of the canvas (used in generation/preview)
export const alignStrokes = (strokes: Stroke[], canvasWidth: number): Stroke[] => {
    if (strokes.length === 0) return strokes;

    let minX = Infinity;
    let maxX = -Infinity;

    strokes.forEach(s => s.points.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
    }));

    if (minX === Infinity) return strokes;

    const glyphWidth = maxX - minX;
    const currentCenterX = minX + glyphWidth / 2;
    const targetCenterX = canvasWidth / 2;
    const offsetX = targetCenterX - currentCenterX;

    return strokes.map(s => ({
        ...s,
        points: s.points.map(p => ({
            ...p,
            x: p.x + offsetX,
            y: p.y 
        }))
    }));
};

// --- SVG HELPERS ---

export const strokesToPath = (strokes: Stroke[], scale = 1, offsetX = 0, offsetY = 0): string => {
  if (strokes.length === 0) return '';

  return strokes.map(stroke => {
    if (stroke.points.length === 0) return '';
    
    // Handle single dot (tap)
    if (stroke.points.length === 1) {
       // Render as a zero-length line with round caps, effectively a dot
       const p = stroke.points[0];
       const x = (p.x * scale) + offsetX;
       const y = (p.y * scale) + offsetY;
       return `M ${x} ${y} L ${x} ${y}`;
    }

    const start = stroke.points[0];
    let path = `M ${(start.x * scale) + offsetX} ${(start.y * scale) + offsetY}`;
    
    for (let i = 1; i < stroke.points.length; i++) {
      const p = stroke.points[i];
      path += ` L ${(p.x * scale) + offsetX} ${(p.y * scale) + offsetY}`;
    }
    return path;
  }).join(' ');
};

// --- FONT GENERATION HELPERS ---

// Helper to get angle between points
const getAngle = (p1: Point, p2: Point) => Math.atan2(p2.y - p1.y, p2.x - p1.x);

// Generate a closed path outline from a single line stroke
const createOutlineFromStroke = (stroke: Stroke, scale: number, ascender: number, thickness: number): opentype.Path => {
    const path = new opentype.Path();
    const points = stroke.points;
    
    if (points.length === 0) return path;

    // --- HANDLE DOTS ---
    if (points.length === 1 || (points.length === 2 && Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) < 2)) {
        const p = points[0];
        const cx = p.x * scale;
        const cy = ascender - (p.y * scale);
        const r = thickness * scale; 
        
        path.moveTo(cx, cy - r);
        path.lineTo(cx + r, cy);
        path.lineTo(cx, cy + r);
        path.lineTo(cx - r, cy);
        path.close();
        return path;
    }

    // --- HANDLE STROKES ---
    const leftSide: Point[] = [];
    const rightSide: Point[] = [];
    const halfWidth = (thickness * scale) / 2;

    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const angle = getAngle(p1, p2);
        const offsetX = halfWidth * Math.sin(angle);
        const offsetY = halfWidth * Math.cos(angle);

        leftSide.push({ x: p1.x + offsetX, y: p1.y - offsetY });
        rightSide.push({ x: p1.x - offsetX, y: p1.y + offsetY });
        
        if (i === points.length - 2) {
             leftSide.push({ x: p2.x + offsetX, y: p2.y - offsetY });
             rightSide.push({ x: p2.x - offsetX, y: p2.y + offsetY });
        }
    }

    const startL = leftSide[0];
    path.moveTo(startL.x * scale, ascender - (startL.y * scale));

    for (let i = 1; i < leftSide.length; i++) {
        const p = leftSide[i];
        path.lineTo(p.x * scale, ascender - (p.y * scale));
    }

    for (let i = rightSide.length - 1; i >= 0; i--) {
        const p = rightSide[i];
        path.lineTo(p.x * scale, ascender - (p.y * scale));
    }

    path.close();
    return path;
};

export const generateFont = (fontName: string, fontMap: FontMap, letterSpacing: number): ArrayBuffer => {
    const unitsPerEm = 1000;
    const ascender = 800;
    const descender = -200;
    const strokeThickness = 12;

    const glyphs: opentype.Glyph[] = [];

    // .notdef glyph
    const notdefPath = new opentype.Path();
    notdefPath.moveTo(200, 0);
    notdefPath.lineTo(200, 700);
    notdefPath.lineTo(400, 700);
    notdefPath.lineTo(400, 0);
    notdefPath.close();
    
    glyphs.push(new opentype.Glyph({
        name: '.notdef',
        unicode: 0,
        advanceWidth: 600,
        path: notdefPath
    }));

    CHAR_SET.forEach(char => {
        const data = fontMap[char];
        if (data && data.strokes.length > 0) {
            
            // 1. Smooth the strokes
            const smoothedStrokes = smoothStrokes(data.strokes);

            // 2. Align (Center) the strokes horizontally
            // Since we rely on the App to center them on navigation, the raw data might already be centered.
            // But doing it again here ensures consistency for export.
            const alignedStrokes = alignStrokes(smoothedStrokes, data.canvasWidth);

            const scale = unitsPerEm / data.canvasHeight;
            const glyphPath = new opentype.Path();

            // 3. Convert to Outlines
            alignedStrokes.forEach(stroke => {
                const outline = createOutlineFromStroke(stroke, scale, ascender, strokeThickness);
                glyphPath.extend(outline);
            });

            const baseWidth = (data.canvasWidth * scale) * 0.75; 
            const finalWidth = Math.max(baseWidth, 200) + (letterSpacing * 10);

            glyphs.push(new opentype.Glyph({
                name: char,
                unicode: char.codePointAt(0) || 0,
                advanceWidth: finalWidth, 
                path: glyphPath
            }));
        } else {
            glyphs.push(new opentype.Glyph({
                name: char,
                unicode: char.codePointAt(0) || 0,
                advanceWidth: 300,
                path: new opentype.Path()
            }));
        }
    });

    if (!glyphs.find(g => g.unicode === 32)) {
        glyphs.push(new opentype.Glyph({
            name: 'space',
            unicode: 32,
            advanceWidth: 300 + (letterSpacing * 10),
            path: new opentype.Path()
        }));
    }

    const font = new opentype.Font({
        familyName: fontName,
        styleName: 'Regular',
        unitsPerEm,
        ascender,
        descender,
        glyphs
    });

    return font.toArrayBuffer();
};

export const downloadFile = (content: ArrayBuffer | string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};