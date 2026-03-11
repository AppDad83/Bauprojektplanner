/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'apleona-navy': '#002D5A',
        'apleona-navy-dark': '#001F3F',
        'apleona-navy-light': '#003D7A',
        'apleona-red': '#E30613',
        'apleona-red-dark': '#B80510',
        'apleona-red-light': '#FF1A27',
        'apleona-gray-50': '#F8F9FA',
        'apleona-gray-100': '#F1F3F5',
        'apleona-gray-200': '#E9ECEF',
        'apleona-gray-300': '#DEE2E6',
        'apleona-gray-400': '#CED4DA',
        'apleona-gray-500': '#ADB5BD',
        'apleona-gray-600': '#6C757D',
        'apleona-gray-700': '#495057',
        'apleona-gray-800': '#343A40',
        'apleona-gray-900': '#212529',
        'status-green': '#28A745',
        'status-yellow': '#FFC107',
        'status-red': '#DC3545',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
