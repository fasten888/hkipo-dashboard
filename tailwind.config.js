/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',   // primary
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        success: {
          50:  '#F0FDF4',
          100: '#DCFCE7',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
        },
        danger: {
          50:  '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
        },
        warning: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
        },
        info: {
          50:  '#F5F3FF',
          100: '#EDE9FE',
          500: '#8B5CF6',
          600: '#7C3AED',
        },
        neutral: {
          50:  '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        // Design system specific
        canvas:  '#F8FAFC',   // 背景色
        surface: '#FFFFFF',   // 卡片背景
        border:  '#EEF2F7',   // 边框色
      },
      boxShadow: {
        card:  '0 2px 2px rgba(16,24,40,0.04), 0 4px 12px rgba(16,24,40,0.06)',
        hover: '0 8px 24px rgba(16,24,40,0.08)',
        modal: '0 24px 80px rgba(16,24,40,0.20)',
      },
      borderRadius: {
        'card':  '16px',   // 卡片圆角
        'input': '10px',   // 输入框圆角
        'inner': '10px',   // 插入框圆角
      },
      spacing: {
        // 间距规范
        'page': '32px',    // 页面边距
        'section': '24px', // 区块间距
        'card': '16px',    // 卡片间距
        'elem': '8px',     // 元素间距
      },
      fontSize: {
        'hero':    ['48px', { lineHeight: '1', fontWeight: '700', letterSpacing: '-0.045em' }],
        'section': ['30px', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '-0.02em' }],
        'card-title': ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        'kpi':     ['36px', { lineHeight: '1', fontWeight: '700', letterSpacing: '-0.04em' }],
        'body':    ['14px', { lineHeight: '1.5' }],
        'caption': ['12px', { lineHeight: '1.4' }],
        'micro':   ['11px', { lineHeight: '1.4' }],
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
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-soft': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
