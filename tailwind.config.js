/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ════════════════════════════════════
           莫兰迪配色系统 (Morandi palette)
           ════════════════════════════════════ */
        brand: {
          50:  '#F8F4F1',
          100: '#EFE6E0',
          200: '#E8D9D3',
          300: '#D4B5A9',
          400: '#BFA092',
          500: '#B08B7E',   // 灰玫 — primary
          600: '#9A7468',
          700: '#7E5D53',
          800: '#5F463F',
          900: '#3F2F2A',
        },
        success: {
          50:  '#F2F5F2',
          100: '#E5EBE5',
          200: '#D9E0D9',
          300: '#B9C6B9',
          400: '#9CAD9C',
          500: '#7E9587',   // 灰绿
          600: '#677A6F',
          700: '#516159',
          800: '#3A4742',
          900: '#262F2B',
        },
        danger: {
          50:  '#F9F2F0',
          100: '#F0E0DC',
          200: '#E8D2CC',
          300: '#D2A89B',
          400: '#BF8A78',
          500: '#B08B7E',   // 复用灰玫作为危险色（莫兰迪体系无强红）
          600: '#996F5F',
          700: '#7A584C',
          800: '#5A4138',
          900: '#3A2A24',
        },
        warning: {
          50:  '#FAF6EF',
          100: '#F3EAD7',
          200: '#EFE3D2',
          300: '#E0C99F',
          400: '#CCAE7C',
          500: '#BC9A5F',   // 灰金
          600: '#9F814C',
          700: '#7D653C',
          800: '#5C4A2C',
          900: '#3B301D',
        },
        info: {
          50:  '#F5F4F7',
          100: '#E9E7EE',
          200: '#DAD7E0',
          300: '#BCB6C9',
          400: '#A29AB6',
          500: '#8E87A6',   // 灰紫
          600: '#766E8E',
          700: '#5D5670',
          800: '#433E51',
          900: '#2B2834',
        },
        neutral: {
          50:  '#FAF8F5',   // 卡片背景
          100: '#F4F1ED',   // 页面背景
          200: '#E4DFD6',   // 边框
          300: '#D2CBBF',
          400: '#A8A296',   // 次要文字
          500: '#8C8273',   // hint 文字
          600: '#736A5C',
          700: '#5A5246',
          800: '#4A4540',   // 主文字
          900: '#2E2A24',
        },
        // Design system specific aliases
        canvas:  '#F4F1ED',   // 背景色
        surface: '#FAF8F5',   // 卡片背景
        border:  '#E4DFD6',   // 边框色
      },
      boxShadow: {
        card:  '0 2px 2px rgba(74,69,64,0.04), 0 4px 12px rgba(74,69,64,0.06)',
        hover: '0 8px 24px rgba(74,69,64,0.08)',
        modal: '0 24px 80px rgba(74,69,64,0.20)',
      },
      borderRadius: {
        'card':  '16px',
        'input': '10px',
        'inner': '10px',
      },
      fontFamily: {
        sans: [
          'Inter',
          '"SF Pro Display"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'system-ui',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
