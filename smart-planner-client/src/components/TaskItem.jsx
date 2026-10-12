import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  ChevronDown,
  Layers,
  Video,
  BookOpen,
  RotateCcw,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export default function TaskItem({
  session,
  onToggle,
  onUpdateChecklist,
  loading = false,
}) {
  const {
    id,
    subject,
    time,
    duration,
    priority,
    note,
    is_completed,
    checklist = {},
  } = session;

  const [expanded, setExpanded] = useState(false);
  const nav = useNavigate();

  const flashcardGame = Boolean(checklist.flashcard_game);
  const youtubeVideos = Math.max(0, Math.min(3, Number(checklist.youtube_videos || 0)));
  const readNotes = Boolean(checklist.read_notes);

  const completedCount =
    (flashcardGame ? 1 : 0) +
    (youtubeVideos >= 3 ? 1 : 0) +
    (readNotes ? 1 : 0);

  const pct = Math.round((completedCount / 3) * 100);

  const handleToggleFlashcard = (e) => {
    e.stopPropagation();
    if (loading) return;
    onUpdateChecklist?.(id, { flashcard_game: !flashcardGame });
  };

  const handleSetYoutube = (count, e) => {
    e.stopPropagation();
    if (loading) return;
    const nextVal = youtubeVideos === count ? count - 1 : count;
    onUpdateChecklist?.(id, { youtube_videos: nextVal });
  };

  const handleToggleNotes = (e) => {
    e.stopPropagation();
    if (loading) return;
    onUpdateChecklist?.(id, { read_notes: !readNotes });
  };

  const handleQuickComplete = (e) => {
    e.stopPropagation();
    if (loading) return;
    onToggle?.(id);
  };

  return (
    <div
      style={{
        borderRadius: 8,
        transition: 'all 0.2s ease',
        background: expanded ? 'rgba(0,0,0,0.02)' : 'transparent',
        borderLeft: is_completed ? '3px solid var(--success)' : '3px solid transparent',
      }}
    >
      {/* ── Summary Row ── */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 6px',
          cursor: loading ? 'wait' : 'pointer',
          background: is_completed ? 'rgba(61,155,106,0.05)' : 'transparent',
          borderRadius: 6,
          userSelect: 'none',
          transition: 'background 0.15s',
        }}
      >
        {/* Main Checkbox / Indicator */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (is_completed) {
              onToggle?.(id);
            } else {
              setExpanded(!expanded);
            }
          }}
          title={is_completed ? 'Click to unmark completion' : 'Click to open checklist'}
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            border: `2px solid ${is_completed ? 'var(--success)' : completedCount > 0 ? 'var(--teal)' : 'var(--border)'}`,
            background: is_completed ? 'var(--success)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 700,
            color: 'white',
            transition: 'all 0.2s',
            cursor: 'pointer',
          }}
        >
          {is_completed ? '✓' : completedCount > 0 ? (
            <span style={{ fontSize: 9, color: 'var(--teal)', fontWeight: 700 }}>
              {completedCount}
            </span>
          ) : null}
        </div>

        {/* Time */}
        <span
          className="mono"
          style={{ fontSize: 11, color: 'var(--muted)', width: 44, flexShrink: 0 }}
        >
          {time}
        </span>

        {/* Subject & Note */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text)',
              textDecoration: is_completed ? 'line-through' : 'none',
              opacity: is_completed ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
          >
            {subject}
          </span>
          {note && (
            <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>
              · {note}
            </span>
          )}
        </div>

        {/* Checklist Progress Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 600,
            background: is_completed
              ? 'rgba(47,158,105,0.12)'
              : completedCount > 0
              ? 'rgba(201,125,26,0.12)'
              : 'rgba(0,0,0,0.05)',
            color: is_completed
              ? 'var(--success)'
              : completedCount > 0
              ? 'var(--warning)'
              : 'var(--muted)',
            flexShrink: 0,
          }}
        >
          {is_completed ? '✓ 3/3' : `📋 ${completedCount}/3`}
        </div>

        {/* Duration */}
        <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>
          {duration}m
        </span>

        {/* Priority Badge */}
        <span className={`badge badge-${priority}`} style={{ flexShrink: 0 }}>
          {priority}
        </span>

        {/* Expand Chevron */}
        <div
          style={{
            color: 'var(--muted)',
            display: 'flex',
            alignItems: 'center',
            transition: 'transform 0.2s ease',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            padding: 2,
          }}
        >
          <ChevronDown size={15} />
        </div>
      </div>

      {/* ── Expandable Checklist Tray ── */}
      {expanded && (
        <div
          style={{
            margin: '4px 6px 10px 32px',
            padding: '12px 14px',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          {/* Tray Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              paddingBottom: 8,
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '0.8px',
                  fontWeight: 700,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                }}
              >
                Session Completion Checklist
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                Complete all 3 conditions to finish this study block:
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: is_completed ? 'var(--success)' : 'var(--text)',
                }}
              >
                {completedCount}/3 Done ({pct}%)
              </span>
              <div
                style={{
                  width: 80,
                  height: 4,
                  background: 'var(--light)',
                  borderRadius: 2,
                  marginTop: 4,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: is_completed ? 'var(--success)' : 'var(--teal)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Checklist Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Condition 1: Flashcard Game */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: 6,
                background: flashcardGame ? 'rgba(61,155,106,0.08)' : 'var(--card-alt)',
                border: `1px solid ${flashcardGame ? 'rgba(61,155,106,0.3)' : 'var(--border)'}`,
                transition: 'all 0.15s',
              }}
            >
              <div
                onClick={handleToggleFlashcard}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: `2px solid ${flashcardGame ? 'var(--success)' : 'var(--border)'}`,
                    background: flashcardGame ? 'var(--success)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {flashcardGame ? '✓' : ''}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Layers size={13} color={flashcardGame ? 'var(--success)' : 'var(--teal)'} />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text)',
                        textDecoration: flashcardGame ? 'line-through' : 'none',
                      }}
                    >
                      1. Flashcard Game
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                    Play or review flashcard deck
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nav('/notes');
                }}
                className="btn btn-sm"
                style={{
                  padding: '3px 8px',
                  fontSize: 10,
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--teal)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                }}
              >
                Play Flashcards <ExternalLink size={10} />
              </button>
            </div>

            {/* Condition 2: Watch 3 YouTube Videos */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: 6,
                background: youtubeVideos >= 3 ? 'rgba(61,155,106,0.08)' : 'var(--card-alt)',
                border: `1px solid ${youtubeVideos >= 3 ? 'rgba(61,155,106,0.3)' : 'var(--border)'}`,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Video size={13} color={youtubeVideos >= 3 ? 'var(--success)' : '#E06020'} />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text)',
                      textDecoration: youtubeVideos >= 3 ? 'line-through' : 'none',
                    }}
                  >
                    2. Watch 3 YouTube Videos
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: youtubeVideos >= 3 ? 'var(--success)' : 'var(--muted)',
                      fontWeight: 600,
                    }}
                  >
                    ({youtubeVideos}/3)
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, marginBottom: 6 }}>
                  Watch 3 educational videos or AI video summaries
                </div>

                {/* 3 Interactive Video Checkpoints */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 2, 3].map((vNum) => {
                    const isWatched = youtubeVideos >= vNum;
                    return (
                      <button
                        key={vNum}
                        type="button"
                        onClick={(e) => handleSetYoutube(vNum, e)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: `1px solid ${isWatched ? 'var(--success)' : 'var(--border)'}`,
                          background: isWatched ? 'var(--success)' : 'var(--card)',
                          color: isWatched ? 'white' : 'var(--text)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          transition: 'all 0.15s',
                        }}
                      >
                        {isWatched ? '✓' : ''} Video {vNum}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nav('/notes');
                }}
                className="btn btn-sm"
                style={{
                  padding: '3px 8px',
                  fontSize: 10,
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--teal)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  marginLeft: 8,
                }}
              >
                Summarizer <ExternalLink size={10} />
              </button>
            </div>

            {/* Condition 3: Read Notes */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: 6,
                background: readNotes ? 'rgba(61,155,106,0.08)' : 'var(--card-alt)',
                border: `1px solid ${readNotes ? 'rgba(61,155,106,0.3)' : 'var(--border)'}`,
                transition: 'all 0.15s',
              }}
            >
              <div
                onClick={handleToggleNotes}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: `2px solid ${readNotes ? 'var(--success)' : 'var(--border)'}`,
                    background: readNotes ? 'var(--success)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {readNotes ? '✓' : ''}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BookOpen size={13} color={readNotes ? 'var(--success)' : 'var(--teal)'} />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text)',
                        textDecoration: readNotes ? 'line-through' : 'none',
                      }}
                    >
                      3. Read Notes
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                    Review lecture slides, notes & key points
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nav('/notes');
                }}
                className="btn btn-sm"
                style={{
                  padding: '3px 8px',
                  fontSize: 10,
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--teal)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                }}
              >
                Open Notes <ExternalLink size={10} />
              </button>
            </div>
          </div>

          {/* Footer Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 10,
              paddingTop: 8,
              borderTop: '1px solid var(--border)',
            }}
          >
            {is_completed ? (
              <>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--success)',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Sparkles size={12} /> Session Completed!
                </div>
                <button
                  type="button"
                  onClick={handleQuickComplete}
                  className="btn btn-sm"
                  style={{
                    padding: '4px 10px',
                    fontSize: 10,
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={10} /> Reset Session
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {3 - completedCount} condition{3 - completedCount > 1 ? 's' : ''} remaining
                </div>
                <button
                  type="button"
                  onClick={handleQuickComplete}
                  className="btn btn-sm"
                  style={{
                    padding: '4px 12px',
                    fontSize: 11,
                    fontWeight: 600,
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    cursor: 'pointer',
                  }}
                >
                  <Check size={12} /> Complete All (3/3)
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}