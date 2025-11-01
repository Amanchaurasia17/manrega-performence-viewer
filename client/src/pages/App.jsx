import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { translations, detectLocale } from '../i18n'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

function SimpleChart({ series }) {
  if (!series || series.length === 0) return <div className="chart-empty">No data</div>
  
  const max = Math.max(...series.map(s => s.metric))
  const min = Math.min(...series.map(s => s.metric))
  
  return (
    <div>
      <svg className="chart" viewBox="0 0 100 30" preserveAspectRatio="none">
        {series.map((s, i) => {
          const x = (i / Math.max(series.length - 1, 1)) * 100
          const y = 30 - (s.metric / max) * 28
          return <circle key={i} cx={x} cy={y} r="2" fill="#2b6cb0" />
        })}
        <polyline
          fill="none"
          stroke="#2b6cb0"
          strokeWidth="0.5"
          points={series.map((s, i) => `${(i / Math.max(series.length - 1, 1)) * 100},${30 - (s.metric / max) * 28}`).join(' ')}
        />
      </svg>
      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#666', marginTop: '5px'}}>
        <span>{series[0]?.month}</span>
        <span>{series[series.length - 1]?.month}</span>
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold', marginTop: '5px'}}>
        <span>Min: {min.toLocaleString()}</span>
        <span>Max: {max.toLocaleString()}</span>
      </div>
    </div>
  )
}

export default function App(){
  const [lang, setLang] = useState(detectLocale())
  const [districts, setDistricts] = useState([])
  const [selected, setSelected] = useState(null)
  const [compareDistricts, setCompareDistricts] = useState([])
  const [message, setMessage] = useState('')
  const [view, setView] = useState('main')
  const [autoDetecting, setAutoDetecting] = useState(false)

  const t = translations[lang]

  useEffect(() => {
    axios.get(`${API_BASE}/districts`).then(r => setDistricts(r.data)).catch(e => setMessage('Failed to load'))
  }, [])

  useEffect(() => {
    if (districts.length > 0 && !selected && !autoDetecting) {
      setAutoDetecting(true)
      pickByGeo(true)
    }
  }, [districts])

  // Load comparison districts when entering compare view
  useEffect(() => {
    if (view === 'compare' && selected && compareDistricts.length === 0) {
      const nearbyBasic = districts.filter(d => d.slug !== selected.slug).slice(0, 3)
      Promise.all(nearbyBasic.map(d => axios.get(`${API_BASE}/districts/${d.slug}`)))
        .then(responses => setCompareDistricts(responses.map(r => r.data)))
        .catch(err => console.error('Failed to load comparison districts', err))
    }
  }, [view, selected])

  // Function to fetch full district details including series data
  async function selectDistrict(slug) {
    try {
      const response = await axios.get(`${API_BASE}/districts/${slug}`)
      setSelected(response.data)
    } catch (error) {
      setMessage('Failed to load district details')
      console.error('Error loading district:', error)
    }
  }

  function pickByGeo(silent = false){
    if (!silent) setMessage(t.detectingLocation)
    if (!navigator.geolocation) { 
      setMessage('Geolocation not supported')
      setAutoDetecting(false)
      return 
    }
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords
      const found = districts.find(d => {
        if (!d.bbox || d.bbox.length !== 4) return false
        const [w,s,e,n] = d.bbox
        return longitude >= w && longitude <= e && latitude >= s && latitude <= n
      })
      if (found) {
        selectDistrict(found.slug)
        setMessage(silent ? '' : t.locationDetected + ': ' + found.district)
      } else {
        setMessage(silent ? '' : 'Could not identify district from location')
      }
      setAutoDetecting(false)
    }, err => {
      setMessage(silent ? '' : 'Permission denied or geolocation error')
      setAutoDetecting(false)
    })
  }

  function speak(text) {
    if (!window.speechSynthesis) return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US'
    window.speechSynthesis.speak(utterance)
  }

  function renderMain() {
    if (selected) {
      const latest = (selected.series && selected.series[selected.series.length-1]?.metric) ?? 0
      const performance = latest > 14000 ? t.performanceGood : latest > 10000 ? t.performanceFair : t.performancePoor
      const pictValue = latest > 0 ? Math.min((latest / 16000) * 100, 100) : 0
      return (
        <section className="card">
          <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px'}}>
            <label style={{fontSize: '18px', fontWeight: 'bold'}}>{t.district}:</label>
            <select 
              value={selected.slug} 
              onChange={e => selectDistrict(e.target.value)}
              style={{
                padding: '10px 15px',
                fontSize: '18px',
                border: '2px solid #2b6cb0',
                borderRadius: '8px',
                flex: 1,
                cursor: 'pointer'
              }}
            >
              {districts.map(d => <option key={d.slug} value={d.slug}>{d.district}</option>)}
            </select>
            <button className="audio-btn" onClick={() => speak(selected.district)}>🔊</button>
          </div>
          <div className="kpi">
            <strong>{t.latestJobs}: {latest}</strong>
            <button className="audio-btn" onClick={() => speak(`${t.latestJobs}: ${latest} ${t.personDays}`)}>🔊</button>
          </div>
          <p className="sub">{t.personDays}</p>
          <div className="perf-badge">{performance}</div>

          <h3>{t.outOf100}</h3>
          <div className="pict-small">
            {Array.from({length:10}).map((_,i) => (
              <span key={i} className={i < Math.round(pictValue/10) ? 'icon-filled' : 'icon-empty'}>👤</span>
            ))}
          </div>
          <p className="sub">{Math.round(pictValue)} {t.gotWork}</p>

          <h3>{t.trend}</h3>
          {selected.series && selected.series.length > 1 && (() => {
            const firstMetric = selected.series[0]?.metric || 0
            const lastMetric = selected.series[selected.series.length - 1]?.metric || 0
            const change = lastMetric - firstMetric
            const percentChange = firstMetric > 0 ? ((change / firstMetric) * 100).toFixed(1) : 0
            const trendIcon = change > 0 ? '📈' : change < 0 ? '📉' : '➡️'
            const trendColor = change > 0 ? '#48bb78' : change < 0 ? '#f56565' : '#718096'
            return (
              <div style={{marginBottom: '10px', padding: '10px', background: '#f7fafc', borderRadius: '8px'}}>
                <span style={{fontSize: '24px'}}>{trendIcon}</span>
                <span style={{marginLeft: '10px', fontSize: '18px', fontWeight: 'bold', color: trendColor}}>
                  {change > 0 ? '+' : ''}{change.toLocaleString()} ({percentChange}%)
                </span>
              </div>
            )
          })()}
          <SimpleChart series={selected.series} />

          <div className="actions">
            <button className="btn-large" onClick={() => setView('compare')}>{t.compare}</button>
            <button className="btn-large" onClick={() => setView('history')}>📅 {lang === 'hi' ? 'पिछला डेटा' : 'View History'}</button>
            <button className="btn-large" onClick={() => setView('help')}>{t.help}</button>
          </div>
        </section>
      )
    }

    return (
      <div className="landing">
        {autoDetecting && <div className="message">{t.detectingLocation}</div>}
        <button className="geo" onClick={() => pickByGeo()}>{t.useMyLocation}</button>
        <p className="or">{t.or}</p>
        <select onChange={e => e.target.value && selectDistrict(e.target.value)}>
          <option value="">{t.selectDistrict}</option>
          {districts.map(d => <option key={d.slug} value={d.slug}>{d.district}</option>)}
        </select>
        <div className="grid">
          {districts.map(d => (
            <div key={d.slug} className="tile" onClick={() => selectDistrict(d.slug)}>
              <strong>{d.district}</strong>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderHistory() {
    if (!selected || !selected.series) return null
    
    // Sort series by date (most recent first)
    const sortedSeries = [...selected.series].reverse()
    
    return (
      <section className="card">
        <button className="back-btn" onClick={() => setView('main')}>{t.back}</button>
        <h2>📅 {lang === 'hi' ? 'पिछला डेटा' : 'Historical Data'} - {selected.district}</h2>
        <button className="audio-btn" onClick={() => speak(`${lang === 'hi' ? 'पिछला डेटा' : 'Historical Data'} for ${selected.district}`)}>🔊</button>
        
        <div style={{marginTop: '20px'}}>
          {sortedSeries.map((item, index) => {
            const prevItem = sortedSeries[index + 1]
            const change = prevItem ? item.metric - prevItem.metric : 0
            const changePercent = prevItem && prevItem.metric > 0 ? ((change / prevItem.metric) * 100).toFixed(1) : 0
            const isLatest = index === 0
            
            return (
              <div 
                key={index} 
                style={{
                  padding: '15px',
                  marginBottom: '10px',
                  background: isLatest ? '#ebf8ff' : '#f7fafc',
                  border: isLatest ? '2px solid #2b6cb0' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  position: 'relative'
                }}
              >
                {isLatest && (
                  <span style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: '#2b6cb0',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {lang === 'hi' ? 'नवीनतम' : 'Latest'}
                  </span>
                )}
                
                <div style={{fontSize: '16px', fontWeight: 'bold', color: '#2d3748', marginBottom: '8px'}}>
                  {item.month}
                </div>
                
                <div style={{fontSize: '24px', fontWeight: 'bold', color: '#2b6cb0', marginBottom: '8px'}}>
                  {item.metric.toLocaleString()} {lang === 'hi' ? 'नौकरियां' : 'jobs'}
                </div>
                
                {prevItem && (
                  <div style={{fontSize: '14px', color: change >= 0 ? '#48bb78' : '#f56565'}}>
                    {change >= 0 ? '↑' : '↓'} {Math.abs(change).toLocaleString()} 
                    ({change >= 0 ? '+' : ''}{changePercent}%) 
                    {lang === 'hi' ? ' पिछले महीने से' : ' from previous month'}
                  </div>
                )}
                
                {!prevItem && (
                  <div style={{fontSize: '14px', color: '#718096'}}>
                    {lang === 'hi' ? 'कोई पिछला डेटा नहीं' : 'No previous data'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  function renderCompare() {
    if (!selected) return null
    
    const myLatest = (selected.series && selected.series[selected.series.length-1]?.metric) ?? 0
    return (
      <section className="card">
        <button className="back-btn" onClick={() => setView('main')}>{t.back}</button>
        <h2>{t.compareTitle} <button className="audio-btn" onClick={() => speak(t.compareTitle)}>🔊</button></h2>
        <div className="compare-row">
          <div className="compare-item">
            <strong>{selected.district}</strong>
            <div className="bar" style={{width: '100%', background: '#2b6cb0'}}>{myLatest}</div>
          </div>
          {compareDistricts.map(d => {
            const dLatest = (d.series && d.series[d.series.length-1]?.metric) ?? 0
            const width = myLatest > 0 ? (dLatest / myLatest) * 100 : 0
            return (
              <div key={d.slug} className="compare-item">
                <strong>{d.district}</strong>
                <div className="bar" style={{width: `${Math.min(width, 100)}%`, background: '#68d391'}}>{dLatest}</div>
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  function renderHelp() {
    return (
      <section className="card">
        <button className="back-btn" onClick={() => setView('main')}>{t.back}</button>
        <h2>{t.helpTitle} <button className="audio-btn" onClick={() => speak(t.helpTitle)}>🔊</button></h2>
        <div className="faq">
          <div className="faq-item">
            <h3>{t.faq1Q} <button className="audio-btn" onClick={() => speak(t.faq1Q + '. ' + t.faq1A)}>🔊</button></h3>
            <p>{t.faq1A}</p>
          </div>
          <div className="faq-item">
            <h3>{t.faq2Q} <button className="audio-btn" onClick={() => speak(t.faq2Q + '. ' + t.faq2A)}>🔊</button></h3>
            <p>{t.faq2A}</p>
          </div>
          <div className="faq-item">
            <h3>{t.faq3Q} <button className="audio-btn" onClick={() => speak(t.faq3Q + '. ' + t.faq3A)}>🔊</button></h3>
            <p>{t.faq3A}</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <div className="app">
      <header>
        <h1>{t.title}</h1>
        <p className="sub">{t.subtitle}</p>
        <div className="lang-switch">
          <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>English</button>
          <button className={lang === 'hi' ? 'active' : ''} onClick={() => setLang('hi')}>हिंदी</button>
        </div>
      </header>

      {message && <div className="message">{message}</div>}

      <main>
        {view === 'main' && renderMain()}
        {view === 'compare' && renderCompare()}
        {view === 'history' && renderHistory()}
        {view === 'help' && renderHelp()}
      </main>
      <footer>{t.dataSource}</footer>
    </div>
  )
}
