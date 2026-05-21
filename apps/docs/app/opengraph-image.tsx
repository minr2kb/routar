import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'routar – Schema-first HTTP API client'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

async function loadGeist() {
  const [regular, bold] = await Promise.all([
    fetch('https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-sans/Geist-Regular.woff2').then(
      (r) => r.arrayBuffer(),
    ),
    fetch('https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-sans/Geist-Bold.woff2').then(
      (r) => r.arrayBuffer(),
    ),
  ])
  return { regular, bold }
}

export default async function OgImage() {
  const { regular, bold } = await loadGeist()

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a35 50%, #1e1b4b 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Geist, system-ui, sans-serif',
          padding: '60px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <div
            style={{
              fontSize: '96px',
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '-4px',
              lineHeight: 1,
              fontFamily: 'Geist',
            }}
          >
            routar
          </div>
          <div
            style={{
              fontSize: '30px',
              fontWeight: 400,
              color: 'rgba(255,255,255,0.65)',
              textAlign: 'center',
              fontFamily: 'Geist',
            }}
          >
            Schema-first HTTP API client
          </div>
          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginTop: '12px',
            }}
          >
            {['End-to-end types', 'Runtime validation', 'Transport agnostic'].map((tag) => (
              <div
                key={tag}
                style={{
                  background: 'rgba(129, 140, 248, 0.15)',
                  border: '1px solid rgba(129, 140, 248, 0.3)',
                  borderRadius: '999px',
                  padding: '8px 20px',
                  fontSize: '18px',
                  fontWeight: 400,
                  color: '#a5b4fc',
                  fontFamily: 'Geist',
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Geist', data: regular, weight: 400, style: 'normal' },
        { name: 'Geist', data: bold, weight: 700, style: 'normal' },
      ],
    },
  )
}
