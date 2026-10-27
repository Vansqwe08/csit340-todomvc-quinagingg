import { useEffect, useRef, useState } from 'react'

function StudyTaskDrawer({ task, onClose, onDelete, onUpdateSubtasks }) {
  const [subtaskText, setSubtaskText] = useState('')
  const closeButtonRef = useRef(null)
  const subtasks = task.subtasks || []
  const completedSubtasks = subtasks.filter((subtask) => subtask.completed).length
  const progress = subtasks.length ? Math.round((completedSubtasks / subtasks.length) * 100) : 0

  useEffect(() => {
    closeButtonRef.current?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function addSubtask(event) {
    event.preventDefault()
    const text = subtaskText.trim()

    if (!text) return

    onUpdateSubtasks(task.id, (current) => [
      ...current,
      { id: crypto.randomUUID(), text, completed: false },
    ])
    setSubtaskText('')
  }

  function toggleSubtask(subtaskId) {
    onUpdateSubtasks(task.id, (current) =>
      current.map((subtask) =>
        subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask,
      ),
    )
  }

  function deleteSubtask(subtaskId) {
    onUpdateSubtasks(task.id, (current) => current.filter((subtask) => subtask.id !== subtaskId))
  }

  return (
    <div className="drawer-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <aside className="task-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div className="drawer-topline">
          <span className="drawer-kicker">STUDY TASK</span>
          <button ref={closeButtonRef} type="button" className="drawer-close" onClick={onClose} aria-label="Close task details">
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="drawer-title-row">
          <span className={task.completed ? 'drawer-status complete' : 'drawer-status'} aria-hidden="true">
            {task.completed ? '✓' : '•'}
          </span>
          <div>
            <h2 id="drawer-title">{task.text}</h2>
            <p>{task.subject || 'Study task'}{task.dueDate ? ` · Due ${new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric' }).format(new Date(`${task.dueDate}T00:00:00`))}` : ''}</p>
          </div>
        </div>

        <section className="subtask-section" aria-labelledby="subtasks-title">
          <div className="subtask-heading">
            <div>
              <p className="section-kicker">MAKE IT MANAGEABLE</p>
              <h3 id="subtasks-title">Checklist <span>{completedSubtasks}/{subtasks.length}</span></h3>
            </div>
            <strong>{progress}%</strong>
          </div>
          <div className="subtask-progress" role="progressbar" aria-label="Checklist progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <span style={{ width: `${progress}%` }} />
          </div>

          <form className="subtask-form" onSubmit={addSubtask}>
            <input
              value={subtaskText}
              onChange={(event) => setSubtaskText(event.target.value)}
              placeholder="Add a small next step..."
              maxLength={140}
              aria-label="New checklist item"
            />
            <button type="submit" disabled={!subtaskText.trim()}>Add</button>
          </form>

          {subtasks.length ? (
            <ul className="subtask-list">
              {subtasks.map((subtask) => (
                <li className={subtask.completed ? 'subtask-item is-complete' : 'subtask-item'} key={subtask.id}>
                  <label>
                    <input type="checkbox" checked={subtask.completed} onChange={() => toggleSubtask(subtask.id)} />
                    <span>{subtask.text}</span>
                  </label>
                  <button type="button" onClick={() => deleteSubtask(subtask.id)} aria-label={`Delete ${subtask.text}`}>×</button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="subtask-empty">Break this task into a few small, satisfying steps.</p>
          )}
        </section>

        <div className="drawer-footer">
          <span>{task.completed ? 'Task complete — nice work.' : 'One small step at a time.'}</span>
          <button type="button" onClick={() => onDelete(task.id)}>Delete task</button>
        </div>
      </aside>
    </div>
  )
}

export default StudyTaskDrawer
