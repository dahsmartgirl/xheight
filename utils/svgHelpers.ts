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

// --- NORMALIZATION HELPERS ---

export const CAPS_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?";
export const SMALL_CHARS = "acemnorsuvwxz";
export const TALL_CHARS = "bdfhiklt";
export const DESC_CHARS = "gjpqy";

// Metric Constants for 1000-unit Em Square
const EM_HEIGHT = 1000;
const BASELINE = 800;
// Increased dimensions for "Large" look
const CAP_HEIGHT = 750; 
const X_HEIGHT = 550;
const ASCENDER_HEIGHT = 800;

export interface NormalizedGlyph {
    strokes: Stroke[];
    advanceWidth: number;
    height: number;
}

export const calculateAvgScale = (fontMap: FontMap): number => {
    let sum = 0;
    let count = 0;
    // Sample a subset of standard letters to determine how the user draws "letters"
    const sampleChars = [...CAPS_CHARS, ...SMALL_CHARS, ...TALL_CHARS, ...DESC_CHARS].filter(c => fontMap[c]);
    
    sampleChars.forEach(char => {
        const data = fontMap[char];
        if (!data || !data.strokes.length) return;
        
        let minY = Infinity, maxY = -Infinity;
        data.strokes.forEach(s => s.points.forEach(p => {
             if (p.y < minY) minY = p.y;
             if (p.y > maxY) maxY = p.y;
        }));
        
        if (minY === Infinity) return;
        
        const h = Math.max(maxY - minY, 1);
        let target = 700; // Default fallback
        
        if (CAPS_CHARS.includes(char)) target = CAP_HEIGHT;
        else if (SMALL_CHARS.includes(char)) target = X_HEIGHT;
        else if (TALL_CHARS.includes(char)) target = ASCENDER_HEIGHT;
        else if (DESC_CHARS.includes(char)) target = CAP_HEIGHT;

        sum += (target / h);
        count++;
    });

    // Default to a scale assuming 300px canvas -> 1000px em if no samples
    return count > 0 ? sum / count : (EM_HEIGHT / 300);
};

export const normalizeStrokes = (strokes: Stroke[], char: string, avgScale: number): NormalizedGlyph => {
    if (strokes.length === 0) return { strokes: [], advanceWidth: 0, height: EM_HEIGHT };

    const smoothed = smoothStrokes(strokes);

    // 1. Calculate BBox
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    smoothed.forEach(s => s.points.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }));

    if (minX === Infinity) return { strokes: smoothed, advanceWidth: 0, height: EM_HEIGHT };

    const rawH = Math.max(maxY - minY, 1);
    const rawW = maxX - minX;

    // 2. Determine Scale & Alignment
    let scale = 1;
    let targetY = 0; // Where the "reference point" of the glyph should land in 0-1000 space
    
    // Helper: We want to map the drawn glyph to the standardized coordinate system
    // SVG System: 0 is Top, 1000 is Bottom. Baseline is at 800.
    
    if (CAPS_CHARS.includes(char)) {
        scale = CAP_HEIGHT / rawH;
        // Align Bottom to Baseline
        targetY = BASELINE - (rawH * scale); 
    } else if (SMALL_CHARS.includes(char)) {
        scale = X_HEIGHT / rawH;
        // Align Bottom to Baseline
        targetY = BASELINE - (rawH * scale);
    } else if (TALL_CHARS.includes(char)) {
        scale = ASCENDER_HEIGHT / rawH;
        // Align Bottom to Baseline
        targetY = BASELINE - (rawH * scale);
    } else if (DESC_CHARS.includes(char)) {
        // For descenders, the "top" part usually aligns with x-height top
        // X-Height Top is at (BASELINE - X_HEIGHT) = 250
        // We assume the user drew the descender proportionally. 
        // We scale it so the "body" + "tail" roughly fits the visual weight.
        // Let's use avgScale for descenders to preserve their aspect ratio relative to other letters, 
        // OR scale them to a safe height. 
        // Scaling to CAP_HEIGHT usually works well for total height of descender chars.
        scale = CAP_HEIGHT / rawH;
        // Align Top to X-Height Top (approx)
        targetY = (BASELINE - X_HEIGHT);
    } else if (char === ',') {
        scale = avgScale;
        // Align top to baseline
        targetY = BASELINE - (100 * (scale/3)); // Slight offset upwards? 
        // Actually comma sits on baseline. Let's align top to baseline for simplicity?
        // No, comma usually hangs. Top at baseline.
        targetY = BASELINE;
    } else if (char === '.') {
        scale = avgScale;
        // Align bottom to baseline
        targetY = BASELINE - (rawH * scale);
    } else {
        // Other Punctuation / Unknown
        scale = avgScale;
        // Center vertically or align bottom?
        // Default to align bottom to baseline as safe bet
        targetY = BASELINE - (rawH * scale);
    }

    // 3. Apply Transform
    const offsetY = targetY - (minY * scale);
    
    // Left Side Bearing
    const LSB = 50; 
    const offsetX = LSB - (minX * scale);

    const newStrokes = smoothed.map(s => ({
        points: s.points.map(p => ({
            x: (p.x * scale) + offsetX,
            y: (p.y * scale) + offsetY
        }))
    }));

    // Right Side Bearing
    const RSB = 50;
    const advanceWidth = (rawW * scale) + LSB + RSB;

    return {
        strokes: newStrokes,
        advanceWidth,
        height: EM_HEIGHT
    };
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
        // scale is applied to the point values directly if they weren't pre-scaled.
        // In our new flow, we pass scale=1 because strokes are pre-normalized.
        
        const x_scaled = pt.x * scale;
        const y_scaled = pt.y * scale; // This is distance from top in SVG space
        
        // Add offset perpendicular to stroke angle
        const x_local = x_scaled + offX;
        const y_local = y_scaled - offY;
        
        // Convert to font coordinates (Flip Y)
        // ascender is 800.
        // If y_local is 800 (baseline), y_otf = 0.
        const y_otf = ascender - y_local + dy;
        
        // Apply slant (Italic)
        const x_final = x_local + (y_otf * slant) + dx;
        
        return { x: x_final, y: y_otf };
    };
    
    // --- HANDLE DOTS ---
    if (points.length === 1 || (points.length === 2 && Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) < 2)) {
        const p = points[0];
        const r = thickness * scale * 0.8; 
        
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

    // Trace the outline
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
    slant?: number;
    styleName?: string;
}

export const generateFont = (fontName: string, fontMap: FontMap, letterSpacing: number, options: FontOptions = {}): ArrayBuffer => {
    const unitsPerEm = 1000;
    const ascender = 800;
    const descender = -200;
    const { thickness = 50, slant = 0, styleName = 'Regular' } = options;

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

    // Space Glyph
    glyphs.push(new opentype.Glyph({
        name: 'space',
        unicode: 32,
        advanceWidth: 400 + (letterSpacing * 10), 
        path: new opentype.Path()
    }));

    // Calculate Average Scale for Punctuation consistency
    const avgScale = calculateAvgScale(fontMap);

    // Generate Glyphs
    CHAR_SET.forEach(char => {
        const data = fontMap[char];
        if (!data || data.strokes.length === 0) return;

        // Normalize the strokes (Snap to size)
        const { strokes: normalizedStrokes, advanceWidth } = normalizeStrokes(data.strokes, char, avgScale);

        // Convert normalized SVG strokes to Font Outlines
        // We pass scale=1 because strokes are already scaled.
        // We pass dy=0 because strokes are already positioned vertically relative to 800 baseline.
        // createOutlineFromStroke converts y (0..1000) to otf (800..-200) automatically.
        
        const glyphPath = new opentype.Path();

        normalizedStrokes.forEach(stroke => {
            const outline = createOutlineFromStroke(stroke, 1, ascender, thickness, slant, 0, 0);
            glyphPath.extend(outline);
        });

        // Add extra spacing from user setting
        const finalAdvance = Math.round(advanceWidth + (letterSpacing * 10));

        glyphs.push(new opentype.Glyph({
            name: char,
            unicode: char.codePointAt(0) || 0,
            advanceWidth: finalAdvance, 
            path: glyphPath
        }));
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
        thickness: 50,
        slant: 0,
        styleName: 'Regular'
    });
    folder.file(`${fontName}-Regular.ttf`, regularBuffer);

    // 2. Bold (Thicker strokes)
    const boldBuffer = generateFont(fontName, fontMap, letterSpacing, {
        thickness: 90, // Beefier bold
        slant: 0,
        styleName: 'Bold'
    });
    folder.file(`${fontName}-Bold.ttf`, boldBuffer);

    // 3. Italic (Slanted)
    const italicBuffer = generateFont(fontName, fontMap, letterSpacing, {
        thickness: 50,
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