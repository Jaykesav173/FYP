import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFlashcardSet } from '../api/client';
import { useToast } from '../components/Toast';
import { ArrowLeft, RefreshCw, Layers } from 'lucide-react';

export default function FlashcardPlayer() {
  const { id } = useParams();
  const nav = useNavigate();
  const { addToast } = useToast();
  
  const [set, setSet] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Game State
  const [questionCards, setQuestionCards] = useState([]);
  const [answerCards, setAnswerCards] = useState([]);
  const [flippedCardIds, setFlippedCardIds] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState(new Set());
  const [moves, setMoves] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  useEffect(() => {
    getFlashcardSet(id)
      .then(res => {
        setSet(res.set);
        initializeGame(res.set.flashcards);
      })
      .catch(e => { addToast(e.message, 'error'); nav('/notes'); })
      .finally(() => setLoading(false));
  }, [id, addToast, nav]);

  const initializeGame = (flashcards) => {
    if (!flashcards) return;
    
    const qCards = [];
    const aCards = [];
    flashcards.forEach((fc, index) => {
      qCards.push({ id: `q-${index}`, pairId: index, type: 'Question', text: fc.front });
      aCards.push({ id: `a-${index}`, pairId: index, type: 'Answer', text: fc.back });
    });

    // Shuffle independently
    for (let i = qCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [qCards[i], qCards[j]] = [qCards[j], qCards[i]];
    }
    for (let i = aCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [aCards[i], aCards[j]] = [aCards[j], aCards[i]];
    }

    setQuestionCards(qCards);
    setAnswerCards(aCards);
    setFlippedCardIds([]);
    setMatchedPairs(new Set());
    setMoves(0);
    setIsProcessing(false);
  };

  const handleCardClick = (card) => {
    if (isProcessing) return;
    if (flippedCardIds.includes(card.id)) return;
    if (matchedPairs.has(card.pairId)) return;

    const newFlippedIds = [...flippedCardIds, card.id];
    setFlippedCardIds(newFlippedIds);

    if (newFlippedIds.length === 2) {
      setMoves(m => m + 1);
      setIsProcessing(true);
      
      const firstId = newFlippedIds[0];
      const secondId = newFlippedIds[1];
      
      const firstCard = [...questionCards, ...answerCards].find(c => c.id === firstId);
      const secondCard = [...questionCards, ...answerCards].find(c => c.id === secondId);

      if (firstCard.pairId === secondCard.pairId && firstCard.id !== secondCard.id) {
        // Match!
        setTimeout(() => {
          setMatchedPairs(prev => new Set([...prev, firstCard.pairId]));
          setFlippedCardIds([]);
          setIsProcessing(false);
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setFlippedCardIds([]);
          setIsProcessing(false);
        }, 2000);
      }
    }
  };

  const renderCard = (card) => {
    const isFlipped = flippedCardIds.includes(card.id) || matchedPairs.has(card.pairId);
    const isMatched = matchedPairs.has(card.pairId);

    return (
      <div 
        key={card.id}
        onClick={() => handleCardClick(card)}
        style={{
          height: 240, 
          position: 'relative', 
          cursor: isFlipped ? 'default' : 'pointer',
          perspective: 1000,
        }}
      >
        <div style={{
          width: '100%', height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d', 
          transition: 'transform 0.5s cubic-bezier(0.4, 0.2, 0.2, 1)',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}>
          {/* Front (Face Down) */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
            background: 'linear-gradient(135deg, var(--primary), var(--teal, #20c997))',
            borderRadius: 16,
            border: '2px solid rgba(255,255,255,0.1)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
            transition: 'all 0.2s ease',
            overflow: 'hidden'
          }}>
            {/* Inner pattern for premium look */}
            <div style={{
              position: 'absolute', inset: 6, 
              border: '2px dashed rgba(255,255,255,0.2)', 
              borderRadius: 10 
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)'
            }} />
            <Layers size={36} color="white" style={{ opacity: 0.9, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
          </div>

          {/* Back (Face Up) */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
            background: isMatched 
              ? 'linear-gradient(135deg, #ECFDF5, #D1FAE5)' 
              : (card.type === 'Question' ? 'var(--card)' : 'linear-gradient(135deg, var(--primary), #4338ca)'),
            color: isMatched 
              ? '#065F46' 
              : (card.type === 'Question' ? 'var(--text)' : 'white'),
            border: `2px solid ${isMatched ? '#10B981' : (card.type === 'Question' ? 'var(--border)' : 'transparent')}`,
            borderRadius: 16, padding: '20px 16px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center',
            transform: 'rotateY(180deg)',
            boxShadow: isMatched ? '0 0 20px rgba(16, 185, 129, 0.4)' : '0 10px 30px rgba(0,0,0,0.15)',
          }}>
            <div style={{ 
              fontSize: 11, 
              fontWeight: 800,
              textTransform: 'uppercase', 
              letterSpacing: 2, 
              marginBottom: 12,
              opacity: isMatched ? 0.9 : (card.type === 'Question' ? 0.6 : 0.9),
              background: isMatched ? 'rgba(6, 95, 70, 0.1)' : (card.type === 'Question' ? 'var(--bg)' : 'rgba(255,255,255,0.2)'),
              padding: '4px 12px',
              borderRadius: 20,
              flexShrink: 0
            }}>
              {card.type}
            </div>
            <div style={{ 
              fontSize: 18, 
              fontWeight: 600, 
              lineHeight: 1.5, 
              overflowY: 'auto', 
              maxHeight: '100%',
              width: '100%',
              wordBreak: 'break-word',
              scrollbarWidth: 'thin'
            }}>
              {card.text}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleRestart = () => {
    if (set && set.flashcards) {
      initializeGame(set.flashcards);
    }
  };

  if (loading) return <div className="page fade-up">Loading memory game...</div>;
  if (!set || !set.flashcards?.length) return <div className="page fade-up">No flashcards found.</div>;

  const isFinished = matchedPairs.size === set.flashcards.length;

  if (isFinished) {
    return (
      <div className="page fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60 }}>
        <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 10 }}>Game Complete! 🎉</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 30 }}>You matched all {set.flashcards.length} pairs!</p>
        
        <div style={{ display: 'flex', gap: 20, marginBottom: 40 }}>
          <div style={{ textAlign: 'center', padding: '16px 32px', background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--primary)' }}>{moves}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Total Moves</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={handleRestart} className="btn" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <RefreshCw size={16} /> Play Again
          </button>
          <button onClick={() => nav('/notes')} className="btn btn-primary">
            Back to Notes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-up" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, flexShrink: 0 }}>
        <button onClick={() => nav('/notes')} className="btn btn-ghost" style={{ padding: '8px', marginRight: 16 }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>{set.title}</h1>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>Pairs Matched: {matchedPairs.size} / {set.flashcards.length}</span>
            <span>Moves: {moves}</span>
          </div>
        </div>
        <button onClick={handleRestart} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} /> Restart
        </button>
      </div>

      {/* Progress */}
      <div style={{ width: '100%', height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 20, flexShrink: 0, overflow: 'hidden' }}>
        <div style={{ width: `${(matchedPairs.size / set.flashcards.length) * 100}%`, height: '100%', background: '#10B981', transition: 'width 0.3s ease' }} />
      </div>

      {/* Grid Container */}
      <div style={{ 
        flex: 1, 
        overflow: 'hidden',
        display: 'flex',
        gap: 32,
        maxWidth: 1800,
        margin: '0 auto',
        width: '100%'
      }}>
        {/* Questions Column */}
        <div style={{ flex: '0 0 35%', overflowY: 'auto', padding: '0 16px 40px 0', scrollbarWidth: 'thin' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--muted)', marginBottom: 16, textAlign: 'center', position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', padding: '10px 0' }}>QUESTIONS</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 20,
          }}>
            {questionCards.map((card) => renderCard(card))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 2, background: 'var(--border)', borderRadius: 2, flexShrink: 0 }} />

        {/* Answers Column */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 40px 16px', scrollbarWidth: 'thin' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--muted)', marginBottom: 16, textAlign: 'center', position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', padding: '10px 0' }}>ANSWERS</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 20,
          }}>
            {answerCards.map((card) => renderCard(card))}
          </div>
        </div>
      </div>
    </div>
  );
}
