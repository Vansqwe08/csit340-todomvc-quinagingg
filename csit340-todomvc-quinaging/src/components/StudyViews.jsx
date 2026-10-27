import { useState } from 'react'

const weekStartsOnMonday = (date) => (date.getDay() + 6) % 7

function CalendarView({ todos, onOpenTask }) {
  const [month, setMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  })
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const leadingDays = weekStartsOnMonday(firstDay)
  const calendarDays = [
    ...Array.from({ length: leadingDays }, (_, index) => ({ key: `empty-${index}`, day: null })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1
      const date = new Date(month.getFullYear(), month.getMonth(), day)
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      return { key: dateKey, day, dateKey }
    }),
  ]
  const tasksOnSelectedDate = todos.filter((task) => task.dueDate === selectedDate)

  function changeMonth(offset) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  return (
    <section className="view-card calendar-view" aria-labelledby="calendar-title">
      <div className="view-heading">
        <div>
          <p className="section-kicker">PLAN AHEAD</p>
          <h2 id="calendar-title">Study calendar</h2>
          <p>Keep deadlines and study plans in one gentle view.</p>
        </div>
        <div className="calendar-controls">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">‹</button>
          <strong>{new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(month)}</strong>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Next month">›</button>
        </div>
      </div>
      <div className="calendar-grid" role="grid" aria-label="Study calendar">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <span className="calendar-weekday" role="columnheader" key={day}>{day}</span>
        ))}
        {calendarDays.map(({ key, day, dateKey }) => {
          if (!day) return <span className="calendar-day empty" key={key} aria-hidden="true" />
          const dueCount = todos.filter((task) => task.dueDate === dateKey).length
          const isToday = dateKey === (() => {
            const today = new Date()
            return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
          })()

          return (
            <button
              type="button"
              role="gridcell"
              key={key}
              className={`calendar-day${selectedDate === dateKey ? ' selected' : ''}${isToday ? ' today' : ''}${dueCount ? ' has-tasks' : ''}`}
              onClick={() => setSelectedDate(dateKey)}
              aria-label={`${new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric' }).format(new Date(`${dateKey}T00:00:00`))}${dueCount ? `, ${dueCount} ${dueCount === 1 ? 'task' : 'tasks'} due` : ''}`}
              aria-pressed={selectedDate === dateKey}
            >
              <span>{day}</span>
              {dueCount > 0 && <i aria-hidden="true">{dueCount}</i>}
            </button>
          )
        })}
      </div>
      <div className="calendar-agenda">
        <div className="agenda-heading">
          <div>
            <p className="section-kicker">YOUR AGENDA</p>
            <h3>{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${selectedDate}T00:00:00`))}</h3>
          </div>
          <span>{tasksOnSelectedDate.length} {tasksOnSelectedDate.length === 1 ? 'task' : 'tasks'}</span>
        </div>
        {tasksOnSelectedDate.length ? (
          <ul className="agenda-list">
            {tasksOnSelectedDate.map((task) => (
              <li key={task.id}>
                <span className="agenda-dot" />
                <span>{task.text}<small>{task.subject}</small></span>
                <button type="button" onClick={() => onOpenTask(task.id)}>Open</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="agenda-empty">Nothing scheduled for this day. A little breathing room is good, too.</p>
        )}
      </div>
    </section>
  )
}

function AnalyticsView({ todos, focusStats, streakDays }) {
  const completedTasks = todos.filter((task) => task.completed || (task.subtasks?.length && task.subtasks.every((subtask) => subtask.completed))).length
  const subjects = [...new Set(todos.map((task) => task.subject || 'Other'))].map((subject) => {
    const subjectTasks = todos.filter((task) => (task.subject || 'Other') === subject)
    return {
      subject,
      count: subjectTasks.length,
      completed: subjectTasks.filter((task) => task.completed || (task.subtasks?.length && task.subtasks.every((subtask) => subtask.completed))).length,
    }
  })

  return (
    <section className="analytics-view" aria-labelledby="analytics-title">
      <div className="view-heading">
        <div>
          <p className="section-kicker">YOUR PROGRESS</p>
          <h2 id="analytics-title">Learning, at a glance</h2>
          <p>Notice the small wins that add up over time.</p>
        </div>
      </div>
      <div className="analytics-stats">
        <article className="analytics-stat"><span>Tasks completed</span><strong>{completedTasks}<small> / {todos.length}</small></strong><i>Keep your momentum steady</i></article>
        <article className="analytics-stat"><span>Focused minutes</span><strong>{focusStats.minutes}</strong><i>{focusStats.sessions} completed focus sessions</i></article>
        <article className="analytics-stat streak-stat"><span>Current streak</span><strong>{streakDays}<small> days</small></strong><i>Every study day counts</i></article>
      </div>
      <section className="analytics-subjects" aria-labelledby="subject-progress-title">
        <div className="section-heading">
          <div><p className="section-kicker">SUBJECTS</p><h3 id="subject-progress-title">Study breakdown</h3></div>
          <span>{todos.length} total tasks</span>
        </div>
        {subjects.length ? subjects.map(({ subject, count, completed }) => (
          <div className="subject-progress-row" key={subject}>
            <div className="subject-progress-label"><strong>{subject}</strong><span>{completed}/{count} complete</span></div>
            <div className="subject-progress-track" role="progressbar" aria-label={`${subject} completion`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={count ? Math.round((completed / count) * 100) : 0}>
              <span style={{ width: `${count ? (completed / count) * 100 : 0}%` }} />
            </div>
          </div>
        )) : <p className="agenda-empty">Add a study task to start your subject breakdown.</p>}
      </section>
    </section>
  )
}

function SettingsView({ theme, onToggleTheme, name, onNameChange }) {
  return (
    <section className="view-card settings-view" aria-labelledby="settings-title">
      <div className="view-heading">
        <div>
          <p className="section-kicker">MAKE IT YOURS</p>
          <h2 id="settings-title">Settings</h2>
          <p>A few small preferences to make Daylight feel like your space.</p>
        </div>
      </div>
      <div className="settings-options">
        <label className="setting-row">
          <span><strong>Your name</strong><small>Used in your welcome message.</small></span>
          <input aria-label="Your name" value={name} onChange={(event) => onNameChange(event.target.value)} maxLength={50} placeholder="What should we call you?" />
        </label>
        <div className="setting-row">
          <span><strong>Appearance</strong><small>Choose the light level that feels right for studying.</small></span>
          <button type="button" className="setting-theme-toggle" onClick={onToggleTheme} aria-pressed={theme === 'dark'}>
            <span aria-hidden="true">{theme === 'dark' ? '☾' : '☀'}</span>
            {theme === 'dark' ? 'Dark mode' : 'Light mode'}
          </button>
        </div>
        <div className="settings-note">
          <span aria-hidden="true">✦</span>
          <p>Your tasks, focus sessions, streak, and theme are saved in this browser.</p>
        </div>
      </div>
    </section>
  )
}

export { AnalyticsView, CalendarView, SettingsView }
