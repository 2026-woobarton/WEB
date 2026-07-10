# 나의 이야기 · AI 자서전 (React + TypeScript)

음성으로 답하면 AI가 다음 질문을 이어가고, 모은 이야기를 한 권의 자서전으로 엮어 주는 웹 앱입니다.
시니어(60대 이상) 사용을 염두에 두고 큰 글씨·큰 버튼·따뜻한 손편지 톤으로 디자인했습니다.

## 흐름

1. **분야 선택** — 8개 주제(8번은 직접 입력) 중 선택
2. **대화** — AI가 질문 → 음성으로 읽어줌(TTS) → 사용자가 녹음 → 받아쓰기(Whisper) → 수정 → 다음 질문 반복. 오른쪽에 대화 내역이 쌓이고 답변을 눌러 언제든 수정
3. **자서전** — 모은 이야기를 5개 챕터의 1인칭 자서전으로 생성, 책처럼 페이지 넘김 · 인쇄/PDF 저장

## 사용하는 OpenAI API

| 용도 | 엔드포인트 | 모델 |
| --- | --- | --- |
| 질문 생성 | `chat/completions` | `gpt-4o-mini` |
| 자서전 작성 | `chat/completions` | `gpt-4o` |
| 받아쓰기 | `audio/transcriptions` | `whisper-1` |
| 읽어주기 | `audio/speech` | `tts-1` (voice: nova) |

## API 키 입력

앱 실행 후 우측 상단 **⚙ API 키** 버튼에서 입력합니다.
키는 브라우저 `localStorage` 에만 저장되고 서버로 전송되지 않습니다.
`platform.openai.com/api-keys` 에서 발급하세요.

> ⚠️ 브라우저에서 OpenAI 를 직접 호출하므로 키가 클라이언트에 노출됩니다.
> 개인용/시연용에는 괜찮지만, 불특정 다수에게 공개하는 서비스라면
> 키를 감추는 서버(서버리스 함수 등)를 두고 그쪽을 호출하도록 `src/api/openai.ts` 를 바꾸세요.

## 로컬 실행

```bash
cd autobio-react
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속.

## 빌드 & 배포

```bash
npm run build     # dist/ 생성
npm run preview   # 빌드 결과 미리보기
```

`dist/` 폴더를 정적 호스팅에 올리면 됩니다.

- **Netlify**: `dist/` 를 Netlify Drop 에 드래그&드롭
- **Vercel**: 저장소 연결 후 프레임워크 Vite 자동 인식
- **GitHub Pages**: `dist/` 내용을 배포 (하위 경로 배포 시 `vite.config.ts` 의 `base` 확인)

## 폴더 구조

```
autobio-react/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
└─ src/
   ├─ main.tsx            앱 진입점
   ├─ App.tsx             상태·흐름 오케스트레이션
   ├─ index.css           리셋·폰트·키프레임
   ├─ theme.ts            색/서체 토큰
   ├─ types.ts            공용 타입
   ├─ data/topics.ts      분야 목록
   ├─ api/
   │  ├─ openai.ts        OpenAI 호출(Chat/Whisper/TTS) + 키 관리
   │  └─ autobio.ts       프롬프트 & 자서전 JSON 파싱
   ├─ hooks/useRecorder.ts  MediaRecorder 녹음 훅
   ├─ components/SettingsModal.tsx
   └─ screens/
      ├─ TopicScreen.tsx
      ├─ ChatScreen.tsx
      └─ BookScreen.tsx
```

## 참고

- 녹음은 마이크 권한이 필요하며 **HTTPS(또는 localhost)** 에서만 동작합니다. 배포 시 https 호스팅을 쓰세요.
- 녹음이 지원되지 않는 환경에서는 답변을 직접 입력할 수 있습니다.
