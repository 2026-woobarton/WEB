import { theme } from '../theme'
import type { Message } from '../types'

interface Props {
  topicTitle: string
  messages: Message[]
  answered: number
  loading: boolean
  transcribing: boolean
  recording: boolean
  recSupported: boolean
  currentQuestion: string
  draft: string
  editingIndex: number
  editValue: string
  errorMsg: string
  onReset: () => void
  onReplay: () => void
  onToggleRecord: () => void
  onDraftChange: (v: string) => void
  onSubmit: () => void
  onFinish: () => void
  onStartEdit: (idx: number) => void
  onEditChange: (v: string) => void
  onSaveEdit: (idx: number) => void
  onCancelEdit: () => void
}

interface QA {
  num: number
  index: number
  q: string
  a: string
}

export function ChatScreen(p: Props) {
  const canFinish = p.answered >= 2 && !p.loading && !p.transcribing

  // 질문/답변 짝 구성
  const qaList: QA[] = []
  let n = 0
  for (let i = 0; i < p.messages.length; i++) {
    const m = p.messages[i]
    const a = p.messages[i + 1]
    if (m.role === 'ai' && a && a.role === 'user') {
      n++
      qaList.push({ num: n, index: i + 1, q: m.text, a: a.text })
    }
  }

  const hasDraft = !!p.draft && !p.recording && !p.transcribing
  const recLabel = p.transcribing
    ? '말씀을 글로 옮기고 있어요…'
    : p.recording
      ? '듣고 있어요… (누르면 완료)'
      : p.draft
        ? '다시 눌러 이어 말할 수 있어요'
        : p.recSupported
          ? '눌러서 이야기를 들려주세요'
          : '이 브라우저는 녹음이 어려워요. 아래에 직접 적어 주세요.'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '16px 26px',
          background: 'rgba(251,246,234,.85)',
          backdropFilter: 'blur(6px)',
          borderBottom: `1px solid ${theme.edge}`,
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <button
            onClick={p.onReset}
            title="입력한 내용을 모두 지우고 처음 상태로 돌아갑니다"
            style={{
              background: theme.paper,
              border: `1px solid ${theme.edge}`,
              color: theme.inkSoft,
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 14,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            ↺ 초기화
          </button>
          <span style={{ fontFamily: theme.fontHand, fontSize: 26, color: theme.accent, whiteSpace: 'nowrap' }}>
            나의 이야기
          </span>
          <span
            style={{
              fontSize: 17,
              color: theme.inkSoft,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {p.topicTitle}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 15, color: theme.inkFaint, whiteSpace: 'nowrap' }}>
            이야기 {p.answered} 마디
          </span>
          <button
            onClick={p.onFinish}
            disabled={!canFinish}
            style={{
              background: canFinish ? theme.accent : '#d8c9aa',
              color: '#fff',
              border: 'none',
              borderRadius: 11,
              padding: '11px 20px',
              fontSize: 16,
              fontWeight: 700,
              cursor: canFinish ? 'pointer' : 'not-allowed',
              opacity: canFinish ? 1 : 0.6,
              whiteSpace: 'nowrap',
            }}
          >
            자서전 완성하기
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>
        {/* main */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '40px 28px 48px',
            minWidth: 0,
          }}
        >
          <div style={{ width: '100%', maxWidth: 620 }}>
            {/* question card */}
            <div
              style={{
                background: theme.paper,
                border: `1px solid ${theme.edge}`,
                borderRadius: 22,
                padding: '30px 30px 26px',
                boxShadow: '0 16px 36px -26px rgba(90,66,30,.5)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: theme.accent,
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontFamily: theme.fontHand,
                    flex: 'none',
                  }}
                >
                  Q
                </span>
                <span style={{ fontSize: 15, color: theme.inkFaint }}>이렇게 여쭤볼게요</span>
                <button
                  onClick={p.onReplay}
                  style={{
                    marginLeft: 'auto',
                    background: '#f7f0e1',
                    border: '1px solid #e0cfa9',
                    color: theme.inkSoft,
                    borderRadius: 20,
                    padding: '6px 14px',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  다시 들려주기
                </button>
              </div>
              {p.loading ? (
                <p style={{ fontFamily: theme.fontSerif, fontSize: 25, lineHeight: 1.6, color: theme.inkFaint, margin: 0 }}>
                  질문을 준비하고 있어요
                  <span style={{ animation: 'dots 1.2s infinite' }}>.</span>
                  <span style={{ animation: 'dots 1.2s infinite .2s' }}>.</span>
                  <span style={{ animation: 'dots 1.2s infinite .4s' }}>.</span>
                </p>
              ) : (
                <p
                  style={{
                    fontFamily: theme.fontSerif,
                    fontWeight: 700,
                    fontSize: 27,
                    lineHeight: 1.6,
                    color: theme.ink,
                    margin: 0,
                  }}
                >
                  {p.currentQuestion}
                </p>
              )}
            </div>

            {/* record */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 34 }}>
              <button
                onClick={p.onToggleRecord}
                disabled={p.transcribing}
                style={{
                  width: 116,
                  height: 116,
                  borderRadius: '50%',
                  border: 'none',
                  cursor: p.transcribing ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all .2s ease',
                  background: p.recording ? theme.rec : theme.accent,
                  animation: p.recording ? 'rec-pulse 1.5s infinite' : undefined,
                  boxShadow: p.recording ? undefined : '0 12px 26px -12px rgba(181,98,47,.7)',
                  opacity: p.transcribing ? 0.6 : 1,
                }}
              >
                {p.recording ? (
                  <span style={{ width: 26, height: 26, borderRadius: 5, background: '#fff' }} />
                ) : (
                  <span
                    style={{
                      width: 22,
                      height: 40,
                      borderRadius: 11,
                      background: '#fff',
                      boxShadow: '0 14px 0 -8px #fff, 0 2px 0 0 #fff',
                    }}
                  />
                )}
              </button>
              <p style={{ fontSize: 18, color: theme.inkSoft, margin: '16px 0 0', minHeight: 26 }}>
                {recLabel}
              </p>
            </div>

            {p.errorMsg && (
              <p
                style={{
                  marginTop: 18,
                  fontSize: 15,
                  color: '#a23a26',
                  background: '#f7e6df',
                  border: '1px solid #e6c3b6',
                  borderRadius: 12,
                  padding: '12px 14px',
                  lineHeight: 1.6,
                }}
              >
                {p.errorMsg}
              </p>
            )}

            {/* draft */}
            {(hasDraft || (!p.recSupported && !p.recording)) && (
              <div
                style={{
                  marginTop: 30,
                  background: theme.paperBright,
                  border: `1px solid ${theme.edge}`,
                  borderRadius: 18,
                  padding: 20,
                }}
              >
                <label style={{ display: 'block', fontSize: 15, color: theme.inkFaint, marginBottom: 10 }}>
                  말씀하신 내용이에요 — 고치고 싶으면 바로 수정하세요
                </label>
                <textarea
                  value={p.draft}
                  onChange={(e) => p.onDraftChange(e.target.value)}
                  rows={5}
                  placeholder={!p.recSupported ? '여기에 이야기를 적어 주세요' : undefined}
                  style={{
                    width: '100%',
                    fontFamily: theme.fontSerif,
                    fontSize: 20,
                    lineHeight: 1.7,
                    color: theme.ink,
                    border: '1px solid #e0cfa9',
                    borderRadius: 12,
                    padding: 14,
                    background: '#fff',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
                <button
                  onClick={p.onSubmit}
                  disabled={!p.draft.trim()}
                  style={{
                    width: '100%',
                    marginTop: 14,
                    padding: 15,
                    borderRadius: 12,
                    border: 'none',
                    fontSize: 19,
                    fontFamily: theme.fontSerif,
                    fontWeight: 700,
                    color: '#fff',
                    background: theme.accent,
                    cursor: p.draft.trim() ? 'pointer' : 'not-allowed',
                    opacity: p.draft.trim() ? 1 : 0.5,
                  }}
                >
                  이 이야기 담고 다음으로
                </button>
              </div>
            )}
          </div>
        </div>

        {/* history */}
        <aside
          style={{
            width: 372,
            flex: 'none',
            borderLeft: `1px solid ${theme.edge}`,
            background: 'rgba(251,246,234,.6)',
            padding: '26px 22px 40px',
            overflowY: 'auto',
          }}
        >
          <h3 style={{ fontFamily: theme.fontSerif, fontWeight: 800, fontSize: 20, margin: '0 0 4px', color: theme.ink }}>
            지금까지의 이야기
          </h3>
          <p style={{ fontSize: 14, color: '#a79a83', margin: '0 0 20px' }}>
            담긴 답변을 눌러 언제든 고칠 수 있어요.
          </p>
          {qaList.length === 0 ? (
            <p
              style={{
                fontSize: 16,
                color: '#b3a68f',
                lineHeight: 1.6,
                padding: 20,
                textAlign: 'center',
                border: '1px dashed #ddceb0',
                borderRadius: 14,
              }}
            >
              첫 질문에 답하시면
              <br />
              여기에 차곡차곡 쌓여요.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {qaList.map((qa) => {
                const editing = p.editingIndex === qa.index
                return (
                  <div key={qa.index} style={{ borderBottom: `1px solid ${theme.line}`, paddingBottom: 16 }}>
                    <p style={{ fontSize: 15, lineHeight: 1.55, color: theme.accent, margin: '0 0 8px' }}>
                      {qa.num}. {qa.q}
                    </p>
                    {editing ? (
                      <div>
                        <textarea
                          value={p.editValue}
                          onChange={(e) => p.onEditChange(e.target.value)}
                          rows={4}
                          style={{
                            width: '100%',
                            fontFamily: theme.fontSerif,
                            fontSize: 16,
                            lineHeight: 1.6,
                            color: theme.ink,
                            border: `1px solid ${theme.accent}`,
                            borderRadius: 10,
                            padding: 10,
                            background: '#fff',
                            outline: 'none',
                            resize: 'vertical',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button
                            onClick={() => p.onSaveEdit(qa.index)}
                            style={{
                              flex: 1,
                              background: theme.accent,
                              color: '#fff',
                              border: 'none',
                              borderRadius: 9,
                              padding: 9,
                              fontSize: 15,
                              cursor: 'pointer',
                            }}
                          >
                            저장
                          </button>
                          <button
                            onClick={p.onCancelEdit}
                            style={{
                              flex: 'none',
                              background: 'transparent',
                              color: theme.inkFaint,
                              border: '1px solid #ddceb0',
                              borderRadius: 9,
                              padding: '9px 14px',
                              fontSize: 15,
                              cursor: 'pointer',
                            }}
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p
                        onClick={() => p.onStartEdit(qa.index)}
                        style={{
                          fontFamily: theme.fontSerif,
                          fontSize: 17,
                          lineHeight: 1.65,
                          color: '#4a4133',
                          margin: 0,
                          cursor: 'text',
                          padding: '4px 6px',
                          borderRadius: 8,
                        }}
                      >
                        {qa.a}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
