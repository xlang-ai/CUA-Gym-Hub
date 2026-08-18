/**
 * Design tokens for the XWS Console mock.
 *
 * Visual reference: Cloudscape Design System (the open-source design system the real
 * AWS Management Console is built on). Values below are pinned to a single Cloudscape
 * generation — the file previously mixed two generations (e.g. `#0972D3` primary blue
 * and `#000716` body text from an older release alongside `#0f141a` / `#c6c6cd` from a
 * newer one), which is a direct source of "this doesn't look like the real console".
 *
 * Rule: orange is a BRAND-ONLY color (logo mark). Every interactive element —
 * primary buttons, links, active tabs, active nav — is blue.
 */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aws: {
          // Brand (logo mark only — never for buttons or active states)
          orange: '#FF9900',
          hover: '#EC7211',

          // Navigation chrome
          squid: '#0f141a',
          nav: '#0f141a',
          dark: '#0f141a',

          // Backgrounds
          bg: '#ffffff',
          card: '#ffffff',

          // Primary interactive color
          blue: '#006ce0',
          'blue-dark': '#002b66',
          'blue-hover': '#002b66',
          'blue-active': '#002b66',
          'blue-light': '#f0fbff',
          'blue-lighter': '#d1f1ff',

          // Borders
          border: '#c6c6cd',
          'border-secondary': '#ebebf0',
          'border-input': '#8c8c94',

          // Text
          text: '#0f141a',
          'text-secondary': '#424650',
          'text-disabled': '#b4b4bb',
          'text-form-secondary': '#656871',

          // Status
          success: '#00802f',
          error: '#db0000',
          warning: '#855900',
          info: '#006ce0',

          // Status backgrounds
          'status-success-bg': '#effff1',
          'status-error-bg': '#fff5f5',
          'status-warning-bg': '#fffef0',
          'status-info-bg': '#f0fbff',

          // Disabled
          'disabled-bg': '#ebebf0',
          'disabled-border': '#b4b4bb',
        }
      },
      fontFamily: {
        // Self-hosted via @fontsource/open-sans (imported in src/index.css) so the app
        // makes no external network request at runtime.
        aws: ['"Open Sans"', '"Helvetica Neue"', 'Arial', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['Monaco', 'Menlo', 'Consolas', '"Courier New"', 'monospace'],
      },
      fontSize: {
        // Cloudscape type scale: [size, { lineHeight, fontWeight }]
        'aws-h1': ['24px', { lineHeight: '30px', fontWeight: '700' }],
        'aws-h2': ['20px', { lineHeight: '24px', fontWeight: '700' }],
        'aws-h3': ['18px', { lineHeight: '22px', fontWeight: '700' }],
        'aws-h4': ['16px', { lineHeight: '20px', fontWeight: '700' }],
        'aws-h5': ['14px', { lineHeight: '18px', fontWeight: '700' }],
        'aws-body': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'aws-small': ['12px', { lineHeight: '16px', fontWeight: '400' }],
      },
      borderRadius: {
        'aws-btn': '8px',
        'aws-input': '8px',
        'aws-tile': '8px',
        'aws-card': '16px',
        'aws-badge': '4px',
      },
      boxShadow: {
        'aws': '0 1px 1px 0 rgba(0,20,61,.05)',
        'aws-md': '0 2px 4px 0 rgba(0,20,61,.10)',
        'aws-lg': '0 4px 8px 0 rgba(0,20,61,.15)',
      }
    },
  },
  plugins: [],
}
