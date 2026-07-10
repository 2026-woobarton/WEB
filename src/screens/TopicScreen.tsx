import { theme } from '../theme'
import { TOPICS, CUSTOM_TOPIC_ID } from '../data/topics'

interface Props {
  topicId: number | null
  customTopic: string
  micNote: string
  onSelect: (id: number) => void
  onCustomChange: (v: string) => void
  onStart: () => void
  onOpenSettings: () => void
}

export function TopicScreen({
  topicId,
  customTopic,
  micNote,
  onSelect,
  onCustomChange,
  onStart,
  onOpenSettings,
}: Props) {
  const canStart =
    !!topicId && !(topicId === CUSTOM_TOPIC_ID && !customTopic.trim())

  return (
    <div
      style={{
        maxWidth: 1000,
        margin: '0 auto',
        padding: '68px 28px 80px',
        width: '100%',
        animation: 'fadeUp .5s ease',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 44, position: 'relative' }}>
        <button
          onClick={onOpenSettings}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            background: theme.paper,
            border: `1px solid ${theme.edge}`,
            color: theme.inkSoft,
            borderRadius: 10,
            padding: '8px 14px',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          ⚙ API 키
        </button>
        <div style={{ fontSize: 15, letterSpacing: 6, color: theme.accent, marginBottom: 12 }}>
          나 의 이 야 기
        </div>
        <h1
          style={{
            fontFamily: theme.fontHand,
            fontWeight: 700,
            fontSize: 66,
            lineHeight: 1.15,
            margin: '0 0 14px',
            color: theme.ink,
          }}
        >
          오늘, 자서전을 시작해요
        </h1>
        <p
          style={{
            fontSize: 21,
            lineHeight: 1.7,
            color: theme.inkSoft,
            margin: '0 auto',
            maxWidth: 620,
          }}
        >
          말씀만 들려주시면 됩니다. 제가 하나씩 여쭤보고,
          <br />
          어르신의 이야기를 한 권의 책으로 엮어 드릴게요.
        </p>
      </div>

      <div
        style={{
          background: theme.paper,
          border: `1px solid ${theme.edge}`,
          borderRadius: 22,
          padding: '34px 34px 30px',
          boxShadow: '0 18px 40px -26px rgba(90,66,30,.5)',
        }}
      >
        <h2
          style={{
            fontFamily: theme.fontSerif,
            fontWeight: 800,
            fontSize: 27,
            margin: '0 0 6px',
            color: theme.ink,
          }}
        >
          어떤 이야기부터 들려주시겠어요?
        </h2>
        <p style={{ fontSize: 17, color: theme.inkFaint, margin: '0 0 26px' }}>
          하나를 골라 주세요. 언제든 다른 주제도 이어서 담을 수 있어요.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {TOPICS.map((t) => {
            const sel = topicId === t.id
            return (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  textAlign: 'left',
                  width: '100%',
                  padding: '18px 20px',
                  borderRadius: 16,
                  cursor: 'pointer',
                  transition: 'all .18s ease',
                  background: sel ? theme.paperBright : '#f7f0e1',
                  border: `2px solid ${sel ? theme.accent : theme.edge}`,
                }}
              >
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    flex: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: theme.fontHand,
                    fontSize: 22,
                    background: sel ? theme.accent : theme.line,
                    color: sel ? '#fff' : theme.inkFaint,
                  }}
                >
                  {t.id}
                </span>
                <span
                  style={{
                    fontSize: 20,
                    lineHeight: 1.45,
                    color: theme.ink,
                    fontFamily: theme.fontSerif,
                  }}
                >
                  {t.title}
                </span>
              </button>
            )
          })}
        </div>

        {topicId === CUSTOM_TOPIC_ID && (
          <div style={{ marginTop: 18 }}>
            <label style={{ display: 'block', fontSize: 16, color: theme.inkSoft, marginBottom: 8 }}>
              담고 싶은 이야기를 적어 주세요
            </label>
            <input
              value={customTopic}
              onChange={(e) => onCustomChange(e.target.value)}
              placeholder="예) 젊은 시절 고향에서 지낸 이야기"
              style={{
                width: '100%',
                fontSize: 20,
                padding: '15px 18px',
                border: '2px solid #e0cfa9',
                borderRadius: 14,
                background: theme.paperBright,
                color: theme.ink,
                outline: 'none',
              }}
            />
          </div>
        )}

        <button
          onClick={onStart}
          disabled={!canStart}
          style={{
            width: '100%',
            marginTop: 26,
            padding: 18,
            borderRadius: 16,
            border: 'none',
            fontSize: 22,
            fontFamily: theme.fontSerif,
            fontWeight: 700,
            color: '#fff',
            background: theme.accent,
            cursor: canStart ? 'pointer' : 'not-allowed',
            opacity: canStart ? 1 : 0.45,
            transition: 'filter .15s ease',
          }}
        >
          이야기 시작하기
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: 14, color: '#a79a83', marginTop: 22 }}>
        {micNote}
      </p>
    </div>
  )
}
