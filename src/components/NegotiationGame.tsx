import React, { useState } from 'react';
import { HelpCircle, RefreshCw, Star, Coins, AlertCircle, TrendingDown } from 'lucide-react';
import { synth } from '../utils/audio';

interface NegotiationGameProps {
  isInfinite: boolean;
  username: string;
  onSuccess: (score: number, guessesCount: number) => void;
}

interface ChatMessage {
  role: 'user' | 'merchant';
  text: string;
}

export default function NegotiationGame({ isInfinite, username, onSuccess }: NegotiationGameProps) {
  const [pitch, setPitch] = useState('');
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [feedback, setFeedback] = useState('Initiate trade negotiations. Barter your way down!');
  const [loading, setLoading] = useState(false);
  const [infiniteIndex, setInfiniteIndex] = useState(0);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [dealClosed, setDealClosed] = useState(false);
  const [merchant, setMerchant] = useState('');
  const [item, setItem] = useState('');
  const [startingPrice, setStartingPrice] = useState(0);

  const fetchNew = async () => {
    setLoading(true);
    setChat([]);
    setPitch('');
    setDealClosed(false);
    setCurrentPrice(null);
    setFeedback('A new merchant is setting up shop…');
    try {
      const res = await fetch('/api/games/negotiation/new', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const d = await res.json();
      setMerchant(d.merchant || 'A stubborn merchant');
      setItem(d.item || 'a mysterious item');
      setStartingPrice(d.startingPrice || 1000);
      setCurrentPrice(d.startingPrice || 1000);
      setFeedback('Make your pitch — you have 3 sentences to haggle them down.');
    } catch {
      setFeedback('Could not reach the market — try again.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { fetchNew(); }, []);

  const handleNextInfinite = () => {
    synth.playTargetSound('unlock');
    setInfiniteIndex((prev) => prev + 1);
    fetchNew();
  };

  const submitPitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pitch.trim() || dealClosed) return;
    if (chat.filter(m => m.role === 'user').length >= 3) {
      setFeedback('Negotiation window closed. You have used your 3 sentences.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/games/negotiation/barter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pitch: pitch.trim(),
          merchant,
          item,
          startingPrice,
          history: chat
        })
      });

      if (res.ok) {
        const result = await res.json();
        
        synth.playTargetSound('click');
        const updatedChat: ChatMessage[] = [
          ...chat,
          { role: 'user', text: pitch.trim() },
          { role: 'merchant', text: result.reply }
        ];
        
        setChat(updatedChat);
        setPitch('');
        setCurrentPrice(result.newPrice);
        setFeedback(`The merchant countered with: ${result.newPrice} gold.`);

        if (result.dealAccepted || updatedChat.filter(m => m.role === 'user').length >= 3) {
          setDealClosed(true);
          synth.playTargetSound(result.dealAccepted ? 'win' : 'click');
          setFeedback(result.dealAccepted ? 'DEAL ACCEPTED!' : 'NEGOTIATION FINISHED. That is the final offer.');
          
          // Assuming starting price varies, normalize score out of 100
          // Let's just reward a flat logic based on price reduction
          const reduction = result.startingPrice - result.newPrice;
          // Harsh: only a closed deal pays well; walking away barely scores.
          const base = Math.max(0, Math.min(100, Math.floor((reduction / result.startingPrice) * 100)));
          const score = result.dealAccepted ? Math.max(10, base) : Math.floor(base * 0.25);
          onSuccess(score, updatedChat.filter(m => m.role === 'user').length);
        }
      }
    } catch (err) {
      console.error(err);
      setFeedback('Intergalactic trade comms error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="retro-card p-4 bg-yellow-400/10 rounded-none border-dashed border-2 flex items-start gap-3">
        <Coins className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
        <div className="text-xs text-stone-700 leading-relaxed font-mono">
          <span className="font-bold text-yellow-950 block mb-1">THE ART OF THE DEAL</span>
          You are haggling with a stubborn merchant. You have exactly 3 sentences to barter. The merchant starts with an astronomical asking price. Try to talk them down using logic, charm, or sheer humor!
        </div>
      </div>

      <div className="flex justify-between items-center bg-[#1e1b13] text-white p-3.5 border-2 border-[#1e1b13] shadow-[2px_2px_0_#1e1b13]">
        <span className="font-display font-bold text-xs uppercase text-yellow-400 flex items-center gap-1.5">
          <TrendingDown className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          Active Trade Offer
        </span>
        <button onClick={handleNextInfinite} className="text-[10px] font-mono hover:text-yellow-400 flex items-center gap-1 cursor-pointer">
          <RefreshCw className="w-3 h-3" /> Skip / Next Merchant
        </button>
      </div>

      <div className="retro-card p-5 bg-white rounded-none flex flex-col gap-4 min-h-[300px]">
        {/* Deal info */}
        <div className="flex flex-col items-center gap-2 p-4 bg-stone-50 border border-stone-200">
           {item && (
             <p className="text-xs font-display text-center leading-snug mb-1">
               <span className="font-bold">{merchant}</span> is selling <span className="font-bold">{item}</span>
             </p>
           )}
           <span className="text-[10px] font-mono uppercase text-stone-400 tracking-widest">Current Asking Price</span>
           {currentPrice ? (
             <span className="text-4xl font-black font-display text-green-700 tracking-tighter">
               {currentPrice.toLocaleString()}G
             </span>
           ) : (
             <span className="text-xl font-black font-display text-stone-600 tracking-tighter">
               Await Initial Valuation...
             </span>
           )}
           <p className="text-xs text-stone-500 font-mono text-center">
              Sentences used: {chat.filter(m => m.role === 'user').length} / 3
           </p>
        </div>

        {/* Chat window */}
        <div className="flex-1 max-h-60 overflow-y-auto pr-1 flex flex-col gap-3">
          {chat.length === 0 && (
            <p className="text-xs text-stone-400 italic py-2 font-mono text-center">
              The merchant is waiting for your pitch. What's your offer?
            </p>
          )}
          {chat.map((msg, idx) => (
             <div key={idx} className={`flex flex-col gap-1 w-5/6 ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
               <span className="text-[9px] font-mono uppercase text-stone-400">
                 {msg.role === 'user' ? 'You' : 'Merchant'}
               </span>
               <div className={`p-3 text-xs leading-relaxed border ${msg.role === 'user' ? 'bg-yellow-50 border-yellow-200 text-yellow-950' : 'bg-stone-100 border-stone-300 text-stone-800'}`}>
                 {msg.text}
               </div>
             </div>
          ))}
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <div className="text-xs font-mono text-center text-stone-600 bg-amber-50 py-2 border-dashed border border-amber-200">
            {feedback}
          </div>
          
          {!dealClosed && (
            <form onSubmit={submitPitch} className="flex gap-2">
              <input
                type="text"
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                placeholder="e.g. I'll give you 500 gold for it."
                className="flex-1 px-3 py-2 bg-white border-2 border-[#1e1b13] font-mono text-xs focus:outline-none focus:bg-yellow-50 focus:ring-0"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-[#1e1b13] hover:bg-stone-800 text-yellow-400 font-display font-bold border-2 border-[#1e1b13] px-4 py-2 text-xs shadow-[2px_2px_0_#ecc94b]"
              >
                {loading ? 'PITCHING...' : 'BARTER'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
