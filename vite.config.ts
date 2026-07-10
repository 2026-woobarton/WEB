import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  // 프로덕션 빌드에 API 키가 섞여 들어가는 것을 막습니다.
  // VITE_ 값은 번들에 평문으로 박히므로, 배포물에 키가 있으면 곧 공개된다는 뜻입니다.
  // 배포는 .env 가 없는 CI 에서 이뤄지고, 방문자가 설정창에서 자기 키를 입력합니다.
  // 노출을 감수하고 굳이 넣어야 한다면 ALLOW_EMBEDDED_KEY=1 로 빌드하세요.
  if (command === 'build' && env.VITE_OPENAI_API_KEY && !process.env.ALLOW_EMBEDDED_KEY) {
    throw new Error(
      'VITE_OPENAI_API_KEY 가 설정된 채로 프로덕션 빌드를 시도했습니다.\n' +
        '이대로 배포하면 번들에서 키를 누구나 꺼낼 수 있습니다.\n' +
        '로컬 확인용이라면 .env 를 잠시 치우거나 ALLOW_EMBEDDED_KEY=1 을 붙이세요.',
    )
  }

  return {
    plugins: [react()],
    // 정적 호스팅 하위 경로(GitHub Pages 등)에 올릴 경우 base 를 './' 로 두면 안전합니다.
    base: './',
  }
})
