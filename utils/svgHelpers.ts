import { Stroke, FontMap, CHAR_SET, Point } from '../types';
import opentype from 'opentype.js';
import JSZip from 'jszip';

// Helper to access Paper.js from global scope
declare const paper: any;

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
export const centerStrokes = (inputStrokes: Stroke[], width: number, height: number, char?: string): Stroke[] => {
    if (inputStrokes.length === 0) return inputStrokes;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    inputStrokes.forEach(s => s.points.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }));

    if (minX === Infinity) return inputStrokes;

    const contentCenterX = minX + (maxX - minX) / 2;
    const contentCenterY = minY + (maxY - minY) / 2;

    const targetCenterX = width / 2;
    let targetCenterY = height / 2;

    if (char && DESCENDERS.includes(char)) {
        targetCenterY = height * 0.62;
    }

    const offsetX = targetCenterX - contentCenterX;
    const offsetY = targetCenterY - contentCenterY;

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
    
    if (stroke.points.length === 1) {
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

const EM_HEIGHT = 1000;
const BASELINE = 800;
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
        let target = 700; 
        
        if (CAPS_CHARS.includes(char)) target = CAP_HEIGHT;
        else if (SMALL_CHARS.includes(char)) target = X_HEIGHT;
        else if (TALL_CHARS.includes(char)) target = ASCENDER_HEIGHT;
        else if (DESC_CHARS.includes(char)) target = CAP_HEIGHT;

        sum += (target / h);
        count++;
    });

    return count > 0 ? sum / count : (EM_HEIGHT / 300);
};

export const normalizeStrokes = (strokes: Stroke[], char: string, avgScale: number): NormalizedGlyph => {
    if (strokes.length === 0) return { strokes: [], advanceWidth: 0, height: EM_HEIGHT };

    const smoothed = smoothStrokes(strokes);

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

    let scale = 1;
    let targetY = 0; 
    
    if (CAPS_CHARS.includes(char)) {
        scale = CAP_HEIGHT / rawH;
        targetY = BASELINE - (rawH * scale); 
    } else if (SMALL_CHARS.includes(char)) {
        scale = X_HEIGHT / rawH;
        targetY = BASELINE - (rawH * scale);
    } else if (TALL_CHARS.includes(char)) {
        scale = ASCENDER_HEIGHT / rawH;
        targetY = BASELINE - (rawH * scale);
    } else if (DESC_CHARS.includes(char)) {
        scale = CAP_HEIGHT / rawH;
        targetY = (BASELINE - X_HEIGHT);
    } else if (char === ',') {
        scale = avgScale;
        targetY = BASELINE;
    } else if (char === '.') {
        scale = avgScale;
        targetY = BASELINE - (rawH * scale);
    } else {
        scale = avgScale;
        targetY = BASELINE - (rawH * scale);
    }

    const offsetY = targetY - (minY * scale);
    const LSB = 50; 
    const offsetX = LSB - (minX * scale);

    const newStrokes = smoothed.map(s => ({
        points: s.points.map(p => ({
            x: (p.x * scale) + offsetX,
            y: (p.y * scale) + offsetY
        }))
    }));

    const RSB = 50;
    const advanceWidth = (rawW * scale) + LSB + RSB;

    return {
        strokes: newStrokes,
        advanceWidth,
        height: EM_HEIGHT
    };
};

// --- FONT GENERATION HELPERS ---

const getAngle = (p1: Point, p2: Point) => Math.atan2(p2.y - p1.y, p2.x - p1.x);

// Generates the points for the outline of a stroke (without creating an opentype Path yet).
// This allows us to feed the geometry into Paper.js for boolean union.
const getStrokeOutlinePoints = (stroke: Stroke, scale: number, ascender: number, thickness: number, slant: number, dx: number = 0, dy: number = 0): {x: number, y: number}[] => {
    const points = stroke.points;
    if (points.length === 0) return [];

    const transform = (pt: Point, offX: number, offY: number) => {
        const x_scaled = pt.x * scale;
        const y_scaled = pt.y * scale; 
        
        const x_local = x_scaled + offX;
        const y_local = y_scaled - offY;
        
        const y_otf = ascender - y_local + dy;
        const x_final = x_local + (y_otf * slant) + dx;
        
        return { x: x_final, y: y_otf };
    };
    
    // Dot Case
    if (points.length === 1 || (points.length === 2 && Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) < 2)) {
        const p = points[0];
        const r = thickness * scale * 0.8; 
        const c = transform(p, 0, 0);
        return [
            { x: c.x, y: c.y - r },
            { x: c.x + r, y: c.y },
            { x: c.x, y: c.y + r },
            { x: c.x - r, y: c.y }
        ];
    }

    // Stroke Case
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

    // Combine left (forward) and right (backward) to form loop
    const outlinePoints = [...leftSide];
    for (let i = rightSide.length - 1; i >= 0; i--) {
        outlinePoints.push(rightSide[i]);
    }

    return outlinePoints;
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

    // Initialize Paper.js Scope for Boolean Operations
    const scope = new paper.PaperScope();
    scope.setup(new paper.Size(1000, 1000));

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

    const avgScale = calculateAvgScale(fontMap);

    // Generate Glyphs
    CHAR_SET.forEach(char => {
        const data = fontMap[char];
        if (!data || data.strokes.length === 0) return;

        const { strokes: normalizedStrokes, advanceWidth } = normalizeStrokes(data.strokes, char, avgScale);

        // Perform Boolean Union of all stroke outlines to prevent self-intersection artifacts
        let unifiedPath: any = null;

        normalizedStrokes.forEach(stroke => {
            const outlinePoints = getStrokeOutlinePoints(stroke, 1, ascender, thickness, slant, 0, 0);
            if (outlinePoints.length === 0) return;

            // Create Paper.js Path from points
            const p = new scope.Path(outlinePoints.map(pt => new scope.Point(pt.x, pt.y)));
            p.closed = true;
            
            // Unite with existing geometry
            if (!unifiedPath) {
                unifiedPath = p;
            } else {
                const result = unifiedPath.unite(p);
                unifiedPath.remove(); // Remove old paths from project
                p.remove();
                unifiedPath = result;
            }
        });

        // Convert Paper.js Path back to Opentype Path
        const glyphPath = new opentype.Path();

        if (unifiedPath) {
            // unifiedPath can be a Path or CompoundPath
            const paths = unifiedPath.className === 'CompoundPath' ? unifiedPath.children : [unifiedPath];

            paths.forEach((p: any) => {
                const segments = p.segments;
                if (!segments || segments.length === 0) return;

                // Paper.js winding is typically CCW for solid shapes, while TrueType expects CW.
                // We verify area or just reverse to ensure CW for outer shells if needed.
                // Usually simply reversing Paper's output works well for TTF export.
                const isCCW = p.area > 0; // Check orientation if necessary, but reversing is safe for standard TTF tools
                
                // Start Loop
                const start = segments[0].point;
                glyphPath.moveTo(start.x, start.y);

                // For simple polygonal outlines (which we have), just iterating points is enough.
                // We reverse the loop iteration to flip winding from CCW to CW
                if (isCCW) {
                     for (let i = segments.length - 1; i >= 0; i--) {
                         const pt = segments[i].point;
                         if (i === segments.length - 1) {
                             glyphPath.moveTo(pt.x, pt.y);
                         } else {
                             glyphPath.lineTo(pt.x, pt.y);
                         }
                     }
                } else {
                     for (let i = 1; i < segments.length; i++) {
                        const pt = segments[i].point;
                        glyphPath.lineTo(pt.x, pt.y);
                     }
                }
                glyphPath.close();
            });
            unifiedPath.remove();
        }

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

    // 2. Bold
    const boldBuffer = generateFont(fontName, fontMap, letterSpacing, {
        thickness: 90,
        slant: 0,
        styleName: 'Bold'
    });
    folder.file(`${fontName}-Bold.ttf`, boldBuffer);

    // 3. Italic
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