import React, { useEffect, useRef, forwardRef, useImperativeHandle, useLayoutEffect } from 'react'
import type { Span } from '../lib/api'

export interface DiffPaneHandle {
  scrollTo: (top: number) => void
  getScrollTop: () => number
  getScrollHeight: () => number
  getClientHeight: () => number
}

interface Props {
  spans: Span[]
  side: 'original' | 'revised'
  title: string
  currentChangeIndex: number
  changeSpanIndices: number[]
  onScroll: (top: number) => void
}

// Colour map for scrollbar marker dots
const MARKER_COLORS: Record<string, string> = {
  delete:    '#ff4444',
  insert:    '#22c55e',
  replace:   '#f59e0b',
  move_from: '#a855f7',
  move_to:   '#3b82f6',
}

const DiffPane = forwardRef<DiffPaneHandle, Props>(function DiffPane(
  { spans, side, title, currentChangeIndex, changeSpanIndices, onScroll },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const changeRefs   = useRef<(HTMLSpanElement | null)[]>([])

  useImperativeHandle(ref, () => ({
    scrollTo:        (top)  => { if (containerRef.current) containerRef.current.scrollTop = top },
    getScrollTop:    ()     => containerRef.current?.scrollTop ?? 0,
    getScrollHeight: ()     => containerRef.current?.scrollHeight ?? 0,
    getClientHeight: ()     => containerRef.current?.clientHeight ?? 0,
  }))

  // Scroll active change into view
  useEffect(() => {
    const spanIdx = changeSpanIndices[currentChangeIndex]
    const el = changeRefs.current[spanIdx]
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [currentChangeIndex, changeSpanIndices])

  // Draw scrollbar change markers onto canvas
  const drawMarkers = () => {
    const canvas = canvasRef.current
    const pane   = containerRef.current
    if (!canvas || !pane) return

    const { scrollHeight, clientHeight } = pane
    canvas.height = clientHeight
    canvas.width  = 12
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, 12, clientHeight)

    const CHANGE_TYPES = new Set(['insert','delete','replace','move_from','move_to'])

    changeRefs.current.forEach((el, idx) => {
      if (!el) return
      const span = spans[idx]
      if (!span || !CHANGE_TYPES.has(span.type)) return
      const elTop     = el.offsetTop
      const markerY   = Math.round((elTop / scrollHeight) * clientHeight)
      const isActive  = changeSpanIndices[currentChangeIndex] === idx

      ctx.fillStyle = isActive ? '#1F497D' : (MARKER_COLORS[span.type] ?? '#999')
      const h = isActive ? 6 : 4
      const w = isActive ? 12 : 8
      ctx.fillRect(isActive ? 0 : 2, markerY - h / 2, w, h)
    })
  }

  useLayoutEffect(() => { drawMarkers() })

  const handleScroll = () => {
    onScroll(containerRef.current?.scrollTop ?? 0)
    drawMarkers()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Pane header */}
      <div className="px-4 py-2 bg-gray-100 border-b font-semibold text-sm text-gray-700 flex-shrink-0">
        {title}
      </div>

      {/* Scrollable content + marker canvas */}
      <div className="flex-1 relative overflow-hidden pane-wrapper">
        <div
          ref={containerRef}
          className="pane absolute inset-0 overflow-auto p-5 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words"
          style={{ paddingRight: '20px' }}   // leave room for canvas
          onScroll={handleScroll}
        >
          {spans.map((span, idx) => {
            if (!span.text) return null

            const isChange = span.type !== 'equal'
            const isActive = isChange && changeSpanIndices[currentChangeIndex] === idx

            const cls = [
              span.type === 'delete'    && side === 'original' ? 'diff-delete'    : '',
              span.type === 'insert'    && side === 'revised'  ? 'diff-insert'    : '',
              span.type === 'replace'                          ? 'diff-replace'   : '',
              span.type === 'move_from' && side === 'original' ? 'diff-move-from' : '',
              span.type === 'move_to'   && side === 'revised'  ? 'diff-move-to'   : '',
              isActive                                         ? 'change-active'  : '',
            ].filter(Boolean).join(' ')

            return (
              <span
                key={idx}
                className={cls || undefined}
                ref={isChange ? (el) => { changeRefs.current[idx] = el } : undefined}
                title={
                  span.move_id !== undefined && span.move_id >= 0
                    ? `Moved content (move #${span.move_id + 1})`
                    : span.context || undefined
                }
              >
                {span.text}
              </span>
            )
          })}
        </div>

        {/* Scrollbar change markers */}
        <canvas
          ref={canvasRef}
          className="scrollbar-markers"
          style={{ height: '100%' }}
        />
      </div>
    </div>
  )
})

export default DiffPane
