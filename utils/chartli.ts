/**
 * Core rendering logic ported from the chartli package.
 * Allows using chartli-style terminal and SVG charts programmatically in React.
 */

export type ChartType = 'svg' | 'ascii' | 'unicode' | 'braille' | 'spark' | 'bars' | 'columns' | 'heatmap';

export interface ChartOptions {
    width?: number;
    height?: number;
    mode?: 'circles' | 'lines';
    titles?: string[];
}

const COLORS = [
    "#0072B2",
    "#F0E442",
    "#009E73",
    "#CC79A7",
    "#D55E00",
    "#fbbf24", // Royal Gold
    "#8b5cf6", // Royal Purple
    "#eeeeee"
];

function getColor(colIdx: number, numCols: number) {
    if (numCols === 1) return "#fbbf24"; // Default to Royal Gold
    return COLORS[colIdx % COLORS.length] ?? "#eeeeee";
}

function parseData(input: string): number[][] {
    const lines = input.trim().split("\n").filter((line) => line.trim() !== "");
    const firstLine = lines[0] ?? "";
    const isHeader = firstLine.split(/\s+/).some((val) => /[^-0-9.]/.test(val));
    const dataLines = isHeader ? lines.slice(1) : lines;
    return dataLines.map((line) => line.trim().split(/\s+/).map(Number));
}

function normalizeData(rawRows: number[][]) {
    if (rawRows.length === 0) return { data: [], min: [], max: [] };
    const numCols = rawRows[0]?.length ?? 0;
    const columns = Array.from(
        { length: numCols },
        (_, colIdx) => rawRows.map((row) => row[colIdx] ?? 0)
    );
    const minVals = columns.map((col) => Math.min(...col));
    const maxVals = columns.map((col) => Math.max(...col));
    const deltas = columns.map((_, i) => (maxVals[i] ?? 0) - (minVals[i] ?? 0));

    const normalizedCols = columns.map((col, i) => {
        const delta = deltas[i] ?? 0;
        const minV = minVals[i] ?? 0;
        return col.map((v) => delta === 0 ? 0 : (v - minV) / delta);
    });

    const numRows = rawRows.length;
    const data = Array.from(
        { length: numRows },
        (_, rowIdx) => Array.from(
            { length: numCols },
            (__, colIdx) => normalizedCols[colIdx]?.[rowIdx] ?? 0
        )
    );
    return { data, min: minVals, max: maxVals };
}

function point(args: { x: number; y: number; chartWidth: number; height: number; xMargin: number; yMargin: number }): string {
    const { x, y, chartWidth, height, xMargin, yMargin } = args;
    const px = x * (chartWidth - 2 * xMargin) + xMargin;
    const py = height - 2 * yMargin - y * (height - 2 * yMargin) + yMargin;
    return `${Math.round(px)},${Math.round(py)}`;
}

function renderCircles(args: { colIdx: number; data: number[][]; color: string; chartWidth: number; height: number; xMargin: number; yMargin: number }): string {
    const { colIdx, data, color, chartWidth, height, xMargin, yMargin } = args;
    return data.map((_, rowIdx) => {
        const y = data[rowIdx]?.[colIdx] ?? 0;
        const p = point({ x: rowIdx / Math.max(data.length - 1, 1), y, chartWidth, height, xMargin, yMargin });
        const [cx, cy] = p.split(",");
        return `  <circle cx='${cx}' cy='${cy}' r='2' fill='${color}' />`;
    }).join("\n");
}

function renderLine(args: { colIdx: number; data: number[][]; color: string; chartWidth: number; height: number; xMargin: number; yMargin: number }): string {
    const { colIdx, data, color, chartWidth, height, xMargin, yMargin } = args;
    const points = data.map((_, rowIdx) => {
        const y = data[rowIdx]?.[colIdx] ?? 0;
        return point({ x: rowIdx / Math.max(data.length - 1, 1), y, chartWidth, height, xMargin, yMargin });
    }).join(" ");
    return `  <polyline stroke='${color}' stroke-width='2' fill='none' points='${points}' stroke-linecap='round' stroke-linejoin='round' />`;
}

export function renderSvg(normalized: any, options?: ChartOptions): string {
    const chartWidth = options?.width ?? 320;
    const height = options?.height ?? 120;
    const mode = options?.mode ?? "circles";
    const xMargin = 5;
    const yMargin = 10;
    
    const { data } = normalized;
    const numCols = data[0]?.length ?? 0;
    
    let parts = [`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${chartWidth} ${height}' preserveAspectRatio='none'>`];
    
    for (let colIdx = 0; colIdx < numCols; colIdx++) {
        const color = getColor(colIdx, numCols);
        const renderArgs = { colIdx, data, color, chartWidth, height, xMargin, yMargin };
        if (mode === "lines") {
            parts.push(renderLine(renderArgs));
        } else {
            parts.push(renderCircles(renderArgs));
        }
    }
    parts.push(`</svg>`);
    return parts.join("\n");
}

export function renderBars(normalized: any, options?: ChartOptions): string {
    const width = options?.width ?? 28;
    const { data } = normalized;
    const numCols = data[0]?.length ?? 0;
    const lastRow = data[data.length - 1] ?? [];
    if (numCols === 0) return "";
    
    const BAR_CHARS = ["\u2588", "\u2593", "\u2592", "\u2591", "\u25A0", "\u25A1"];
    
    return Array.from({ length: numCols }, (_, colIdx) => {
        const value = Math.max(0, Math.min(1, lastRow[colIdx] ?? 0));
        const units = Math.round(value * width);
        const char = BAR_CHARS[colIdx % BAR_CHARS.length] ?? "\u2588";
        const bar = char.repeat(units).padEnd(width, " ");
        return `S${colIdx + 1} |${bar}| ${value.toFixed(2)}`;
    }).join("\n");
}

export function renderColumns(normalized: any, options?: ChartOptions): string {
    const height = options?.height ?? 8;
    const { data } = normalized;
    const numCols = data[0]?.length ?? 0;
    const lastRow = data[data.length - 1] ?? [];
    if (numCols === 0) return "";
    
    const COLUMN_CHARS = ["\u2588", "\u2593", "\u2592", "\u2591", "\u25A0", "\u25A1"];
    const lines = [];
    
    for (let level = height; level >= 1; level--) {
        let row = "";
        for (let colIdx = 0; colIdx < numCols; colIdx++) {
            const value = Math.max(0, Math.min(1, lastRow[colIdx] ?? 0));
            const filled = Math.round(value * height) >= level;
            row += `${filled ? COLUMN_CHARS[colIdx % COLUMN_CHARS.length] ?? "\u2588" : " "} `;
        }
        lines.push(row.trimEnd());
    }
    lines.push("\u2500".repeat(Math.max(1, numCols * 2 - 1)));
    return lines.join("\n");
}

export function renderChartli(input: string | number[][], type: ChartType, options?: ChartOptions): string {
    const rows = typeof input === 'string' ? parseData(input) : input;
    const normalized = normalizeData(rows);
    
    switch (type) {
        case 'svg': return renderSvg(normalized, options);
        case 'bars': return renderBars(normalized, options);
        case 'columns': return renderColumns(normalized, options);
        // Add others as needed
        default: return renderBars(normalized, options);
    }
}
