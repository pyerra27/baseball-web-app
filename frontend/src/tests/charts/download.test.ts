import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import * as htmlToImage from 'html-to-image'
import { downloadCsv, downloadPng, slugify, toCsv } from '../../features/charts/download'

vi.mock('html-to-image', () => ({ toPng: vi.fn() }))

const createObjectURL = vi.fn((_blob: Blob) => 'blob:mock')
const anchorClicks: { href: string; download: string }[] = []

function readBytes(blob: Blob): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
        reader.onerror = () => reject(reader.error)
        reader.readAsArrayBuffer(blob)
    })
}

beforeAll(() => {
    // jsdom has no object URLs. These stay defined for the whole file
    // because downloadCsv revokes its URL on a timer.
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => {} })
    // Record download clicks instead of letting jsdom try to navigate.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        anchorClicks.push({ href: this.getAttribute('href') ?? '', download: this.download })
    })
})

beforeEach(() => {
    createObjectURL.mockClear()
    vi.mocked(htmlToImage.toPng).mockReset()
    anchorClicks.length = 0
})

describe('toCsv', () => {
    it('joins fields with commas and ends each row with CRLF', () => {
        expect(toCsv([['Season', 'HR'], [2019, 45]])).toBe('Season,HR\r\n2019,45\r\n')
    })

    it('quotes fields that contain commas, quotes, or line breaks', () => {
        expect(toCsv([['Smith, John', 'say "hi"', 'two\nlines']])).toBe('"Smith, John","say ""hi""","two\nlines"\r\n')
    })

    it('leaves empty cells empty', () => {
        expect(toCsv([['Mike Trout', 2020, '', '']])).toBe('Mike Trout,2020,,\r\n')
    })
})

describe('slugify', () => {
    it('builds lowercase, hyphenated file names', () => {
        expect(slugify('Mike Trout', 'Home Runs', '2011–2024')).toBe('mike-trout-home-runs-2011-2024')
    })

    it('drops accents and punctuation', () => {
        expect(slugify('José Ramírez', 'Walks + Hits per Inning', '2024')).toBe('jose-ramirez-walks-hits-per-inning-2024')
    })
})

describe('downloadCsv', () => {
    it('saves UTF-8 CSV with a byte-order mark under the given name', async () => {
        downloadCsv([['Player', 'HR'], ['José Ramírez', 39]], 'jose-ramirez.csv')

        const blob = createObjectURL.mock.calls[0][0]
        expect(blob.type).toBe('text/csv;charset=utf-8')

        const bytes = await readBytes(blob)
        expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
        expect(new TextDecoder().decode(bytes)).toBe('Player,HR\r\nJosé Ramírez,39\r\n')

        expect(anchorClicks).toEqual([{ href: 'blob:mock', download: 'jose-ramirez.csv' }])
    })
})

describe('downloadPng', () => {
    it('renders the element at twice its size and saves it under the given name', async () => {
        vi.mocked(htmlToImage.toPng).mockResolvedValue('data:image/png;base64,AAAA')
        const node = document.createElement('section')

        await downloadPng(node, 'chart.png')

        expect(htmlToImage.toPng).toHaveBeenCalledWith(node, expect.objectContaining({ pixelRatio: 2 }))
        expect(anchorClicks).toEqual([{ href: 'data:image/png;base64,AAAA', download: 'chart.png' }])
    })

    it('leaves out elements marked with data-export-exclude', async () => {
        vi.mocked(htmlToImage.toPng).mockResolvedValue('data:image/png;base64,AAAA')
        await downloadPng(document.createElement('section'), 'chart.png')

        const filter = vi.mocked(htmlToImage.toPng).mock.calls[0][1]?.filter
        const excluded = document.createElement('div')
        excluded.dataset.exportExclude = ''

        expect(filter?.(excluded)).toBe(false)
        expect(filter?.(document.createElement('div'))).toBe(true)
    })
})
