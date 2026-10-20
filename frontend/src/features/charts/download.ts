/**
 * Helpers for saving chart data and images as files.
 */

type CsvCell = string | number

function csvField(cell: CsvCell): string {
    const text = String(cell)
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Build CSV text, quoting fields per RFC 4180. */
export function toCsv(rows: ReadonlyArray<ReadonlyArray<CsvCell>>): string {
    return rows.map(row => row.map(csvField).join(',')).join('\r\n') + '\r\n'
}

/** A lowercase, hyphenated file name such as "jose-ramirez-home-runs-2015-2024". */
export function slugify(...parts: string[]): string {
    return parts
        .join(' ')
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function saveUrl(url: string, fileName: string): void {
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
}

/**
 * Save rows as a CSV file. A UTF-8 byte-order mark goes first so Excel
 * shows accented names correctly.
 */
export function downloadCsv(rows: ReadonlyArray<ReadonlyArray<CsvCell>>, fileName: string): void {
    const blob = new Blob(['﻿', toCsv(rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    saveUrl(url, fileName)
    // Revoking right after the click can cancel the download in some browsers.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Save an element as a PNG at twice its on-screen resolution, on its own
 * background color. Descendants marked with `data-export-exclude` are left out.
 * html-to-image is loaded on first use so it stays out of the page bundle.
 */
export async function downloadPng(node: HTMLElement, fileName: string): Promise<void> {
    const { toPng } = await import('html-to-image')
    const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: getComputedStyle(node).backgroundColor,
        filter: element => element.dataset?.exportExclude === undefined,
    })
    saveUrl(dataUrl, fileName)
}
