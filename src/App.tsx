import { useCallback, useEffect, useRef, useState } from 'react'
import { theme } from './theme'
import type { Book, Message, PersistedState, Screen } from './types'
import { TOPICS, CUSTOM_TOPIC_ID } from './data/topics'
import { hasApiKey, MissingKeyError, speak, transcribe } from './api/openai'
import { askNextQuestion, generateBook } from './api/autobio'
import { useRecorder } from './hooks/useRecorder'
import { TopicScreen } from './screens/TopicScreen'
import { ChatScreen } from './screens/ChatScreen'
import { BookScreen } from './screens/BookScreen'
import { SettingsModal } from './components/SettingsModal'

const STORAGE = 'autobio:state'

function loadState(): Partial<PersistedState> {
  try {
    const raw = localStorage.getItem(STORAGE)
    if (raw) return JSON.parse(raw) as PersistedState
  } catch {
    /* ignore */
  }
  return {}
}

export default function App() {
  const saved = useRef(loadState()).current

  const [screen, setScreen] = useState<Screen>(saved.screen ?? 'topic')
  const [topicId, setTopicId] = useState<number | null>(saved.topicId ?? null)
  const [customTopic, setCustomTopic] = useState(saved.customTopic ?? '')
  const [messages, setMessages] = useState<Message[]>(saved.messages ?? [])
  const [book, setBook] = useState<Book | null>(saved.book ?? null)
  const [bookPage, setBookPage] = useState(saved.bookPage ?? 0)

  const [loading, setLoading] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [draft, setDraft] = useState('')
  const [editingIndex, setEditingIndex] = useState(-1)
  const [editValue, setEditValue] = useState('')
  const [flipping, setFlipping] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const recorder = useRecorder()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 초기화할 때마다 증가. 진행 중이던 요청의 응답이 뒤늦게 도착해
  // 비워진 화면에 다시 끼어드는 것을 막습니다.
  const runId = useRef(0)

  // persist
  useEffect(() => {
    try {
      const data: PersistedState = { screen, topicId, customTopic, messages, book, bookPage }
      localStorage.setItem(STORAGE, JSON.stringify(data))
    } catch {
      /* ignore */
    }
  }, [screen, topicId, customTopic, messages, book, bookPage])

  const topicLabel = useCallback((): string => {
    if (topicId === CUSTOM_TOPIC_ID) return customTopic.trim() || '그 외 이야기'
    return TOPICS.find((t) => t.id === topicId)?.title ?? ''
  }, [topicId, customTopic])

  const playTTS = useCallback(async (text: string) => {
    try {
      const url = await speak(text)
      if (audioRef.current) {
        audioRef.current.src = url
        void audioRef.current.play()
      }
    } catch {
      /* TTS 실패는 조용히 무시(텍스트는 화면에 있음) */
    }
  }, [])

  const handleError = (e: unknown) => {
    if (e instanceof MissingKeyError) {
      setErrorMsg('OpenAI API 키가 필요해요. 우측 상단 설정에서 키를 입력해 주세요.')
      setShowSettings(true)
    } else {
      setErrorMsg('요청 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.')
      // eslint-disable-next-line no-console
      console.error(e)
    }
  }

  // 다음 질문 받아오기
  const askNext = useCallback(
    async (msgs: Message[]) => {
      const myRun = runId.current
      setLoading(true)
      try {
        const q = await askNextQuestion(topicLabel(), msgs)
        if (myRun !== runId.current) return // 그 사이 초기화됨 — 결과를 버립니다
        setMessages((prev) => [...prev, { role: 'ai', text: q }])
        void playTTS(q)
      } catch (e) {
        if (myRun !== runId.current) return
        handleError(e)
      } finally {
        if (myRun === runId.current) setLoading(false)
      }
    },
    [topicLabel, playTTS],
  )

  // ------- topic screen -------
  const onStart = () => {
    if (!hasApiKey()) {
      setShowSettings(true)
      return
    }
    setErrorMsg('')
    setMessages([])
    setScreen('chat')
    void askNext([])
  }

  // ------- chat screen -------
  const onToggleRecord = async () => {
    setErrorMsg('')
    if (recorder.recording) {
      const blob = await recorder.stop()
      if (!blob) return
      setTranscribing(true)
      try {
        const text = await transcribe(blob)
        setDraft((prev) => (prev ? prev + ' ' : '') + text)
      } catch (e) {
        handleError(e)
      } finally {
        setTranscribing(false)
      }
      return
    }
    if (!recorder.supported) {
      setErrorMsg('이 브라우저에서는 마이크 녹음이 어려워요. 아래 칸에 직접 적어 주세요.')
      return
    }
    try {
      if (audioRef.current) audioRef.current.pause()
      await recorder.start()
    } catch {
      setErrorMsg('마이크 사용 권한이 필요해요. 브라우저에서 허용해 주세요.')
    }
  }

  const onSubmit = () => {
    const ans = draft.trim()
    if (!ans) return
    const next = [...messages, { role: 'user' as const, text: ans }]
    setMessages(next)
    setDraft('')
    void askNext(next)
  }

  const onReplay = () => {
    const last = [...messages].reverse().find((m) => m.role === 'ai')
    if (last) void playTTS(last.text)
  }

  const onStartEdit = (idx: number) => {
    setEditingIndex(idx)
    setEditValue(messages[idx].text)
  }
  const onSaveEdit = (idx: number) => {
    setMessages((prev) => prev.map((m, i) => (i === idx ? { ...m, text: editValue } : m)))
    setEditingIndex(-1)
  }

  const onFinish = async () => {
    const myRun = runId.current
    if (recorder.recording) await recorder.stop()
    if (audioRef.current) audioRef.current.pause()
    setGenerating(true)
    setErrorMsg('')
    try {
      const b = await generateBook(topicLabel(), messages)
      if (myRun !== runId.current) return // 그 사이 초기화됨
      setBook(b)
      setBookPage(0)
      setScreen('book')
    } catch (e) {
      if (myRun !== runId.current) return
      handleError(e)
    } finally {
      if (myRun === runId.current) setGenerating(false)
    }
  }

  // ------- book screen -------
  const flip = (dir: number) => {
    if (!book) return
    const total = book.chapters.length + 1
    const nextPage = bookPage + dir
    if (nextPage < 0 || nextPage >= total) return
    setFlipping(true)
    window.setTimeout(() => {
      setBookPage(nextPage)
      setFlipping(false)
    }, 160)
  }

  // 아무것도 입력되지 않은 처음 상태로. (API 키는 설정에 그대로 남습니다)
  const onRestart = async () => {
    const hasProgress =
      topicId !== null || customTopic.trim() !== '' || messages.length > 0 || book !== null
    if (hasProgress && !window.confirm('지금까지의 이야기가 모두 지워집니다. 처음부터 다시 시작할까요?')) {
      return
    }

    runId.current += 1 // 진행 중인 요청의 결과를 무효화

    if (recorder.recording) await recorder.stop()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
    }

    setLoading(false)
    setGenerating(false)
    setTranscribing(false)

    try {
      localStorage.removeItem(STORAGE)
    } catch {
      /* ignore */
    }
    setScreen('topic')
    setTopicId(null)
    setCustomTopic('')
    setMessages([])
    setBook(null)
    setBookPage(0)
    setDraft('')
    setEditingIndex(-1)
    setEditValue('')
    setErrorMsg('')
    setFlipping(false)
  }

  const lastAi = [...messages].reverse().find((m) => m.role === 'ai')
  const answered = messages.filter((m) => m.role === 'user').length

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: theme.bgGradient, display: 'flex', flexDirection: 'column' }}>
      <audio ref={audioRef} hidden />

      {screen === 'topic' && (
        <TopicScreen
          topicId={topicId}
          customTopic={customTopic}
          micNote={
            recorder.supported
              ? '조용한 곳에서 또박또박 말씀하시면 더 잘 담겨요.'
              : '이 브라우저는 녹음이 어려워, 답변을 직접 입력할 수 있어요.'
          }
          onSelect={setTopicId}
          onCustomChange={setCustomTopic}
          onStart={onStart}
          onOpenSettings={() => setShowSettings(true)}
          onReset={() => void onRestart()}
        />
      )}

      {screen === 'chat' && (
        <ChatScreen
          topicTitle={topicLabel()}
          messages={messages}
          answered={answered}
          loading={loading}
          transcribing={transcribing}
          recording={recorder.recording}
          recSupported={recorder.supported}
          currentQuestion={lastAi?.text ?? ''}
          draft={draft}
          editingIndex={editingIndex}
          editValue={editValue}
          errorMsg={errorMsg}
          onReset={() => void onRestart()}
          onReplay={onReplay}
          onToggleRecord={onToggleRecord}
          onDraftChange={setDraft}
          onSubmit={onSubmit}
          onFinish={onFinish}
          onStartEdit={onStartEdit}
          onEditChange={setEditValue}
          onSaveEdit={onSaveEdit}
          onCancelEdit={() => setEditingIndex(-1)}
        />
      )}

      {screen === 'book' && book && (
        <BookScreen
          book={book}
          page={bookPage}
          flipping={flipping}
          onPrev={() => flip(-1)}
          onNext={() => flip(1)}
          onPrint={() => window.print()}
          onRestart={() => void onRestart()}
        />
      )}

      {generating && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(236,224,201,.92)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            textAlign: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              border: '4px solid #e0cfa9',
              borderTopColor: theme.accent,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p style={{ fontFamily: theme.fontSerif, fontWeight: 700, fontSize: 26, color: theme.ink, margin: '26px 0 6px' }}>
            자서전을 쓰고 있어요
          </p>
          <p style={{ fontSize: 17, color: theme.inkSoft, margin: 0 }}>
            들려주신 이야기를 정성껏 엮는 중이에요. 잠시만요…
          </p>
        </div>
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} onSaved={() => setErrorMsg('')} />
      )}
    </div>
  )
}
