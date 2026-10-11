{
  "name": "{{projectName}}",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "typecheck": "tsc -b --pretty",
    "test": "node --test",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@types/node": "^22.18.0",
    "@types/react": "^19.1.12",
    "@types/react-dom": "^19.1.9",
    "@vitejs/plugin-react": "^6.1.2",
    "eslint": "^10.12.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.7",
    "globals": "^16.3.0",
    "typescript": "^6.0.3",
    "typescript-eslint": "^8.71.1",
    "vite": "^8.3.4"
  }
}
