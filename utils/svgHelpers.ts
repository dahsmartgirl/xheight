import { Stroke, FontMap, CHAR_SET, Point } from '../types';
import opentype from 'opentype.js';
import JSZip from 'jszip';

// Helper to access Paper.js from global scope
declare const paper: any;

// --- STROKE PROCESSING HELPERS ---

// Smooths points using a simple moving average algorithm to reduce jitter
// Also simplifies points that are too close to each other to reduce complexity
export const smoothStrokes = (strokes: Stroke[]): Stroke[] => {
  return strokes.map(stroke => {
    const points = stroke.points;
    if (points.length < 3) return stroke;

    // 1. Moving Average Smoothing
    const smoothedPoints: Point[] = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
        const p0 = points[i-1];
        const p1 = points[i];
        const p2 = points[i+1];
        
        smoothedPoints.push({
            x: (p0.x + p1.x + p2.x) / 3,
            y: (p0.y + p1.y + p2.y) / 3
        });
    }
    smoothedPoints.push(points[points.length-1]);

    // 2. Simplification (Distance Filter)
    // Filter out points that are closer than 2 units to the previous point
    // This drastically reduces boolean operation overhead for slow/dense strokes
    const simplifiedPoints: Point[] = [smoothedPoints[0]];
    for (let i = 1; i < smoothedPoints.length; i++) {
        const last = simplifiedPoints[simplifiedPoints.length - 1];
        const current = smoothedPoints[i];
        const distSq = Math.pow(current.x - last.x, 2) + Math.pow(current.y - last.y, 2);
        
        // Keep point if distance > 2px or it's the very last point
        if (distSq > 4 || i === smoothedPoints.length - 1) {
            simplifiedPoints.push(current);
        }
    }
    
    return { ...stroke, points: simplifiedPoints };
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

interface FontOptions {
    thickness?: number;
    slant?: number;
    styleName?: string;
}

// Helper to perform Divide and Conquer Boolean Union
// This drastically improves performance from O(N^2) to O(N log N)
const recursiveUnite = (shapes: any[]): any => {
    if (shapes.length === 0) return null;
    if (shapes.length === 1) return shapes[0];

    const mid = Math.floor(shapes.length / 2);
    const left = recursiveUnite(shapes.slice(0, mid));
    const right = recursiveUnite(shapes.slice(mid));

    if (left && right) {
        // insert: false prevents adding to the scene graph unnecessarily
        const result = left.unite(right, { insert: false });
        left.remove();
        right.remove();
        return result;
    }
    return left || right;
};

// Robustly constructs the shape of a stroke using Path.expand
// This is significantly faster and more stable for bold fonts than manual construction
const createStrokeShape = (stroke: Stroke, thickness: number, scope: any): any => {
    const points = stroke.points;
    if (points.length === 0) return null;

    // Handle single point (dot)
    if (points.length === 1) {
         return new scope.Path.Circle({
            center: new scope.Point(points[0].x, points[0].y),
            radius: thickness / 2,
            insert: false
        });
    }

    // Create a path from the stroke points
    const path = new scope.Path({
        segments: points.map(p => [p.x, p.y]),
        strokeColor: 'black',
        strokeWidth: thickness,
        strokeCap: 'round',
        strokeJoin: 'round',
        insert: false
    });

    try {
        // Expand the path to get the outline geometry
        // This handles self-intersections and thick strokes much better than boolean unions
        const expanded = path.expand({
            stroke: true,
            insert: false
        });
        
        path.remove(); // Clean up original path

        // If expansion returns a Group (e.g. for certain complex topologies),
        // we flatten it by uniting its children into a single item.
        if (expanded.className === 'Group') {
             const children = expanded.removeChildren();
             if (children.length === 0) return null;
             
             // recursiveUnite consumes items (removes them from parents usually),
             // which is what we want for these temp items
             const united = recursiveUnite(children);
             expanded.remove();
             return united;
        }

        return expanded;
    } catch (e) {
        console.warn("Path expansion failed, falling back to simple path", e);
        return null;
    }
};

export const generateFont = (fontName: string, fontMap: FontMap, letterSpacing: number, options: FontOptions = {}): ArrayBuffer => {
    const unitsPerEm = 1000;
    const ascender = 800;
    const descender = -200;
    const { thickness = 50, slant = 0, styleName = 'Regular' } = options;

    // Initialize Paper.js Scope
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

        // Collect all stroke shapes
        const strokeShapes: any[] = [];

        normalizedStrokes.forEach(stroke => {
            const shape = createStrokeShape(stroke, thickness, scope);
            if (shape) strokeShapes.push(shape);
        });

        // Unite all strokes into one glyph
        const glyphUnion = recursiveUnite(strokeShapes);

        // 2. Convert the clean unified shape to Opentype Path
        const glyphPath = new opentype.Path();

        if (glyphUnion) {
            // Handle CompoundPaths (multiple disconnected islands) or simple Paths
            // For boolean results, Paper often returns a CompoundPath even for simple shapes
            let paths: any[] = [];
            
            if (glyphUnion.className === 'CompoundPath') {
                paths = glyphUnion.children;
            } else {
                paths = [glyphUnion];
            }

            paths.forEach((p: any) => {
                const segments = p.segments;
                if (!segments || segments.length === 0) return;

                // Transform to Font Coordinate System
                const transform = (px: number, py: number) => {
                    const y_font = ascender - py;
                    const x_font = px + (y_font * slant);
                    return { x: x_font, y: y_font };
                };

                const startPt = segments[0].point;
                const start = transform(startPt.x, startPt.y);
                glyphPath.moveTo(start.x, start.y);

                // Reconstruct path with curves if handled by paper (unite returns bezier curves)
                for (let i = 1; i < segments.length; i++) {
                    const segment = segments[i];
                    const pt = segment.point;
                    const handleIn = segment.handleIn;
                    
                    // Previous segment's handleOut
                    const prevSegment = segments[i-1];
                    const handleOut = prevSegment.handleOut;

                    const tPt = transform(pt.x, pt.y);

                    // Check if it's a straight line or curve
                    if ((!handleOut || handleOut.isZero()) && (!handleIn || handleIn.isZero())) {
                        glyphPath.lineTo(tPt.x, tPt.y);
                    } else {
                        // Cubic Bezier
                        const p1 = prevSegment.point;
                        const c1 = { x: p1.x + handleOut.x, y: p1.y + handleOut.y };
                        const c2 = { x: pt.x + handleIn.x, y: pt.y + handleIn.y };
                        
                        const tC1 = transform(c1.x, c1.y);
                        const tC2 = transform(c2.x, c2.y);
                        
                        glyphPath.bezierCurveTo(tC1.x, tC1.y, tC2.x, tC2.y, tPt.x, tPt.y);
                    }
                }
                
                // Close the loop back to start
                const firstSegment = segments[0];
                const lastSegment = segments[segments.length - 1];
                const handleOut = lastSegment.handleOut;
                const handleIn = firstSegment.handleIn;
                
                if ((!handleOut || handleOut.isZero()) && (!handleIn || handleIn.isZero())) {
                    glyphPath.close();
                } else {
                     const p1 = lastSegment.point;
                     const c1 = { x: p1.x + handleOut.x, y: p1.y + handleOut.y };
                     const c2 = { x: firstSegment.point.x + handleIn.x, y: firstSegment.point.y + handleIn.y };
                     const tC1 = transform(c1.x, c1.y);
                     const tC2 = transform(c2.x, c2.y);
                     const tEnd = transform(firstSegment.point.x, firstSegment.point.y);
                     glyphPath.bezierCurveTo(tC1.x, tC1.y, tC2.x, tC2.y, tEnd.x, tEnd.y);
                }
            });
            glyphUnion.remove();
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