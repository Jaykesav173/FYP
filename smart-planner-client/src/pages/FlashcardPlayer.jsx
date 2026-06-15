import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFlashcardSet } from '../api/client';
import { useToast } from '../components/Toast';
import { ArrowLeft, RefreshCw, Check, X } from 'lucide-react';

export default function FlashcardPlayer() {
  const { id } = useParams();
  const nav = useNavigate();
  const { addToast } = useToast();
  
  const [set, setSet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Stats
  const [knewIt, setKnewIt] = useState(0);
  const [needsReview, setNeedsReview] = useState(0);
  
  useEffect(() => {
    getFlashcardSet(id)
      .then(res => setSet(res.set))
      .catch(e => { addToast(e.message, 'error'); nav('/notes'); })
      .finally(() => setLoading(false));
  }, [id, addToast, nav]);

  if (loading) return <div className="page fade-up">Loading flashcards...</div>;
  if (!set || !set.flashcards?.length) return <div className="page fade-up">No flashcards found.</div>;

  const isFinished = currentIndex >= set.flashcards.length;

  const handleNext = (knew) => {
    if (knew) setKnewIt(prev => prev + 1);
    else setNeedsReview(prev => prev + 1);
    
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 150);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setKnewIt(0);
    setNeedsReview(0);
    setIsFlipped(false);
  };

  if (isFinished) {
    return (
      <div className="page fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 10 }}>Session Complete! 🎉</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 30 }}>You went through all {set.flashcards.length} cards.</p>
        
        <div style={{ display: 'flex', gap: 20, marginBottom: 40 }}>
          <div style={{ textAlign: 'center', padding: '16px 24px', background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--success)' }}>{knewIt}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Knew It</div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px 24px', background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--warning)' }}>{needsReview}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Needs Review</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={handleRestart} className="btn" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <RefreshCw size={16} /> Review Again
          </button>
          <button onClick={() => nav('/notes')} className="btn btn-primary">
            Back to Notes
          </button>
        </div>
      </div>
    );
  }

  const card = set.flashcards[currentIndex];

  return (
    <div className="page fade-up" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 30 }}>
        <button onClick={() => nav('/notes')} className="btn btn-ghost" style={{ padding: '8px', marginRight: 16 }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>{set.title}</h1>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            Card {currentIndex + 1} of {set.flashcards.length}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ width: '100%', height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 40, overflow: 'hidden' }}>
        <div style={{ width: `${((currentIndex) / set.flashcards.length) * 100}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }} />
      </div>

      {/* Card Container */}
      <div 
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          perspective: 1000,
        }}
      >
        <div 
          onClick={() => setIsFlipped(!isFlipped)}
          style={{
            width: '100%', maxWidth: 500, height: 320, position: 'relative', cursor: 'pointer',
            transformStyle: 'preserve-3d', transition: 'transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
        >
          {/* Front */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
            background: 'var(--card)', borderRadius: 20, padding: 32,
            boxShadow: '0 12px 32px rgba(0,0,0,0.1)', border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', position: 'absolute', top: 20, textTransform: 'uppercase', letterSpacing: 1 }}>Question</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>{card.front}</div>
            <div style={{ fontSize: 13, color: 'var(--primary)', position: 'absolute', bottom: 20 }}>Tap to flip</div>
          </div>

          {/* Back */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
            background: 'var(--primary)', borderRadius: 20, padding: 32,
            boxShadow: '0 12px 32px rgba(216,137,69,0.3)', color: 'white',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center',
            transform: 'rotateY(180deg)'
          }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', position: 'absolute', top: 20, textTransform: 'uppercase', letterSpacing: 1 }}>Answer</div>
            <div style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.6, overflowY: 'auto', maxHeight: '100%' }}>{card.back}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 16, marginTop: 40, opacity: isFlipped ? 1 : 0, transition: 'opacity 0.3s ease', pointerEvents: isFlipped ? 'auto' : 'none' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); handleNext(false); }}
            style={{
              padding: '14px 24px', borderRadius: 999, border: 'none', background: '#FEE2E2', color: '#B91C1C',
              fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'
            }}
          >
            <X size={18} /> Needs Review
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleNext(true); }}
            style={{
              padding: '14px 24px', borderRadius: 999, border: 'none', background: '#D1FAE5', color: '#047857',
              fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'
            }}
          >
            <Check size={18} /> Got It
          </button>
        </div>
      </div>
    </div>
  );
}
