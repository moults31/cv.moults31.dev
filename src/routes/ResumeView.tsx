import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Loader2, Mail, Printer } from 'lucide-react'
import { fromJsonResume } from '@/lib/io'
import { ensureFontsReady } from '@/data/fonts'
import { documentFaces } from '@/lib/documentFaces'
import { downloadBlob } from '@/lib/utils'
import { PAGE_DIMENSIONS } from '@/types/metadata'
import type { ResumeDocument } from '@/types/document'
import { fitToPages } from '@/lib/fitOnePage'
import type { FitVector } from '@/lib/fitOnePage'
import { fitRulesOf } from '@/lib/fitReadout'
import { TemplateRenderer } from '@/templates/TemplateRenderer'

/**
 * The public résumé page: a chrome-free, read-only render of `public/resume.json`
 * (a normal CVAurum / JSON Resume export). It draws the exact same document the
 * editor and the PDF engine do, and the Download PDF button calls the app's own
 * vector engine — so the file a visitor saves is byte-for-byte what is on screen.
 *
 * The résumé is authored in the editor (`/app` → export JSON → replace
 * `public/resume.json`), so there is no server and no database anywhere.
 */

const PUBLIC_RESUME_URL = '/resume.json'

function raf2() {
  return new Promise<void>((resolve) => {
    let done = false
    const finish = () => {
      if (!done) {
        done = true
        resolve()
      }
    }
    requestAnimationFrame(() => requestAnimationFrame(finish))
    setTimeout(finish, 400)
  })
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | void> {
  return Promise.race([p, new Promise<void>((r) => setTimeout(r, ms))])
}

export function ResumeView() {
  const [doc, setDoc] = useState<ResumeDocument | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [fit, setFit] = useState<FitVector>({ type: 1, space: 1 })
  const [scale, setScale] = useState(1)
  const [frameH, setFrameH] = useState(0)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const sheetRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  // Load the committed résumé and set the browser title.
  useEffect(() => {
    let active = true
    document.getElementById('boot-splash')?.remove()
    fetch(PUBLIC_RESUME_URL, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((json) => {
        if (!active) return
        const parsed = fromJsonResume(json)
        setDoc(parsed)
        setStatus('ready')
      })
      .catch((e) => {
        console.error('Could not load the résumé', e)
        if (active) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!doc) return
    const name = doc.content.basics.name || 'Résumé'
    const label = doc.content.basics.label
    document.title = label ? `${name} — ${label}` : name
  }, [doc])

  // Fonts, Magic fit, then size the on-screen sheet to the viewport.
  useEffect(() => {
    if (!doc) return
    let cancelled = false

    const measureScale = () => {
      const stage = stageRef.current
      const sheet = sheetRef.current
      if (!stage || !sheet) return
      const pageW = PAGE_DIMENSIONS[doc.metadata.page.format].w
      const avail = stage.clientWidth - 24
      setScale(Math.min(1, avail > 0 ? avail / pageW : 1))
      setFrameH(sheet.scrollHeight)
    }

    void (async () => {
      try {
        await withTimeout(ensureFontsReady(documentFaces(doc.metadata)), 4000)
        await raf2()
        if (cancelled) return
        if (doc.metadata.page.autoFit && sheetRef.current) {
          const { h: pageH } = PAGE_DIMENSIONS[doc.metadata.page.format]
          await fitToPages(
            {
              pageH,
              measure: async (f) => {
                if (cancelled || !sheetRef.current) return Number.POSITIVE_INFINITY
                setFit(f)
                await raf2()
                return sheetRef.current?.scrollHeight ?? Number.POSITIVE_INFINITY
              },
            },
            fitRulesOf(doc.metadata)
          )
        }
      } catch {
        /* fall through: still show the page at the size it has */
      }
      if (cancelled) return
      await raf2()
      measureScale()
    })()

    const onResize = () => measureScale()
    window.addEventListener('resize', onResize)
    return () => {
      cancelled = true
      window.removeEventListener('resize', onResize)
    }
  }, [doc])

  const onDownload = useCallback(async () => {
    if (!doc || busy) return
    setBusy(true)
    setNotice('')
    try {
      const [{ renderResumePdf }, { pdfBaseName }] = await Promise.all([
        import('@/lib/pdf/render'),
        import('@/lib/pdf'),
      ])
      const bytes = await renderResumePdf(doc)
      downloadBlob(new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), `${pdfBaseName(doc)}.pdf`)
    } catch (e) {
      console.error('PDF export failed', e)
      setNotice('Could not build the PDF here. Try the Print button, or email me and I will send it.')
    } finally {
      setBusy(false)
    }
  }, [doc, busy])

  const onPrint = useCallback(() => {
    if (!doc) return
    const fmt = doc.metadata.page.format === 'Letter' ? 'Letter' : 'A4'
    const style = document.createElement('style')
    style.textContent = `@page { size: ${fmt}; margin: 0; }`
    document.head.appendChild(style)
    const done = () => {
      style.remove()
      window.removeEventListener('afterprint', done)
    }
    window.addEventListener('afterprint', done)
    window.print()
  }, [doc])

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-foreground">
        <p className="text-sm text-muted-foreground">
          The résumé could not be loaded. Please try again, or email moults31@moults31.dev.
        </p>
      </div>
    )
  }

  const pageW = doc ? PAGE_DIMENSIONS[doc.metadata.page.format].w : PAGE_DIMENSIONS.A4.w
  const widthCss = doc?.metadata.page.format === 'Letter' ? '8.5in' : '210mm'
  const email = doc?.content.basics.email || 'moults31@moults31.dev'
  const name = doc?.content.basics.name || 'Zachary Moulton'
  const label = doc?.content.basics.label || 'Firmware / Systems Software Engineer'

  return (
    <div className="min-h-screen bg-[hsl(220_18%_92%)] text-foreground dark:bg-[hsl(220_20%_10%)]">
      <style>{`.rv-scale{transform-origin:top left}
        @media print{.rv-bar{display:none!important}.rv-stage{display:block!important;padding:0!important;background:#fff!important}.rv-frame{width:auto!important;height:auto!important}.rv-scale{transform:none!important}.print-sheet{box-shadow:none!important;width:auto!important}}`}</style>

      <header className="rv-bar sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{label}</p>
          </div>
          <div className="flex items-center gap-2">
            <a className="btn-ghost btn-sm" href={`mailto:${email}`} aria-label="Email">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">{email}</span>
            </a>
            <button className="btn-outline btn-sm" onClick={onPrint} aria-label="Print">
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button className="btn-primary btn-sm" onClick={onDownload} disabled={busy || !doc} aria-label="Download PDF">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span>{busy ? 'Building…' : 'Download PDF'}</span>
            </button>
          </div>
        </div>
        {notice && (
          <div className="border-t border-border bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            {notice}
          </div>
        )}
      </header>

      {status === 'loading' || !doc ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div ref={stageRef} className="rv-stage flex justify-center overflow-hidden px-3 pb-16 pt-6">
          <div className="rv-frame relative" style={{ width: pageW * scale, height: frameH * scale }}>
            <div
              ref={sheetRef}
              className="print-sheet rv-scale absolute left-0 top-0"
              style={{ width: widthCss, transform: `scale(${scale})` }}
            >
              <TemplateRenderer doc={doc} mode="print" fit={fit} />
            </div>
          </div>
        </div>
      )}

      <footer className="rv-bar border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
        <p>
          {name} · {email}
        </p>
        <p className="mt-1">
          Built on{' '}
          <a className="underline hover:text-foreground" href="https://github.com/akhil-dara/CVAurum">
            CVAurum
          </a>{' '}
          (AGPL-3.0) ·{' '}
          <a className="underline hover:text-foreground" href="https://github.com/moults31/cv.moults31.dev">
            source
          </a>
        </p>
      </footer>
    </div>
  )
}
