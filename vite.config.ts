import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
	base: '/',
	plugins: [react()],
	resolve: {
		alias: {
			'@api': path.resolve(__dirname, 'src/api'),
			'@assets': path.resolve(__dirname, 'src/assets'),
			'@components': path.resolve(__dirname, 'src/components'),
			'@constants': path.resolve(__dirname, 'src/constants'),
			'@pages': path.resolve(__dirname, 'src/pages'),
			'@store': path.resolve(__dirname, 'src/store'),
			'@types': path.resolve(__dirname, 'src/types/types.ts'),
			'@hooks': path.resolve(__dirname, 'src/hooks'),
			'@utils': path.resolve(__dirname, 'src/utils'),
			'@styles': path.resolve(__dirname, 'src/styles'),
		},
	},
	server: {
		port: 5000,
	},
})
