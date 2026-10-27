import { useEffect, useState } from 'react'

const soundOptions = [
  { value: 'rain', label: 'Rain' },
  { value: 'lofi', label: 'Lo-fi hum' },
  { value: 'cafe', label: 'Café' },
]

function createNoiseBuffer(audioContext) {
  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate)
  const channel = buffer.getChannelData(0)

  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = Math.random() * 2 - 1
  }

  return buffer
}

function AmbientPlayer() {
  const [sound, setSound] = useState('rain')
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState('')
  const [audioSupported] = useState(() => Boolean(window.AudioContext || window.webkitAudioContext))

  useEffect(() => {
    if (!isPlaying) return undefined

    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext

    if (!AudioContextConstructor) return undefined

    const audioContext = new AudioContextConstructor()
    const masterGain = audioContext.createGain()
    const noise = audioContext.createBufferSource()
    const noiseFilter = audioContext.createBiquadFilter()

    noise.buffer = createNoiseBuffer(audioContext)
    noise.loop = true
    noiseFilter.type = sound === 'cafe' ? 'bandpass' : 'lowpass'
    noiseFilter.frequency.value = sound === 'rain' ? 1150 : sound === 'cafe' ? 900 : 520
    noiseFilter.Q.value = sound === 'cafe' ? 0.6 : 0.3
    noise.connect(noiseFilter)
    noiseFilter.connect(masterGain)
    masterGain.gain.value = sound === 'lofi' ? 0.035 : sound === 'cafe' ? 0.055 : 0.09
    masterGain.connect(audioContext.destination)
    noise.start()

    if (sound === 'lofi') {
      for (const frequency of [174, 261.63]) {
        const oscillator = audioContext.createOscillator()
        const oscillatorGain = audioContext.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.value = frequency
        oscillatorGain.gain.value = 0.12
        oscillator.connect(oscillatorGain)
        oscillatorGain.connect(masterGain)
        oscillator.start()
      }
    }

    audioContext.resume().catch(() => {
      setError('Could not start ambient audio. Try again after interacting with the page.')
      setIsPlaying(false)
    })

    return () => {
      audioContext.close()
    }
  }, [isPlaying, sound])

  return (
    <div className="ambient-player">
      <div className="ambient-heading">
        <div>
          <span className="ambient-label">AMBIENT SOUND</span>
          <span className="ambient-caption">A little background calm</span>
        </div>
        <button
          type="button"
          className={isPlaying ? 'ambient-toggle is-playing' : 'ambient-toggle'}
          onClick={() => {
            setError('')
            setIsPlaying((playing) => !playing)
          }}
          disabled={!audioSupported}
          aria-label={isPlaying ? 'Pause ambient sound' : 'Play ambient sound'}
          aria-pressed={isPlaying}
        >
          <span aria-hidden="true">{isPlaying ? 'Ⅱ' : '▶'}</span>
        </button>
      </div>
      <label className="ambient-select-label">
        <span className="sr-only">Ambient sound</span>
        <select value={sound} onChange={(event) => setSound(event.target.value)} aria-label="Choose ambient sound">
          {soundOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      {!audioSupported && <span className="ambient-error" role="status">Ambient audio is not supported in this browser.</span>}
      {error && <span className="ambient-error" role="status">{error}</span>}
    </div>
  )
}

export default AmbientPlayer
