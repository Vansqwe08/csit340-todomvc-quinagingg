import { useEffect, useRef, useState } from 'react'

const filters = ['All tasks', 'In progress', 'Completed']
const subjects = ['Mathematics', 'Science', 'Reading', 'Writing', 'History', 'Other']
const focusLengths = [15, 25, 45]
const tasksStorageKey = 'daylight-study-tasks'
const statsStorageKey = 'daylight-study-stats'

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function readStoredValue(key, fallback) {
  const storedValue = localStorage.getItem(key)
  return storedValue ? JSON.parse(storedValue) : fallback
}

function Todos({ onLogout }) {
  const [text, setText] = useState('')
  const [subject, setSubject] = useState(subjects[0])
  const [dueDate, setDueDate] = useState('')
  const [filter, setFilter] = useState('All tasks')
  const [query, setQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('All subjects')
  const [todos, setTodos] = useState(() => readStoredValue(tasksStorageKey, []))
  const [focusStats, setFocusStats] = useState(() =>
    readStoredValue(statsStorageKey, { sessions: 0, minutes: 0 }),
  )
  const [focusLength, setFocusLength] = useState(25)
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60)
  const secondsRemainingRef = useRef(25 * 60)
  const [isFocusRunning, setIsFocusRunning] = useState(false)

  useEffect(() => {
    localStorage.setItem(tasksStorageKey, JSON.stringify(todos))
  }, [todos])

  useEffect(() => {
    localStorage.setItem(statsStorageKey, JSON.stringify(focusStats))
  }, [focusStats])

  useEffect(() => {
    if (!isFocusRunning) return undefined

    const timerId = window.setInterval(() => {
      const nextRemaining = Math.max(secondsRemainingRef.current - 1, 0)
      secondsRemainingRef.current = nextRemaining
      setSecondsRemaining(nextRemaining)

      if (nextRemaining === 0) {
        setIsFocusRunning(false)
        setFocusStats((stats) => ({
          sessions: stats.sessions + 1,
          minutes: stats.minutes + focusLength,
        }))
      }
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [focusLength, isFocusRunning])

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = text.trim()

    if (!trimmed) return

    setTodos((currentTodos) => [
      ...currentTodos,
      {
        id: crypto.randomUUID(),
        text: trimmed,
        subject,
        dueDate,
        completed: false,
      },
    ])
    setText('')
    setDueDate('')
  }

  function handleToggle(id) {
    setTodos((currentTodos) =>
      currentTodos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    )
  }

  function handleDelete(id) {
    setTodos((currentTodos) => currentTodos.filter((todo) => todo.id !== id))
  }

  function handleToggleAll() {
    const allCompleted = todos.length > 0 && todos.every((todo) => todo.completed)
    setTodos((currentTodos) =>
      currentTodos.map((todo) => ({ ...todo, completed: !allCompleted })),
    )
  }

  function handleClearCompleted() {
    setTodos((currentTodos) => currentTodos.filter((todo) => !todo.completed))
  }

  function selectFocusLength(minutes) {
    setFocusLength(minutes)
    secondsRemainingRef.current = minutes * 60
    setSecondsRemaining(minutes * 60)
  }

  function toggleFocusTimer() {
    if (secondsRemaining === 0) {
      secondsRemainingRef.current = focusLength * 60
      setSecondsRemaining(focusLength * 60)
    }
    setIsFocusRunning((running) => !running)
  }

  function resetFocusTimer() {
    setIsFocusRunning(false)
    secondsRemainingRef.current = focusLength * 60
    setSecondsRemaining(focusLength * 60)
  }

  const activeCount = todos.filter((todo) => !todo.completed).length
  const completedCount = todos.length - activeCount
  const completion = todos.length ? Math.round((completedCount / todos.length) * 100) : 0
  const availableSubjects = [...new Set(todos.map((todo) => todo.subject).filter(Boolean))]
  const visibleTodos = todos.filter((todo) => {
    const matchesFilter =
      filter === 'In progress'
        ? !todo.completed
        : filter === 'Completed'
          ? todo.completed
          : true

    const matchesSubject = subjectFilter === 'All subjects' || todo.subject === subjectFilter
    const searchableText = `${todo.text} ${todo.subject || ''}`.toLowerCase()

    return matchesFilter && matchesSubject && searchableText.includes(query.trim().toLowerCase())
  })
  const timerMinutes = String(Math.floor(secondsRemaining / 60)).padStart(2, '0')
  const timerSeconds = String(secondsRemaining % 60).padStart(2, '0')
  const timerProgress = (secondsRemaining / (focusLength * 60)) * 100

  const dateLabel = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  return (
    <main className="planner">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Daylight home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M16 5.5c-1.6 4.1-5.8 5-5.8 10.1a5.8 5.8 0 1 0 11.6 0C21.8 10.5 17.6 9.6 16 5.5Z" fill="currentColor" />
              <path d="M15.9 18.4c-2.6.1-4.1 1.8-4.4 4.1 2.8-.1 4.4-1.5 4.4-4.1Zm.2 0c2.6.1 4.1 1.8 4.4 4.1-2.8-.1-4.4-1.5-4.4-4.1Z" fill="#fff" />
            </svg>
          </span>
          <span>daylight<span className="brand-period">.</span></span>
        </a>
        <div className="topbar-actions">
          <div className="date-chip">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="3.1" y="4.7" width="13.8" height="12" rx="2.1" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6.5 3v3.2M13.5 3v3.2M3.3 8.2h13.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>{dateLabel}</span>
          </div>
          <button type="button" className="logout-button" onClick={onLogout}>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M8.2 4.2H5.4c-.7 0-1.2.5-1.2 1.2v9.2c0 .7.5 1.2 1.2 1.2h2.8m4-2.8 3-3-3-3m3 3H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Sign out</span>
          </button>
        </div>
      </header>

      <section className="welcome">
        <div>
          <p className="eyebrow"><span className="eyebrow-dot" /> YOUR STUDY SPACE</p>
          <h1>Small steps, <span>big learning.</span></h1>
          <p className="welcome-copy">Build a study rhythm that works for you. What will you learn today?</p>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <span className="art-sun" />
          <span className="art-orbit orbit-one" />
          <span className="art-orbit orbit-two" />
          <span className="art-leaf leaf-one" />
          <span className="art-leaf leaf-two" />
          <span className="art-leaf leaf-three" />
        </div>
      </section>

      <div className="workspace">
        <section className="task-card" aria-label="Your tasks">
          <div className="card-heading">
            <div>
              <p className="section-kicker">YOUR LEARNING PLAN</p>
              <h2>Study tasks <span className="task-total">{todos.length}</span></h2>
            </div>
            {todos.length > 0 && (
              <button
                type="button"
                className="complete-all-button"
                onClick={handleToggleAll}
                aria-label={activeCount ? 'Mark all tasks complete' : 'Mark all tasks active'}
              >
                {activeCount ? 'Complete all' : 'Undo all'}
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="m5 10 3.2 3.2L15.5 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>

          <form className="add-form" onSubmit={handleSubmit}>
            <span className="add-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none">
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </span>
            <input
              aria-label="Add a task"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="What would you like to study?"
              maxLength={180}
            />
            <button type="submit" disabled={!text.trim()}>Add task</button>
            <div className="add-options">
              <label>
                <span className="sr-only">Subject</span>
                <select value={subject} onChange={(event) => setSubject(event.target.value)} aria-label="Choose a subject">
                  {subjects.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="due-date-input">
                <span className="sr-only">Optional due date</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  aria-label="Optional due date"
                  min={getLocalDateString()}
                />
              </label>
              <span className="add-hint">Add a subject and optional due date</span>
            </div>
          </form>

          <div className="task-toolbar">
            <div className="filter-tabs" role="group" aria-label="Filter tasks">
              {filters.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={filter === option ? 'filter-tab active' : 'filter-tab'}
                  onClick={() => setFilter(option)}
                  aria-pressed={filter === option}
                >
                  {option}
                  {option === 'In progress' && activeCount > 0 && (
                    <span className="filter-count">{activeCount}</span>
                  )}
                </button>
              ))}
            </div>
            {availableSubjects.length > 1 && (
              <label className="subject-filter">
                <span className="sr-only">Filter by subject</span>
                <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} aria-label="Filter by subject">
                  <option>All subjects</option>
                  {availableSubjects.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
            )}
            {todos.length > 0 && (
              <label className="search-box">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="8.8" cy="8.8" r="5.6" stroke="currentColor" strokeWidth="1.5" />
                  <path d="m13 13 3.7 3.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  aria-label="Search tasks"
                />
              </label>
            )}
          </div>

          {visibleTodos.length > 0 ? (
            <ul className="task-list">
              {visibleTodos.map((todo) => (
                <li className={todo.completed ? 'task-item is-complete' : 'task-item'} key={todo.id}>
                  <button
                    className="task-check"
                    type="button"
                    onClick={() => handleToggle(todo.id)}
                    aria-label={todo.completed ? `Mark ${todo.text} as active` : `Complete ${todo.text}`}
                    aria-pressed={todo.completed}
                  >
                    {todo.completed && (
                      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path d="m5 10 3.2 3.2L15.5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <span className="task-content">
                    <span className="task-text">{todo.text}</span>
                    <span className="task-details">
                      {todo.subject && <span className="subject-tag">{todo.subject}</span>}
                      {todo.dueDate && (
                        <time className={todo.dueDate < getLocalDateString() && !todo.completed ? 'task-due overdue' : 'task-due'} dateTime={todo.dueDate}>
                          Due {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${todo.dueDate}T00:00:00`))}
                        </time>
                      )}
                    </span>
                  </span>
                  <button
                    className="delete-task"
                    type="button"
                    onClick={() => handleDelete(todo.id)}
                    aria-label={`Delete ${todo.text}`}
                  >
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M4.5 6.3h11M8 6.3V4.5h4v1.8m-6.1 0 .6 9.2h7l.6-9.2M8.2 9v4.2m3.6-4.2v4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <span className="empty-illustration" aria-hidden="true">
                {query || filter !== 'All tasks' ? (
                  <svg viewBox="0 0 48 48" fill="none">
                    <circle cx="21" cy="21" r="12" stroke="currentColor" strokeWidth="2.5" />
                    <path d="m30 30 9 9M16 21h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 48 48" fill="none">
                    <path d="m24 7 3.4 10.4L38 21l-10.6 3.5L24 35l-3.5-10.5L10 21l10.5-3.6L24 7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    <path d="m37 30 1.7 5.3L44 37l-5.3 1.8L37 44l-1.8-5.2L30 37l5.2-1.7L37 30ZM12 5l1.5 4.5L18 11l-4.5 1.5L12 17l-1.5-4.5L6 11l4.5-1.5L12 5Z" fill="currentColor" />
                  </svg>
                )}
              </span>
              <h3>{query || filter !== 'All tasks' ? 'Nothing to see here' : 'A fresh page'}</h3>
              <p>
                {query || filter !== 'All tasks'
                  ? 'Try another search or switch to a different filter.'
                  : 'Add your first task above and make today yours.'}
              </p>
            </div>
          )}

          {todos.length > 0 && (
            <footer className="task-footer">
              <span><strong>{activeCount}</strong> {activeCount === 1 ? 'task' : 'tasks'} left to go</span>
              {completedCount > 0 && (
                <button type="button" onClick={handleClearCompleted}>
                  Clear completed <span>({completedCount})</span>
                </button>
              )}
            </footer>
          )}
        </section>

        <aside className="sidebar">
          <section className="progress-card">
            <div className="progress-topline">
              <span className="progress-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 20s-7-3.7-7-9.2A3.8 3.8 0 0 1 12 9a3.8 3.8 0 0 1 7 1.8C19 16.3 12 20 12 20Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                  <path d="m9.2 13.2 1.8 1.8 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="progress-label">YOUR MOMENTUM</span>
            </div>
            <p className="progress-number">{completion}<span>%</span></p>
            <p className="progress-caption">
              {todos.length === 0
                ? 'Your progress starts with one small step.'
                : completedCount === todos.length
                  ? 'Everything is done. Take a well-earned breath.'
                  : `${completedCount} of ${todos.length} ${todos.length === 1 ? 'task' : 'tasks'} complete. Keep it going!`}
            </p>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Tasks completed"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completion}
            >
              <span style={{ width: `${completion}%` }} />
            </div>
            <div className="progress-legend">
              <span><i className="legend-dot done-dot" /> Done <strong>{completedCount}</strong></span>
              <span><i className="legend-dot todo-dot" /> To do <strong>{activeCount}</strong></span>
            </div>
          </section>

          <section className="focus-card" aria-label="Study focus timer">
            <div className="focus-heading">
              <div>
                <p className="section-kicker">FOCUS MODE</p>
                <h2>Study sprint</h2>
              </div>
              <span className="focus-session-count">{focusStats.sessions} done</span>
            </div>
            <div
              className="focus-timer"
              role="timer"
              aria-label={`${timerMinutes} minutes and ${timerSeconds} seconds remaining`}
              style={{ '--timer-progress': `${timerProgress}%` }}
            >
              <div className="focus-timer-inner">
                <span>{timerMinutes}:{timerSeconds}</span>
                <small>{isFocusRunning ? 'FOCUSING' : 'READY WHEN YOU ARE'}</small>
              </div>
            </div>
            <div className="focus-presets" aria-label="Focus session length">
              {focusLengths.map((minutes) => (
                <button
                  type="button"
                  key={minutes}
                  className={focusLength === minutes ? 'focus-preset active' : 'focus-preset'}
                  onClick={() => selectFocusLength(minutes)}
                  disabled={isFocusRunning}
                  aria-pressed={focusLength === minutes}
                >
                  {minutes} min
                </button>
              ))}
            </div>
            <div className="focus-actions">
              <button type="button" className="focus-start" onClick={toggleFocusTimer}>
                {isFocusRunning ? 'Pause session' : secondsRemaining === 0 ? 'Start again' : 'Start focus'}
              </button>
              <button type="button" className="focus-reset" onClick={resetFocusTimer} aria-label="Reset focus timer">
                Reset
              </button>
            </div>
            <p className="focus-total">{focusStats.minutes} focused minutes in total</p>
          </section>

          <section className="note-card">
            <span className="note-sparkle" aria-hidden="true">✳</span>
            <p className="note-label">A STUDY TIP</p>
            <p className="note-quote">“Try explaining what you’ve learned in your own words.”</p>
            <span className="note-signoff">TEACH IT TO REMEMBER IT</span>
          </section>
        </aside>
      </div>
    </main>
  )
}

export default Todos
