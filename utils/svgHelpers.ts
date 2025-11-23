import { Stroke, FontMap, CHAR_SET, Point } from '../types';
import opentype from 'opentype.js';
import JSZip from 'jszip';

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
// Supports thickness (for Bold) and slant (for Italic)
const createOutlineFromStroke = (stroke: Stroke, scale: number, ascender: number, thickness: number, slant: number): opentype.Path => {
    const path = new opentype.Path();
    const points = stroke.points;
    
    if (points.length === 0) return path;

    // Helper to transform coordinates (Scale + Slant + Flip Y for OTF)
    // Slant formula: x_new = x + y * slant (where y is relative to baseline?)
    // Here input Y is canvas coords (0 at top).
    // We convert to OTF coords: y_otf = ascender - y_canvas * scale.
    // Then we slant based on y_otf.
    const transform = (pt: Point, offX: number, offY: number) => {
        const x_scaled = pt.x * scale;
        const y_scaled = pt.y * scale; // This is distance from top
        
        // Add offset perpendicular to stroke angle
        const x_offset = x_scaled + offX;
        const y_offset = y_scaled - offY; // Subtract Y offset because canvas Y is inverted relative to math angle
        
        const y_otf = ascender - y_offset;
        const x_final = x_offset + (y_otf * slant);
        
        return { x: x_final, y: y_otf };
    };
    
    // --- HANDLE DOTS ---
    if (points.length === 1 || (points.length === 2 && Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) < 2)) {
        const p = points[0];
        const r = thickness * scale; 
        
        // Simplified dot (diamond/circle approx)
        const c = transform(p, 0, 0);
        
        path.moveTo(c.x, c.y - r);
        path.lineTo(c.x + r, c.y);
        path.lineTo(c.x, c.y + r);
        path.lineTo(c.x - r, c.y);
        path.close();
        return path;
    }

    // --- HANDLE STROKES ---
    const leftSide: {x: number, y: number}[] = [];
    const rightSide: {x: number, y: number}[] = [];
    const halfWidth = (thickness * scale) / 2;

    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const angle = getAngle(p1, p2);
        const offsetX = halfWidth * Math.sin(angle);
        const offsetY = halfWidth * Math.cos(angle);

        leftSide.push(transform(p1, offsetX, offsetY));
        rightSide.push(transform(p1, -offsetX, -offsetY));
        
        if (i === points.length - 2) {
             leftSide.push(transform(p2, offsetX, offsetY));
             rightSide.push(transform(p2, -offsetX, -offsetY));
        }
    }

    const startL = leftSide[0];
    path.moveTo(startL.x, startL.y);

    for (let i = 1; i < leftSide.length; i++) {
        path.lineTo(leftSide[i].x, leftSide[i].y);
    }

    for (let i = rightSide.length - 1; i >= 0; i--) {
        path.lineTo(rightSide[i].x, rightSide[i].y);
    }

    path.close();
    return path;
};

interface FontOptions {
    thickness?: number;
    slant?: number; // 0 for regular, ~0.2-0.3 for italic
    styleName?: string;
}

export const generateFont = (fontName: string, fontMap: FontMap, letterSpacing: number, options: FontOptions = {}): ArrayBuffer => {
    const unitsPerEm = 1000;
    const ascender = 800;
    const descender = -200;
    const { thickness = 12, slant = 0, styleName = 'Regular' } = options;

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
            // Note: Vertical centering is assumed to be done by App before passing here.
            const alignedStrokes = alignStrokes(smoothedStrokes, data.canvasWidth);

            const scale = unitsPerEm / data.canvasHeight;
            const glyphPath = new opentype.Path();

            // 3. Convert to Outlines with Thickness and Slant
            alignedStrokes.forEach(stroke => {
                const outline = createOutlineFromStroke(stroke, scale, ascender, thickness, slant);
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
        styleName: styleName,
        unitsPerEm,
        ascender,
        descender,
        glyphs,
        outlinesFormat: 'truetype' // Ensure it is explicitly marked as TrueType
    });

    return font.toArrayBuffer();
};

export const generateFontFamilyZip = async (fontName: string, fontMap: FontMap, letterSpacing: number): Promise<Blob> => {
    const zip = new JSZip();
    const folder = zip.folder(fontName) || zip;

    // 1. Regular
    const regularBuffer = generateFont(fontName, fontMap, letterSpacing, {
        thickness: 12,
        slant: 0,
        styleName: 'Regular'
    });
    folder.file(`${fontName}-Regular.ttf`, regularBuffer);

    // 2. Bold (Thicker strokes)
    const boldBuffer = generateFont(fontName, fontMap, letterSpacing, {
        thickness: 24, // Double thickness
        slant: 0,
        styleName: 'Bold'
    });
    folder.file(`${fontName}-Bold.ttf`, boldBuffer);

    // 3. Italic (Slanted)
    const italicBuffer = generateFont(fontName, fontMap, letterSpacing, {
        thickness: 12,
        slant: 0.25, // ~14 degree skew
        styleName: 'Italic'
    });
    folder.file(`${fontName}-Italic.ttf`, italicBuffer);

    return await zip.generateAsync({ type: 'blob' });
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