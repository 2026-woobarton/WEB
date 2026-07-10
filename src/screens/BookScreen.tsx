import { contentPages } from '../api/autobio'
import { theme } from '../theme'
import type { Book } from '../types'

interface Props {
  book: Book
  page: number
  flipping: boolean
  illustrating: boolean
  onPrev: () => void
  onNext: () => void
  onPrint: () => void
  onRestart: () => void
}

interface CoverPage {
  kind: 'cover'
  subtitle: string
}
/** 문단 두 개가 한 페이지입니다. */
interface TextPage {
  kind: 'text'
  paragraphs: string[]
  pageNo: number
}
type Page = CoverPage | TextPage

/**
 * 삽화를 종이 위에 얹습니다.
 * multiply 로 밝은 크림 배경이 종이에 녹아들고, mask 로 가장자리를 흐려 경계선을 없앱니다.
 */
const blendIntoPaper = {
  mixBlendMode: 'multiply',
  maskImage: 'radial-gradient(ellipse at center, #000 55%, transparent 100%)',
  WebkitMaskImage: 'radial-gradient(ellipse at center, #000 55%, transparent 100%)',
} as const

/**
 * 그림이 아직 안 온 자리. 그리는 중일 때만 자리를 잡습니다.
 * 그림 없이 저장된 옛 책이나 생성에 실패한 경우에는 빈 공간을 남기지 않습니다.
 */
function ImagePlaceholder({ height, illustrating }: { height: number; illustrating: boolean }) {
  if (!illustrating) return null
  return (
    <div
      style={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        color: '#c3b49a',
      }}
    >
      그림을 그리는 중이에요…
    </div>
  )
}

export function BookScreen({
  book,
  page,
  flipping,
  illustrating,
  onPrev,
  onNext,
  onPrint,
  onRestart,
}: Props) {
  const pages: Page[] = [
    { kind: 'cover', subtitle: book.subtitle || '' },
    ...contentPages(book.content).map((paragraphs, i) => ({
      kind: 'text' as const,
      paragraphs,
      pageNo: i + 1,
    })),
  ]

  const cur = pages[Math.min(page, pages.length - 1)]
  const navBase = {
    background: theme.paper,
    border: '1px solid #d8c9aa',
    color: '#4a4133',
    borderRadius: 12,
    padding: '12px 24px',
    fontSize: 17,
  } as const

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '34px 20px 44px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 760,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 22,
        }}
      >
        <button
          onClick={onRestart}
          style={{
            background: 'transparent',
            border: '1px solid #d8c9aa',
            color: theme.inkSoft,
            borderRadius: 10,
            padding: '10px 16px',
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          ← 새 이야기
        </button>
        <span style={{ fontFamily: theme.fontHand, fontSize: 24, color: theme.accent }}>
          {book.title}
        </span>
        <button
          onClick={onPrint}
          style={{
            background: theme.accent,
            border: 'none',
            color: '#fff',
            borderRadius: 10,
            padding: '10px 18px',
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          인쇄 · 저장
        </button>
      </div>

      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          transition: 'opacity .16s ease, transform .16s ease',
          opacity: flipping ? 0 : 1,
          transform: flipping ? 'translateY(8px)' : 'none',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 720,
            minHeight: 560,
            background: theme.page,
            border: `1px solid ${theme.edge}`,
            borderRadius: 6,
            boxShadow: '0 30px 60px -30px rgba(80,58,24,.55), inset 0 0 60px rgba(214,196,158,.18)',
            padding: '60px 62px',
            position: 'relative',
          }}
        >
          {cur.kind === 'cover' ? (
            <div
              style={{
                minHeight: 440,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              {book.cover ? (
                <img
                  src={book.cover}
                  alt=""
                  style={{
                    width: 260,
                    height: 260,
                    objectFit: 'cover',
                    borderRadius: '50%',
                    marginBottom: 18,
                    ...blendIntoPaper,
                  }}
                />
              ) : (
                <ImagePlaceholder height={260} illustrating={illustrating} />
              )}
              <div style={{ width: 64, height: 2, background: theme.accent, marginBottom: 24 }} />
              <div style={{ fontSize: 15, letterSpacing: 5, color: theme.accent, marginBottom: 20 }}>
                자 서 전
              </div>
              <h1
                style={{
                  fontFamily: theme.fontSerif,
                  fontWeight: 800,
                  fontSize: 40,
                  lineHeight: 1.4,
                  color: theme.ink,
                  margin: '0 0 20px',
                }}
              >
                {book.title}
              </h1>
              <p style={{ fontFamily: theme.fontHand, fontSize: 22, color: theme.inkSoft, margin: 0 }}>
                {cur.subtitle}
              </p>
              <div style={{ width: 64, height: 2, background: theme.accent, marginTop: 30 }} />
            </div>
          ) : (
            <div
              style={{
                minHeight: 440,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 22,
              }}
            >
              {cur.paragraphs.map((para, i) => (
                <p
                  key={i}
                  style={{
                    fontFamily: theme.fontSerif,
                    fontSize: 19,
                    lineHeight: 2,
                    color: '#40382b',
                    margin: 0,
                    textIndent: '1.2em',
                    textWrap: 'pretty',
                  }}
                >
                  {para}
                </p>
              ))}
            </div>
          )}
          <span
            style={{
              position: 'absolute',
              bottom: 26,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontSize: 14,
              color: '#b3a68f',
            }}
          >
            {cur.kind === 'text' ? cur.pageNo : ''}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 26 }}>
        <button
          onClick={onPrev}
          disabled={page <= 0}
          style={{ ...navBase, cursor: page <= 0 ? 'not-allowed' : 'pointer', opacity: page <= 0 ? 0.4 : 1 }}
        >
          ◀ 이전
        </button>
        <span style={{ fontSize: 16, color: theme.inkSoft, minWidth: 70, textAlign: 'center' }}>
          {page + 1} / {pages.length}
        </span>
        <button
          onClick={onNext}
          disabled={page >= pages.length - 1}
          style={{
            ...navBase,
            cursor: page >= pages.length - 1 ? 'not-allowed' : 'pointer',
            opacity: page >= pages.length - 1 ? 0.4 : 1,
          }}
        >
          다음 ▶
        </button>
      </div>
    </div>
  )
}
