import React, { useState, useMemo } from 'react';

// --- Helper Functions and Constants ---

const PLACE_PAYOUTS = { 4: 9/5, 5: 7/5, 6: 7/6, 8: 7/6, 9: 7/5, 10: 9/5 };
const BUY_PAYOUTS = { 4: 2/1, 5: 3/2, 6: 6/5, 8: 6/5, 9: 3/2, 10: 2/1 };
const SIX_EIGHT_BETS = { 0.5: 0.5, 1: 1.5, 2: 3, 5: 6, 10: 12, 25: 30, 50: 60, 100: 120 };
const CHIP_DENOMINATIONS = [0.5, 1, 2, 5, 10, 25, 50, 100];
const POSSIBLE_ROLLS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const POWER_PRESS_SCHEDULE = {
    '4_10': { 1: 3, 2: 5, 3: 5, 4: 10, 5: 15, 10: 25, 15: 40, 25: 75, 40: 125, 50: 150, 75: 200, 100: 300, 125: 300, 150: 400, 200: 500, 300: 500, 400: 1000, 500: 1000, 750: 2000, 1000: 2000 },
    '5_9': { 1: 3, 2: 5, 3: 5, 4: 10, 5: 15, 10: 25, 15: 36, 25: 60, 36: 86, 50: 125, 60: 125, 86: 200, 100: 250, 125: 300, 200: 500, 250: 600, 300: 500, 500: 1000, 600: 1500, 750: 1800, 1000: 2000 },
    '6_8': { 1.5: 6, 3: 6, 6: 18, 12: 30, 18: 42, 30: 66, 42: 90, 60: 150, 66: 150, 90: 210, 120: 300, 150: 330, 210: 450, 300: 600, 330: 720, 450: 900, 600: 1350, 720: 1500, 900: 1950 }
};

const DUCK_RAGU_START_BETS = { 4: 0, 5: 0, 6: 12, 8: 12, 9: 0, 10: 0 };
const GO_ACROSS_BETS = { 4: 10, 5: 10, 6: 12, 8: 12, 9: 10, 10: 10 };


// --- Main App Component ---

export default function App() {
    // --- State Management ---
    const [bets, setBets] = useState({ 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0 });
    const [betTypes, setBetTypes] = useState({ 4: 'place', 5: 'place', 6: 'place', 8: 'place', 9: 'place', 10: 'place' });
    const [initialBets, setInitialBets] = useState(null);
    const [point, setPoint] = useState(null);
    const [strategyTracker, setStrategyTracker] = useState({});
    const [messages, setMessages] = useState([]);
    const [selectedChip, setSelectedChip] = useState(5);
    const [maxBet, setMaxBet] = useState('1000');
    
    // Strategy State
    const [mainStrategy, setMainStrategy] = useState('standard'); // 'standard' or 'duck_ragu'
    const [pressType, setPressType] = useState('regular'); // 'regular' or 'power'
    const [firstAction, setFirstAction] = useState('collect'); // 'collect' or 'press'
    const [duckRaguState, setDuckRaguState] = useState({ isActive: false, phase: 'left', hotNumber: null, hasCollected: false });
    
    // Bankroll State
    const [bankroll, setBankroll] = useState(600);
    const [initialBankroll, setInitialBankroll] = useState(null);
    const [bankrollInput, setBankrollInput] = useState('600');
    const [bankrollAtShooterStart, setBankrollAtShooterStart] = useState(0);

    // P/L State
    const [pointWinnings, setPointWinnings] = useState(0);
    const [pointHistory, setPointHistory] = useState([]);


    // --- Memoized Calculations ---
    const totalBet = useMemo(() => Object.values(bets).reduce((sum, bet) => sum + Number(bet), 0), [bets]);
    const sessionPL = useMemo(() => initialBankroll === null ? 0 : bankroll - initialBankroll, [bankroll, initialBankroll]);
    const pointPL = useMemo(() => pointWinnings, [pointWinnings]);
    const shooterPL = useMemo(() => (initialBankroll === null || bankrollAtShooterStart === 0) ? 0 : bankroll - bankrollAtShooterStart, [bankroll, bankrollAtShooterStart, initialBankroll]);


    // --- Core Game Logic ---
    const handleAddBet = (number) => { if (!initialBets) setBets(prev => ({ ...prev, [number]: prev[number] + selectedChip })); };
    const handleClearBet = (number) => { if (!initialBets) setBets(prev => ({ ...prev, [number]: 0 })); };
    const handleBetTypeChange = (number, type) => { if (!initialBets) setBetTypes(prev => ({ ...prev, [number]: type })); };
    
    const handleBetAcross = () => { if (!initialBets) { const sb = SIX_EIGHT_BETS[selectedChip] || 0; setBets({ 4: selectedChip, 5: selectedChip, 6: sb, 8: sb, 9: selectedChip, 10: selectedChip }); } };
    const handleBetInside = () => { if (!initialBets) { const sb = SIX_EIGHT_BETS[selectedChip] || 0; setBets({ 4: 0, 5: selectedChip, 6: sb, 8: sb, 9: selectedChip, 10: 0 }); } };
    const handleBetOutside = () => { if (!initialBets) setBets({ 4: selectedChip, 5: selectedChip, 6: 0, 8: 0, 9: selectedChip, 10: selectedChip }); };
    const handleBetPoles = () => { if (!initialBets) setBets({ 4: selectedChip, 5: 0, 6: 0, 8: 0, 9: 0, 10: selectedChip }); };
    const handleClearAllBets = () => { if (!initialBets) setBets({ 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0 }); };
    
    const handleSetInitialBets = () => {
        let betsToPlace = { ...bets };
        let currentBankroll = bankroll;

        if (mainStrategy === 'duck_ragu') {
            betsToPlace = DUCK_RAGU_START_BETS;
        }
        
        if (initialBankroll === null) {
            const startingBankroll = Number(bankrollInput) || 600;
            setInitialBankroll(startingBankroll);
            setBankroll(startingBankroll);
            currentBankroll = startingBankroll;
            addMessage(`Starting bankroll set to $${startingBankroll.toFixed(2)}.`, "info");
        }
        
        setBankrollAtShooterStart(currentBankroll);
        setInitialBets(betsToPlace);
        setBets({ 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0 });
        setPointHistory([]);
        
        const totalPlacedBet = Object.values(betsToPlace).reduce((s, b) => s + b, 0);
        let strategyDescription = `${pressType.toUpperCase()} PRESS, ${firstAction.toUpperCase()} FIRST`;
        if (mainStrategy === 'duck_ragu') {
            strategyDescription = 'DUCK RAGU OPENER';
            setDuckRaguState({ isActive: true, phase: 'left', hotNumber: null, hasCollected: false });
        }
        
        addMessage(`Bets of $${totalPlacedBet.toFixed(2)} are ready. Strategy: ${strategyDescription}.`, "info");
        
        if (point) {
             addMessage(`Point is ON: ${point}. Placing bets now.`, "info");
             setBankroll(prev => prev - totalPlacedBet);
             setBets(betsToPlace);
             
             if (mainStrategy === 'standard') {
                 const newTracker = {};
                 Object.keys(betsToPlace).forEach(num => {
                     if (betsToPlace[num] > 0) newTracker[num] = firstAction === 'collect' ? 'collect' : pressType;
                 });
                 setStrategyTracker(newTracker);
             }
        } else {
            addMessage(`Waiting for a point to be established.`, "info");
        }
    };

    const handleResetGame = () => {
        setBets({ 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0 });
        setBetTypes({ 4: 'place', 5: 'place', 6: 'place', 8: 'place', 9: 'place', 10: 'place' });
        setInitialBets(null);
        setPoint(null);
        setStrategyTracker({});
        setMessages([]);
        setSelectedChip(5);
        setMaxBet('1000');
        setMainStrategy('standard');
        setPressType('regular');
        setFirstAction('collect');
        setDuckRaguState({ isActive: false, phase: 'left', hotNumber: null, hasCollected: false });
        setBankroll(600);
        setInitialBankroll(null);
        setBankrollInput('600');
        setPointWinnings(0);
        setBankrollAtShooterStart(0);
        setPointHistory([]);
    };

    const addMessage = (text, type) => setMessages(prev => [{ text, type, timestamp: new Date().toLocaleTimeString() }, ...prev]);
    
    const handleCopyLog = () => {
        const logText = [...messages].reverse().map(msg => `${msg.timestamp} ${msg.text}`).join('\n');
        const textArea = document.createElement("textarea");
        textArea.value = logText;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            const copyButton = document.getElementById('copy-log-button');
            if(copyButton) {
                const originalText = copyButton.innerText;
                copyButton.innerText = "Copied!";
                setTimeout(() => { copyButton.innerText = originalText; }, 1500);
            }
        } catch (err) { console.error('Fallback: Oops, unable to copy', err); }
        document.body.removeChild(textArea);
    };

    const handleDuckRaguComplete = () => {
        addMessage("Duck Ragu strategy complete. Switching to standard strategy.", "info");
        setDuckRaguState({ isActive: false, phase: 'left', hotNumber: null, hasCollected: false });

        const newTracker = {};
        Object.keys(GO_ACROSS_BETS).forEach(numStr => {
            const num = parseInt(numStr, 10);
            if(GO_ACROSS_BETS[num] > 0) {
                 newTracker[num] = firstAction === 'collect' ? 'collect' : pressType;
            }
        });
        setStrategyTracker(newTracker);
    };

    const handleRoll = (rollValue) => {
        addMessage(`Rolled a ${rollValue}.`, 'roll');

        // --- COME-OUT ROLL LOGIC ---
        if (!point) {
            if ([4, 5, 6, 8, 9, 10].includes(rollValue)) {
                setPoint(rollValue);
                addMessage(`Point is set to ${rollValue}.`, 'info');
                if (totalBet === 0 && initialBets) {
                    const betsToPlace = initialBets;
                    const totalPlacedBet = Object.values(betsToPlace).reduce((s, b) => s + b, 0);
                    setBets(betsToPlace);
                    setBankroll(prev => prev - totalPlacedBet);
                    if (mainStrategy === 'standard') {
                        const newTracker = {};
                        Object.keys(betsToPlace).forEach(num => { if (betsToPlace[num] > 0) newTracker[num] = firstAction === 'collect' ? 'collect' : pressType; });
                        setStrategyTracker(newTracker);
                    }
                    addMessage(`Placing $${totalPlacedBet.toFixed(2)}. Bets are ON.`, 'info');
                }
            } else { addMessage("Come-out roll. No change.", 'info'); }
            return;
        }
        
        // --- DUCK RAGU AUTOMATED STRATEGY ---
        if (duckRaguState.isActive && (rollValue === 6 || rollValue === 8)) {
            // --- PHASE 1: LEFT SIDE ---
            if (duckRaguState.phase === 'left') {
                if (!duckRaguState.hotNumber) { // FIRST HIT
                    const pressTo = POWER_PRESS_SCHEDULE['6_8'][12];
                    const payout = 12 * PLACE_PAYOUTS[rollValue];
                    const cost = pressTo - 12;
                    const leftover = payout - cost;
                    setBets(prev => ({...prev, [rollValue]: pressTo}));
                    setBankroll(prev => prev + leftover);
                    setDuckRaguState(prev => ({...prev, hotNumber: rollValue}));
                    addMessage(`Duck Ragu: First hit. Power pressed ${rollValue} to $${pressTo}. Collected $${leftover.toFixed(2)}.`, 'info');
                } else if (rollValue === duckRaguState.hotNumber) {
                     if (!duckRaguState.hasCollected) { // HOT HITS (COLLECT)
                        const payout = bets[rollValue] * PLACE_PAYOUTS[rollValue];
                        setBankroll(prev => prev + payout);
                        setDuckRaguState(prev => ({...prev, hasCollected: true}));
                        addMessage(`Duck Ragu: Hot number hit. Collected $${payout.toFixed(2)}.`, 'info');
                     } else { // HOT HITS AGAIN (GO ACROSS)
                        const payout = bets[rollValue] * PLACE_PAYOUTS[rollValue];
                        setBankroll(prev => prev + payout);
                        setBets(GO_ACROSS_BETS);
                        addMessage(`Duck Ragu: Hot number hit again. Going $64 across.`, 'info');
                        handleDuckRaguComplete();
                     }
                } else { // COLD NUMBER HITS
                    if (!duckRaguState.hasCollected) { // RESET TO PHASE 2
                        const payout = 12 * PLACE_PAYOUTS[rollValue];
                        const currentBetsOnTable = totalBet;
                        const costOfNewBets = 24;
                        setBankroll(prev => prev + payout + currentBetsOnTable - costOfNewBets);
                        setBets(DUCK_RAGU_START_BETS);
                        setDuckRaguState(prev => ({...prev, phase: 'right', hotNumber: null}));
                        addMessage(`Duck Ragu: Cold number hit. Resetting to $24 for Phase 2.`, 'info');
                    } else { // MERGE TO PHASE 2 ENDGAME
                         const pressTo = POWER_PRESS_SCHEDULE['6_8'][12];
                         const payout = 12 * PLACE_PAYOUTS[rollValue];
                         const cost = pressTo - 12;
                         const leftover = payout - cost;
                         setBets(prev => ({...prev, [rollValue]: pressTo}));
                         setBankroll(prev => prev + leftover);
                         setDuckRaguState(prev => ({...prev, phase: 'both_hot'}));
                         addMessage(`Duck Ragu: Cold number hit after collect. Power pressing both.`, 'info');
                    }
                }
            // --- PHASE 2: RIGHT SIDE ---
            } else if (duckRaguState.phase === 'right') {
                if (!duckRaguState.hotNumber) { // FIRST HIT AFTER RESET
                    const pressTo = POWER_PRESS_SCHEDULE['6_8'][12];
                    const payout = 12 * PLACE_PAYOUTS[rollValue];
                    const cost = pressTo - 12;
                    const leftover = payout - cost;
                    setBets(prev => ({...prev, [rollValue]: pressTo}));
                    setBankroll(prev => prev + leftover);
                    setDuckRaguState(prev => ({...prev, hotNumber: rollValue}));
                    addMessage(`Duck Ragu (P2): First hit. Power pressed ${rollValue} to $${pressTo}.`, 'info');
                } else if (rollValue === duckRaguState.hotNumber) { // HOT HITS (GO ACROSS)
                    const payout = bets[rollValue] * PLACE_PAYOUTS[rollValue];
                    setBankroll(prev => prev + payout);
                    setBets(GO_ACROSS_BETS);
                    addMessage(`Duck Ragu (P2): Hot number hit. Going $64 across.`, 'info');
                    handleDuckRaguComplete();
                } else { // COLD HITS (PRESS BOTH)
                    const pressTo = POWER_PRESS_SCHEDULE['6_8'][12];
                    const payout = 12 * PLACE_PAYOUTS[rollValue];
                    const cost = pressTo - 12;
                    const leftover = payout - cost;
                    setBets(prev => ({...prev, [rollValue]: pressTo}));
                    setBankroll(prev => prev + leftover);
                    setDuckRaguState(prev => ({...prev, phase: 'both_hot'}));
                    addMessage(`Duck Ragu (P2): Cold number hit. Power pressing both.`, 'info');
                }
            // --- PHASE BOTH HOT ---
            } else if (duckRaguState.phase === 'both_hot') {
                const payout = bets[rollValue] * PLACE_PAYOUTS[rollValue];
                setBankroll(prev => prev + payout);
                setBets(GO_ACROSS_BETS);
                addMessage(`Duck Ragu: Both hot hit. Going $64 across.`, 'info');
                handleDuckRaguComplete();
            }
            return; // End Duck Ragu logic for this roll
        }


        // --- STANDARD POINT IS ON LOGIC ---
        let currentPointWinnings = pointWinnings;

        const processHit = (isPointHit = false) => {
            const betAmount = bets[rollValue];
            const betType = betTypes[rollValue];
            let payout = 0;

            if (betType === 'place') payout = betAmount * PLACE_PAYOUTS[rollValue];
            else { payout = betAmount * BUY_PAYOUTS[rollValue]; payout -= betAmount * 0.05; }
            
            currentPointWinnings += payout;
            
            const action = strategyTracker[rollValue];
            if (!action) {
                addMessage(`Error: No strategy. Defaulting to COLLECT.`, 'loss');
                setBankroll(prev => prev + payout);
                return;
            }

            if(!isPointHit) addMessage(`Hit on ${rollValue}! Bet was $${betAmount.toFixed(2)}. Action: ${action.replace('_',' ').toUpperCase()}.`, 'win');

            if (action === 'collect') {
                setBankroll(prev => prev + payout);
                setStrategyTracker(prev => ({ ...prev, [rollValue]: pressType }));
                addMessage(`Collected $${payout.toFixed(2)}. Next action is ${pressType.replace('_',' ').toUpperCase()} PRESS.`, 'info');
            } else { // 'regular' or 'power'
                const maxBetLimit = Number(maxBet);
                let newBetAmount;

                if (action === 'power') {
                    const scheduleKey = [4, 10].includes(rollValue) ? '4_10' : [5, 9].includes(rollValue) ? '5_9' : '6_8';
                    const pressTo = POWER_PRESS_SCHEDULE[scheduleKey][betAmount];
                    newBetAmount = pressTo || betAmount * 2; // Fallback to regular press
                    if(pressTo) addMessage(`Power Pressing...`, 'info'); else addMessage(`No power press schedule. Regular pressing.`, 'info');
                } else { newBetAmount = betAmount * 2; }

                if (maxBetLimit > 0 && betAmount >= maxBetLimit) {
                    setBankroll(prev => prev + payout);
                    setStrategyTracker(prev => ({...prev, [rollValue]: 'collect'}));
                    addMessage(`Bet at max limit. Collecting $${payout.toFixed(2)}.`, 'info');
                } else if (maxBetLimit > 0 && newBetAmount > maxBetLimit) {
                    const costToReachMax = maxBetLimit - betAmount;
                    if (payout >= costToReachMax) {
                        const leftover = payout - costToReachMax;
                        setBets(prev => ({ ...prev, [rollValue]: maxBetLimit }));
                        setBankroll(prev => prev + leftover); 
                        setStrategyTracker(prev => ({ ...prev, [rollValue]: 'collect' }));
                        addMessage(`Pressed to max of $${maxBetLimit.toFixed(2)}. Collected $${leftover.toFixed(2)}.`, 'info');
                    } else {
                        setBankroll(prev => prev + payout);
                        addMessage(`Not enough winnings to press to max. Collecting $${payout.toFixed(2)}.`, 'info');
                    }
                } else {
                    const costToPress = newBetAmount - betAmount;
                    const leftover = payout - costToPress;
                    setBets(prev => ({ ...prev, [rollValue]: newBetAmount }));
                    setBankroll(prev => prev + leftover);
                    setStrategyTracker(prev => ({ ...prev, [rollValue]: 'collect' }));
                    addMessage(`Pressed to $${newBetAmount.toFixed(2)}. Collected $${leftover.toFixed(2)}. Next action is COLLECT.`, 'info');
                }
            }
        };

        if (bets[rollValue] > 0) processHit(rollValue === point);

        if (rollValue === point) {
            setPointHistory(prev => [...prev, { point, profit: currentPointWinnings }]);
            setPoint(null);
            setPointWinnings(0);
            addMessage(`Point ${rollValue} hit! Winner! Bets remain ON.`, 'win');
            return;
        }

        if (rollValue === 7) {
            const lostAmount = totalBet;
            const finalShooterPL = (bankroll - lostAmount) - bankrollAtShooterStart;
            addMessage(`Seven out. Lost $${lostAmount.toFixed(2)}.`, 'loss');
            addMessage(`Final P/L for this shooter: $${finalShooterPL.toFixed(2)}`, 'info');
            setPoint(null);
            setPointWinnings(0);
            setBets({ 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0 });
            setStrategyTracker({});
            setInitialBets(null);
            setDuckRaguState({ isActive: false, phase: 'left', hotNumber: null, hasCollected: false });
            addMessage(`New shooter. Please place your bets.`, 'info');
            return;
        }

        setPointWinnings(currentPointWinnings);
    };

    // --- Render Components ---

    const BetInput = ({ number }) => (
        <div className="p-4 bg-gray-800 rounded-lg shadow-md flex flex-col items-center space-y-2">
            <div className="text-4xl font-bold text-white">{number}</div>
             <div 
                className={`w-28 h-16 flex items-center justify-center text-2xl font-bold rounded-lg cursor-pointer transition-all ${initialBets ? 'bg-gray-700 text-gray-400' : 'bg-gray-900 text-white hover:bg-gray-700'}`}
                onClick={() => handleAddBet(number)}
            >
                {`$${bets[number].toFixed(2)}`}
            </div>
            <div className="flex space-x-2">
                 <button 
                    onClick={() => handleBetTypeChange(number, 'place')}
                    disabled={initialBets !== null}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${betTypes[number] === 'place' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} disabled:opacity-50`}
                >
                    Place
                </button>
                <button 
                    onClick={() => handleBetTypeChange(number, 'buy')}
                    disabled={initialBets !== null}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${betTypes[number] === 'buy' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} disabled:opacity-50`}
                >
                    Buy
                </button>
            </div>
             <button 
                onClick={() => handleClearBet(number)}
                disabled={initialBets !== null}
                className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Clear Bet
            </button>
            {initialBets && bets[number] > 0 && !duckRaguState.isActive && (
                 <div className="text-center mt-2">
                    <div className="text-xs text-gray-400">Next Action</div>
                    <div className={`font-bold text-lg ${strategyTracker[number] !== 'collect' ? 'text-yellow-400' : 'text-green-400'}`}>
                        {strategyTracker[number]?.replace('_', ' ').toUpperCase()}
                    </div>
                </div>
            )}
        </div>
    );
    
    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
                        Craps Bet Tracker
                    </h1>
                    <p className="text-gray-400 mt-2">Select a chip and click a number to place your bets.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 flex flex-col space-y-8">
                        
                        {initialBets === null && (
                            <>
                                {initialBankroll === null && (
                                    <>
                                        <div>
                                            <h2 className="text-2xl font-semibold mb-4 border-b-2 border-gray-700 pb-2">1. Set Bankroll</h2>
                                            <div className="bg-gray-800 p-4 rounded-lg flex items-center gap-4">
                                                <label htmlFor="bankroll" className="text-gray-400">Starting Bankroll:</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                                    <input id="bankroll" type="number" value={bankrollInput} onChange={(e) => setBankrollInput(e.target.value)} placeholder="600" disabled={initialBankroll !== null} className="bg-gray-700 text-white w-36 text-center rounded-md p-2 pl-7 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-70" />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-semibold mb-4 border-b-2 border-gray-700 pb-2">2. Set the Point (Optional)</h2>
                                            <div className="flex flex-wrap gap-3 items-center bg-gray-800 p-4 rounded-lg">
                                                <p className="text-gray-400 mr-2">Start with point ON:</p>
                                                {[4, 5, 6, 8, 9, 10].map(p => (<button key={p} onClick={() => setPoint(p)} className={`w-12 h-12 text-xl font-bold rounded-lg transition-colors ${point === p ? 'bg-blue-600 text-white ring-2 ring-blue-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{p}</button>))}
                                            </div>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-semibold mb-4 border-b-2 border-gray-700 pb-2">3. Set Max Bet (Optional)</h2>
                                            <div className="bg-gray-800 p-4 rounded-lg flex items-center gap-4">
                                                <label htmlFor="max-bet" className="text-gray-400">Max bet per number:</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                                    <input id="max-bet" type="number" value={maxBet} onChange={(e) => setMaxBet(e.target.value)} placeholder="1000" className="bg-gray-700 text-white w-36 text-center rounded-md p-2 pl-7 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                                                </div>
                                            </div>
                                        </div>
                                         <div>
                                            <h2 className="text-2xl font-semibold mb-4 border-b-2 border-gray-700 pb-2">4. Betting Strategy</h2>
                                             <div className="bg-gray-800 p-4 rounded-lg flex flex-col gap-4">
                                                <div className="flex items-center gap-4">
                                                    <p className="text-gray-400 w-28">Main Strategy:</p>
                                                    <button onClick={() => setMainStrategy('standard')} className={`px-4 py-2 text-md font-bold rounded-lg transition-colors ${mainStrategy === 'standard' ? 'bg-blue-600 text-white ring-2 ring-blue-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Standard</button>
                                                    <button onClick={() => setMainStrategy('duck_ragu')} className={`px-4 py-2 text-md font-bold rounded-lg transition-colors ${mainStrategy === 'duck_ragu' ? 'bg-purple-600 text-white ring-2 ring-purple-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Duck Ragu</button>
                                                </div>
                                                {mainStrategy === 'standard' ? (
                                                <>
                                                    <div className="flex items-center gap-4">
                                                        <p className="text-gray-400 w-28">Press Type:</p>
                                                        <button onClick={() => setPressType('regular')} className={`px-4 py-2 text-md font-bold rounded-lg transition-colors ${pressType === 'regular' ? 'bg-yellow-500 text-white ring-2 ring-yellow-300' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Regular Press</button>
                                                        <button onClick={() => setPressType('power')} className={`px-4 py-2 text-md font-bold rounded-lg transition-colors ${pressType === 'power' ? 'bg-red-600 text-white ring-2 ring-red-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Power Press</button>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <p className="text-gray-400 w-28">On First Hit:</p>
                                                        <button onClick={() => setFirstAction('collect')} className={`px-4 py-2 text-md font-bold rounded-lg transition-colors ${firstAction === 'collect' ? 'bg-green-600 text-white ring-2 ring-green-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Collect First</button>
                                                        <button onClick={() => setFirstAction('press')} className={`px-4 py-2 text-md font-bold rounded-lg transition-colors ${firstAction === 'press' ? 'bg-yellow-500 text-white ring-2 ring-yellow-300' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Press First</button>
                                                    </div>
                                                </>
                                                ) : (
                                                    <p className="text-sm text-purple-300 italic">Duck Ragu is an automated opener. It starts with $12 on 6 & 8 and will revert to your selected Standard strategy after completion.</p>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                                <div>
                                    <h2 className="text-2xl font-semibold mb-4 border-b-2 border-gray-700 pb-2">{initialBankroll === null ? '5.' : '1.'} Select a Chip</h2>
                                    <div className="flex flex-wrap gap-3 bg-gray-800 p-4 rounded-lg">
                                        {CHIP_DENOMINATIONS.map(chip => (<button key={chip} onClick={() => setSelectedChip(chip)} className={`h-14 w-14 rounded-full font-bold text-lg flex items-center justify-center border-4 transition-all transform hover:scale-110 ${chip === 0.5 ? 'bg-white text-black border-gray-400' : ''} ${chip === 1 ? 'bg-blue-200 text-blue-800 border-blue-400' : ''} ${chip === 2 ? 'bg-yellow-200 text-yellow-800 border-yellow-400' : ''} ${chip === 5 ? 'bg-red-500 text-white border-red-300' : ''} ${chip === 10 ? 'bg-blue-500 text-white border-blue-300' : ''} ${chip === 25 ? 'bg-green-500 text-white border-green-300' : ''} ${chip === 50 ? 'bg-orange-500 text-white border-orange-300' : ''} ${chip === 100 ? 'bg-black text-white border-gray-400' : ''} ${selectedChip === chip ? 'ring-4 ring-offset-2 ring-offset-gray-800 ring-yellow-400' : ''}`}>{chip < 1 ? '50¢' : `$${chip}`}</button>))}
                                    </div>
                                </div>
                                {mainStrategy === 'standard' && (
                                <div>
                                    <h2 className="text-2xl font-semibold mb-4 border-b-2 border-gray-700 pb-2">{initialBankroll === null ? '6.' : '2.'} Quick Bets</h2>
                                    <div className="bg-gray-800 p-4 rounded-lg flex items-center flex-wrap gap-2">
                                        <p className="text-gray-400 mr-4">Based on selected chip:</p>
                                        <button onClick={handleBetAcross} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Bet Across</button>
                                        <button onClick={handleBetInside} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Bet Inside</button>
                                        <button onClick={handleBetOutside} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Bet Outside</button>
                                        <button onClick={handleBetPoles} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Bet Poles</button>
                                    </div>
                                </div>
                                )}
                            </>
                        )}


                        <div>
                             <h2 className="text-2xl font-semibold mb-4 border-b-2 border-gray-700 pb-2">
                                {mainStrategy === 'duck_ragu' ? 'Duck Ragu Starting Bets' : (initialBets === null ? `${initialBankroll === null ? '7.' : '3.'} Place Your Bets` : 'Current Bets')}
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {[4, 5, 6, 8, 9, 10].map(num => <BetInput key={num} number={num} />)}
                            </div>
                        </div>

                        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                            {initialBets === null ? (
                                <>
                                    {mainStrategy === 'standard' && <button onClick={handleClearAllBets} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-transform transform hover:scale-105 mb-4">Clear All Bets</button>}
                                    <button onClick={handleSetInitialBets} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg text-lg transition-transform transform hover:scale-105">{initialBankroll === null ? 'Start Session' : 'Lock In Bets for New Shooter'}</button>
                                </>
                            ) : (
                                <div>
                                    <h3 className="text-xl font-semibold text-center mb-4">Enter Next Roll</h3>
                                    <div className="flex flex-wrap justify-center gap-3">{POSSIBLE_ROLLS.map(rollNum => (<button key={rollNum} onClick={() => handleRoll(rollNum)} className={`w-16 h-16 text-2xl font-bold rounded-lg transition-transform transform hover:scale-110 ${rollNum === 7 ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>{rollNum}</button>))}</div>
                                </div>
                            )}
                             {initialBankroll !== null && (<button onClick={handleResetGame} className="w-full mt-6 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">Reset Session</button>)}
                        </div>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg space-y-6">
                        <h2 className="text-2xl font-semibold border-b-2 border-gray-700 pb-2">Shooter Status</h2>
                        <div className="flex flex-col gap-2 text-center">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-gray-700 p-2 rounded-lg"><div className="text-xs text-gray-400">Bet on Table</div><div className="text-lg font-bold text-yellow-400">{`$${totalBet.toFixed(2)}`}</div></div>
                                <div className="bg-gray-700 p-2 rounded-lg"><div className="text-xs text-gray-400">Point Winnings</div><div className={`text-lg font-bold ${pointPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{`$${pointPL.toFixed(2)}`}</div></div>
                            </div>
                            <div className="bg-gray-700 p-2 rounded-lg"><div className="text-xs text-gray-400">Shooter P/L</div><div className={`text-lg font-bold ${shooterPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{shooterPL >= 0 ? `$${shooterPL.toFixed(2)}` : `-$${Math.abs(shooterPL).toFixed(2)}`}</div></div>
                        </div>
                        <div className="text-center bg-gray-700 p-4 rounded-lg"><div className="text-sm text-gray-400">Point</div><div className={`text-5xl font-bold ${point ? 'text-white' : 'text-gray-500'}`}>{point || 'OFF'}</div></div>
                        {pointHistory.length > 0 && (<div className="bg-gray-700 p-3 rounded-lg"><h3 className="text-sm text-gray-400 text-center mb-2">Points Made This Roll</h3><div className="flex flex-wrap justify-center gap-2">{pointHistory.map((p, i) => (<div key={i} className={`px-3 py-1 rounded-full flex items-center gap-2 text-sm font-semibold ${p.profit > 0 ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}><span className="font-bold">{p.point}</span><span>{p.profit >= 0 ? `$${p.profit.toFixed(2)}` : `-$${Math.abs(p.profit).toFixed(2)}`}</span></div>))}</div></div>)}
                        {initialBankroll !== null && (<div className="space-y-4 text-center"><h2 className="text-2xl font-semibold border-b-2 border-gray-700 pb-2">Session Bankroll</h2><div className="flex flex-col gap-2 text-center"><div className="grid grid-cols-2 gap-2"><div className="bg-gray-700 p-2 rounded-lg"><div className="text-xs text-gray-400">Starting</div><div className="text-lg font-bold text-gray-300">{`$${initialBankroll.toFixed(2)}`}</div></div><div className="bg-gray-700 p-2 rounded-lg"><div className="text-xs text-gray-400">Current</div><div className="text-lg font-bold text-green-400">{`$${bankroll.toFixed(2)}`}</div></div></div><div className="bg-gray-700 p-2 rounded-lg"><div className="text-xs text-gray-400">Session P/L</div><div className={`text-lg font-bold ${sessionPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{sessionPL >= 0 ? `$${sessionPL.toFixed(2)}` : `-$${Math.abs(sessionPL).toFixed(2)}`}</div></div></div></div>)}
                        <div><div className="flex justify-between items-center mb-2"><h3 className="text-lg font-semibold">Log</h3><button id="copy-log-button" onClick={handleCopyLog} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1 px-3 rounded-lg transition-colors">Copy Log</button></div><div className="h-64 bg-gray-900 rounded-lg p-3 overflow-y-auto flex flex-col-reverse border border-gray-700">{messages.length === 0 ? (<div className="text-center text-gray-500 h-full flex items-center justify-center">Awaiting first action...</div>) : (messages.map((msg, index) => (<div key={index} className="text-sm mb-2"><span className="text-gray-500 mr-2">{msg.timestamp}</span><span className={msg.type === 'win' ? 'text-green-400' : msg.type === 'loss' ? 'text-red-400' : msg.type === 'info' ? 'text-blue-400' : 'text-gray-300'}>{msg.text}</span></div>)))}</div></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
