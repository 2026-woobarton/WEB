import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 정적 호스팅 하위 경로(GitHub Pages 등)에 올릴 경우 base 를 './' 로 두면 안전합니다.
  base: './',
})
