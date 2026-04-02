import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Pause, Play, X } from 'lucide-react'
import { api, type CronJob } from '../../lib/api'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

type ScheduleMode = 'minutes' | 'daily' | 'weekly' | 'custom'

interface CronPanelProps {
  onClose: () => void
}

export function CronPanel({ onClose }: CronPanelProps) {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)

  // Create form state
  const [prompt, setPrompt] = useState('')
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('daily')
  const [minutes, setMinutes] = useState('30')
  const [dailyTime, setDailyTime] = useState('09:00')
  const [weeklyDay, setWeeklyDay] = useState('MON')
  const [weeklyTime, setWeeklyTime] = useState('08:00')
  const [customCron, setCustomCron] = useState('0 9 * * 1-5')
  const promptRef = useRef<HTMLTextAreaElement>(null)

  const load = async () => {
    try {
      const data = await api.cron.list()
      setJobs(data)
    } catch {
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const buildCronExpr = (): string => {
    switch (scheduleMode) {
      case 'minutes': return `*/${minutes} * * * *`
      case 'daily': {
        const [h, m] = dailyTime.split(':')
        return `${m} ${h} * * *`
      }
      case 'weekly': {
        const days: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 }
        const [h, m] = weeklyTime.split(':')
        return `${m} ${h} * * ${days[weeklyDay]}`
      }
      case 'custom': return customCron
    }
  }

  const handleCreate = async () => {
    if (!prompt.trim()) return
    try {
      const job = await api.cron.create(prompt.trim(), buildCronExpr())
      setJobs((j) => [job, ...j])
      setShowCreate(false)
      setPrompt('')
    } catch (e) {
      alert('Failed to create task. Check bridge logs.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this scheduled task?')) return
    try {
      await api.cron.delete(id)
      setJobs((j) => j.filter((job) => job.id !== id))
    } catch {}
  }

  const handlePauseResume = async (job: CronJob) => {
    try {
      if (job.active) {
        await api.cron.pause(job.id)
      } else {
        await api.cron.resume(job.id)
      }
      setJobs((j) => j.map((jj) => jj.id === job.id ? { ...jj, active: !jj.active } : jj))
    } catch {}
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-bright)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    fontSize: 12,
    fontFamily: "'Geist', sans-serif",
    padding: '6px 8px',
    outline: 'none',
    width: '100%',
  }

  return (
    <div
      style={{
        width: 280,
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 12px 8px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ flex: 1, color: 'var(--accent-gold)', fontSize: 13, fontWeight: 600, fontFamily: "'Geist Mono', monospace" }}>
          Scheduled Tasks
        </span>
        <button
          onClick={() => setShowCreate(true)}
          title="New task"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-gold)', display: 'flex', padding: 2 }}
        >
          <Plus size={15} />
        </button>
        <button
          onClick={onClose}
          title="Close"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Job list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {loading && (
          <p style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', padding: 12, fontFamily: "'Geist Mono', monospace" }}>
            loading…
          </p>
        )}
        {!loading && jobs.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', padding: 12, fontFamily: "'Geist Mono', monospace" }}>
            no scheduled tasks yet
          </p>
        )}
        {jobs.map((job) => (
          <div
            key={job.id}
            style={{
              background: 'var(--bg-elevated)',
              borderLeft: `2px solid ${job.active ? 'var(--accent-gold)' : 'var(--text-muted)'}`,
              borderRadius: 6,
              padding: '8px 10px',
              marginBottom: 6,
              opacity: job.active ? 1 : 0.6,
            }}
          >
            {/* Prompt */}
            <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.4 }}>
              {job.prompt.length > 60 ? job.prompt.slice(0, 60) + '…' : job.prompt}
            </div>

            {/* Schedule */}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Geist Mono', monospace", marginBottom: 6 }}>
              {job.schedule_human || job.schedule}
            </div>

            {/* Last run */}
            {job.last_run && (
              <div style={{ fontSize: 10, color: job.last_status === 'success' ? 'var(--status-success)' : 'var(--status-error)', marginBottom: 6 }}>
                {job.last_status === 'success' ? '✓' : '✗'} {timeAgo(job.last_run)}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => handlePauseResume(job)}
                title={job.active ? 'Pause' : 'Resume'}
                style={{ background: 'none', border: '1px solid var(--border-bright)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 6px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                {job.active ? <><Pause size={10} /> pause</> : <><Play size={10} /> resume</>}
              </button>
              <button
                onClick={() => handleDelete(job.id)}
                title="Delete"
                style={{ background: 'none', border: '1px solid var(--border-bright)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 6px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--status-error)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
              >
                <Trash2 size={10} /> delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-bright)',
            borderRadius: 10,
            padding: 20,
            width: 320,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}>
            <div style={{ color: 'var(--accent-gold)', fontWeight: 600, fontSize: 14, fontFamily: "'Geist Mono', monospace" }}>
              New Scheduled Task
            </div>

            {/* Prompt */}
            <div>
              <label style={{ color: 'var(--text-secondary)', fontSize: 11, display: 'block', marginBottom: 6 }}>Task prompt</label>
              <textarea
                ref={promptRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What should Hermes do?"
                rows={3}
                style={{ ...inputStyle, resize: 'none' }}
                autoFocus
              />
            </div>

            {/* Schedule mode */}
            <div>
              <label style={{ color: 'var(--text-secondary)', fontSize: 11, display: 'block', marginBottom: 8 }}>Schedule</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(['minutes', 'daily', 'weekly', 'custom'] as ScheduleMode[]).map((mode) => (
                  <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12 }}>
                    <input
                      type="radio"
                      name="scheduleMode"
                      checked={scheduleMode === mode}
                      onChange={() => setScheduleMode(mode)}
                      style={{ accentColor: 'var(--accent-gold)' }}
                    />
                    {mode === 'minutes' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        Every
                        <input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} min="5" max="1440"
                          style={{ ...inputStyle, width: 60 }} disabled={scheduleMode !== 'minutes'} />
                        minutes
                      </span>
                    )}
                    {mode === 'daily' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        Daily at
                        <input type="time" value={dailyTime} onChange={(e) => setDailyTime(e.target.value)}
                          style={{ ...inputStyle, width: 100 }} disabled={scheduleMode !== 'daily'} />
                      </span>
                    )}
                    {mode === 'weekly' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        Every
                        <select value={weeklyDay} onChange={(e) => setWeeklyDay(e.target.value)}
                          style={{ ...inputStyle, width: 80 }} disabled={scheduleMode !== 'weekly'}>
                          {['MON','TUE','WED','THU','FRI','SAT','SUN'].map((d) => <option key={d}>{d}</option>)}
                        </select>
                        at
                        <input type="time" value={weeklyTime} onChange={(e) => setWeeklyTime(e.target.value)}
                          style={{ ...inputStyle, width: 100 }} disabled={scheduleMode !== 'weekly'} />
                      </span>
                    )}
                    {mode === 'custom' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        Cron expr
                        <input type="text" value={customCron} onChange={(e) => setCustomCron(e.target.value)}
                          style={{ ...inputStyle, width: 120, fontFamily: "'Geist Mono', monospace" }} disabled={scheduleMode !== 'custom'} />
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: '1px solid var(--border-bright)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)', padding: '6px 14px', fontSize: 13 }}>
                Cancel
              </button>
              <button onClick={handleCreate} disabled={!prompt.trim()} style={{ background: prompt.trim() ? 'var(--accent-gold)' : 'var(--bg-hover)', border: 'none', borderRadius: 6, cursor: prompt.trim() ? 'pointer' : 'not-allowed', color: prompt.trim() ? '#000' : 'var(--text-muted)', padding: '6px 14px', fontSize: 13, fontWeight: 600 }}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
