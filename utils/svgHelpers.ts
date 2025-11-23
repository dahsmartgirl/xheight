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

const DESCENDERS = ['g', 'j', 'p', 'q', 'y', ',', 'f'];

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
        // Shift the center target down
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

// Aligns strokes horizontally to the center of the canvas (used in preview)
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
const createOutlineFromStroke = (stroke: Stroke, scale: number, ascender: number, thickness: number, slant: number, dx: number = 0, dy: number = 0): opentype.Path => {
    const path = new opentype.Path();
    const points = stroke.points;
    
    if (points.length === 0) return path;

    // Helper to transform coordinates (Scale + Slant + Flip Y for OTF)
    const transform = (pt: Point, offX: number, offY: number) => {
        const x_scaled = pt.x * scale;
        const y_scaled = pt.y * scale; // This is distance from top
        
        // Add offset perpendicular to stroke angle
        const x_local = x_scaled + offX;
        const y_local = y_scaled - offY;
        
        // Convert to font coordinates (Flip Y)
        const y_otf = ascender - y_local + dy;
        
        // Apply slant (Italic)
        // x_final = x + (y * slant)
        const x_final = x_local + (y_otf * slant) + dx;
        
        return { x: x_final, y: y_otf };
    };
    
    // --- HANDLE DOTS ---
    if (points.length === 1 || (points.length === 2 && Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) < 2)) {
        const p = points[0];
        const r = thickness * scale * 0.8; 
        
        const c = transform(p, 0, 0);
        
        // Diamond shape for dots avoids curve complexity and often looks better for handwriting
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

    // Trace the outline
    const startL = leftSide[0];
    path.moveTo(startL.x, startL.y);

    for (let i = 1; i < leftSide.length; i++) {
        path.lineTo(leftSide[i].x, leftSide[i].y);
    }
    
    // Cap round
    // path.quadraticCurveTo(...) - Keeping it straight for robustness against overlaps

    for (let i = rightSide.length - 1; i >= 0; i--) {
        path.lineTo(rightSide[i].x, rightSide[i].y);
    }

    path.close();
    return path;
};

interface FontOptions {
    thickness?: number;
    slant?: number;
    styleName?: string;
}

export const generateFont = (fontName: string, fontMap: FontMap, letterSpacing: number, options: FontOptions = {}): ArrayBuffer => {
    const unitsPerEm = 1000;
    const ascender = 800;
    const descender = -200;
    const { thickness = 12, slant = 0, styleName = 'Regular' } = options;

    const glyphs: opentype.Glyph[] = [];

    // .notdef glyph (Required for valid font)
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

    // Space Glyph (Critical for word spacing)
    glyphs.push(new opentype.Glyph({
        name: 'space',
        unicode: 32,
        advanceWidth: 400 + (letterSpacing * 10), // Generous space width
        path: new opentype.Path()
    }));

    CHAR_SET.forEach(char => {
        const data = fontMap[char];
        if (data && data.strokes.length > 0) {
            
            // 1. Smooth the strokes
            const smoothedStrokes = smoothStrokes(data.strokes);

            // 2. Metrics Calculation
            // Instead of using the full canvas width, we calculate the ACTUAL width of the drawing.
            // This fixes the "unnecessary spacing" and overlapping issues.
            
            // First, find the bounding box of the strokes in Canvas coordinates
            let minX = Infinity, maxX = -Infinity;
            smoothedStrokes.forEach(s => s.points.forEach(p => {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
            }));

            // Scale factor to convert canvas pixels to font units
            const scale = unitsPerEm / data.canvasHeight;
            
            // Font Units Bounding Box
            const fMinX = minX * scale;
            const fMaxX = maxX * scale;
            const fWidth = fMaxX - fMinX;

            // Side Bearings (Padding around the letter)
            const leftSideBearing = 50; 
            const rightSideBearing = 50 + (letterSpacing * 10);

            // Calculate shift needed to place the glyph at leftSideBearing
            // We want the leftmost point (fMinX) to move to (leftSideBearing)
            // So shift = leftSideBearing - fMinX
            // However, createOutlineFromStroke does its own transforms. 
            // We need to pass a dx that applies in Font Units.
            
            // Logic: The transform function takes `pt.x * scale`. 
            // We want `(pt.x * scale) + dx` to equal `leftSideBearing` when `pt.x` is `minX`.
            const dx = leftSideBearing - fMinX;

            const glyphPath = new opentype.Path();

            // 3. Convert to Outlines
            smoothedStrokes.forEach(stroke => {
                // We pass dy=0 because vertical centering is already handled by 'centerStrokes' in the app
                const outline = createOutlineFromStroke(stroke, scale, ascender, thickness, slant, dx, 0);
                glyphPath.extend(outline);
            });

            // 4. Calculate Advance Width
            // Width = LSB + Glyph Width + RSB
            const advanceWidth = Math.round(leftSideBearing + fWidth + rightSideBearing);

            glyphs.push(new opentype.Glyph({
                name: char,
                unicode: char.codePointAt(0) || 0,
                advanceWidth: advanceWidth, 
                path: glyphPath
            }));
        }
    });

    const font = new opentype.Font({
        familyName: fontName,
        styleName: styleName,
        unitsPerEm,
        ascender,
        descender,
        glyphs,
        outlinesFormat: 'truetype'
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
        thickness: 28, // Beefier bold
        slant: 0,
        styleName: 'Bold'
    });
    folder.file(`${fontName}-Bold.ttf`, boldBuffer);

    // 3. Italic (Slanted)
    const italicBuffer = generateFont(fontName, fontMap, letterSpacing, {
        thickness: 12,
        slant: 0.25, 
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