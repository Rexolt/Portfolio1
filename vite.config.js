import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    base: '/Portfolio1/', // Repository name for GitHub Pages
    plugins: [
        tailwindcss(),
    ],
})
