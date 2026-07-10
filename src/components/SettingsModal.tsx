import { useState } from 'react'
import { theme } from '../theme'
import { getStoredApiKey, hasEnvKey, setApiKey } from '../api/openai'

interface Props {
  onClose: () => void
  onSaved: () => void
}

export function SettingsModal({ onClose, onSaved }: Props) {
  const [value, setValue] = useState(getStoredApiKey())

  const save = () => {
    setApiKey(value)
    onSaved()
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(58,49,37,.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          background: theme.paper,
          border: `1px solid ${theme.edge}`,
          borderRadius: 22,
          padding: '32px 32px 28px',
          boxShadow: '0 30px 60px -30px rgba(80,58,24,.6)',
        }}
      >
        <h2
          style={{
            fontFamily: theme.fontSerif,
            fontWeight: 800,
            fontSize: 24,
            margin: '0 0 6px',
            color: theme.ink,
          }}
        >
          OpenAI API 키 설정
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: theme.inkFaint, margin: '0 0 20px' }}>
          질문 생성·받아쓰기·읽어주기에 사용됩니다. 키는 이 브라우저에만 저장되며 서버로
          전송되지 않습니다.
        </p>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={hasEnvKey() ? '.env 의 키를 사용 중 — 비워 두면 그대로 사용' : 'sk-...'}
          style={{
            width: '100%',
            fontSize: 17,
            padding: '13px 16px',
            border: `2px solid #e0cfa9`,
            borderRadius: 12,
            background: theme.paperBright,
            color: theme.ink,
            outline: 'none',
          }}
        />
        <p style={{ fontSize: 13, color: '#a79a83', margin: '10px 0 22px' }}>
          키는{' '}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
            platform.openai.com/api-keys
          </a>{' '}
          에서 발급할 수 있어요.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: `1px solid #ddceb0`,
              color: theme.inkSoft,
              borderRadius: 11,
              padding: '11px 20px',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            onClick={save}
            style={{
              background: theme.accent,
              border: 'none',
              color: '#fff',
              borderRadius: 11,
              padding: '11px 24px',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
