import React, { useState, useMemo } from 'react';

// --- Helper Functions and Constants ---

// Payout odds for place bets
const PLACE_PAYOUTS = {
    4: 9 / 5,
    5: 7 / 5,
    6: 7 / 6,
    8: 7 / 6,
    9: 7 / 5,
    10: 9 / 5,
};

// Payout odds for buy bets (commission is handled separately)
const BUY_PAYOUTS = {
    4: 2 / 1,
    5: 3 / 2,
    6: 6 / 5,
    8: 6 / 5,
    9: 3 / 2,
    10: 2 / 1,
};

// Special betting amounts for the 6 and 8 based on the selected chip
const SIX_EIGHT_BETS = {
    0.5: 0.5,
    1: 1.5,
    2: 3,
    5: 6,
    10: 12,
    25: 30,
    50: 60,
    100: 120,
};

const CHIP_DENOMINATIONS = [0.5, 1, 2, 5, 10, 25, 50, 100];
const POSSIBLE_ROLLS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

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
    
    // Bankroll State
    const [bankroll, setBankroll] = useState(600);
    const [initialBankroll, setInitialBankroll] = useState(null);
    const [bankrollInput, setBankrollInput] = useState('600');
    
    // P/L State
    const [pointWinnings, setPointWinnings] = useState(0);
    const [shooterWinnings, setShooterWinnings] = useState(0);


    // --- Memoized Calculations ---
    const totalBet = useMemo(() => Object.values(bets).reduce((sum, bet) => sum + Number(bet), 0), [bets]);
    
    const sessionPL = useMemo(() => {
        if (initialBankroll === null) return 0;
        return bankroll - initialBankroll;
    }, [bankroll, initialBankroll]);

    const pointPL = useMemo(() => {
        if (point === null) return 0;
        return pointWinnings;
    }, [pointWinnings, point]);

    const shooterNetPL = useMemo(() => {
        if (initialBets === null && initialBankroll !== null) {
            return shooterWinnings;
        }
        return shooterWinnings - totalBet;
    }, [shooterWinnings, totalBet, initialBets, initialBankroll]);


    // --- Core Game Logic ---
    const handleAddBet = (number) => {
        if (initialBets) return;
        setBets(prev => ({ ...prev, [number]: prev[number] + selectedChip }));
    };

    const handleClearBet = (number) => {
        if (initialBets) return;
        setBets(prev => ({ ...prev, [number]: 0 }));
    };

    const handleBetTypeChange = (number, type) => {
        if (initialBets) return;
        setBetTypes(prev => ({ ...prev, [number]: type }));
    };

    const handleBetAcross = () => {
        if (initialBets) return;
        const sixEightBet = SIX_EIGHT_BETS[selectedChip];
        if (!sixEightBet && selectedChip !== 0.5) return;
        setBets({ 4: selectedChip, 5: selectedChip, 6: sixEightBet || 0, 8: sixEightBet || 0, 9: selectedChip, 10: selectedChip });
    };

    const handleBetInside = () => {
        if (initialBets) return;
        const sixEightBet = SIX_EIGHT_BETS[selectedChip];
        if (!sixEightBet && selectedChip !== 0.5) return;
        setBets({ 4: 0, 5: selectedChip, 6: sixEightBet || 0, 8: sixEightBet || 0, 9: selectedChip, 10: 0 });
    };

    const handleBetOutside = () => {
        if (initialBets) return;
        setBets({ 4: selectedChip, 5: selectedChip, 6: 0, 8: 0, 9: selectedChip, 10: selectedChip });
    };

    const handleBetPoles = () => {
        if (initialBets) return;
        setBets({ 4: selectedChip, 5: 0, 6: 0, 8: 0, 9: 0, 10: selectedChip });
    };
    
    const handleClearAllBets = () => {
        if (initialBets) return;
        setBets({ 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0 });
    };

    const handleSetInitialBets = () => {
        const betsToPlace = { ...bets };
        
        if (initialBankroll === null) {
            const startingBankroll = Number(bankrollInput) || 600;
            setInitialBankroll(startingBankroll);
            setBankroll(startingBankroll);
            addMessage(`Starting bankroll set to $${startingBankroll.toFixed(2)}.`, "info");
        }
        
        setInitialBets(betsToPlace);
        setBets({ 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0 });
        setShooterWinnings(0);
        
        addMessage(`Bets of $${Object.values(betsToPlace).reduce((s, b) => s + b, 0).toFixed(2)} are ready.`, "info");
        
        if (point) {
             addMessage(`Point is ON: ${point}. Placing bets now.`, "info");
             const totalPlacedBet = Object.values(betsToPlace).reduce((s,b) => s+b, 0);
             setBankroll(prev => prev - totalPlacedBet);
             setBets(betsToPlace);
             
             const newTracker = {};
             Object.keys(betsToPlace).forEach(num => {
                 if (betsToPlace[num] > 0) newTracker[num] = 'collect';
             });
             setStrategyTracker(newTracker);

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
        setBankroll(600);
        setInitialBankroll(null);
        setBankrollInput('600');
        setPointWinnings(0);
        setShooterWinnings(0);
    };

    const addMessage = (text, type) => {
        setMessages(prev => [{ text, type, timestamp: new Date().toLocaleTimeString() }, ...prev]);
    };

    const handleRoll = (rollValue) => {
        addMessage(`Rolled a ${rollValue}.`, 'roll');

        // --- COME-OUT ROLL LOGIC ---
        if (!point) {
            if ([4, 5, 6, 8, 9, 10].includes(rollValue)) {
                if (totalBet === 0 && initialBets) {
                    const betsToPlace = initialBets;
                    const totalPlacedBet = Object.values(betsToPlace).reduce((s, b) => s + b, 0);
                    setBets(betsToPlace);
                    setBankroll(prev => prev - totalPlacedBet);

                    const newTracker = {};
                    Object.keys(betsToPlace).forEach(num => {
                        if (betsToPlace[num] > 0) newTracker[num] = 'collect';
                    });
                    setStrategyTracker(newTracker);
                    addMessage(`Placing $${totalPlacedBet.toFixed(2)}. Bets are ON.`, 'info');
                }
                setPoint(rollValue);
                addMessage(`Point is set to ${rollValue}.`, 'info');
            } else {
                addMessage("Come-out roll. No change.", 'info');
            }
            return;
        }

        // --- POINT IS ON LOGIC ---
        if (rollValue === 7) {
            const lostAmount = totalBet;
            const finalShooterPL = shooterWinnings - lostAmount;

            addMessage(`Seven out. Lost $${lostAmount.toFixed(2)}.`, 'loss');
            addMessage(`Final P/L for this shooter: $${finalShooterPL.toFixed(2)}`, 'info');
            
            setShooterWinnings(finalShooterPL);
            setPoint(null);
            setPointWinnings(0);
            setBets({ 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0 });
            setStrategyTracker({});
            setInitialBets(null);
            
            addMessage(`New shooter. Please place your bets and click "Lock In Bets".`, 'info');
            return;
        }

        if (rollValue === point) {
            setPoint(null);
            setPointWinnings(0);
            
            addMessage(`Point ${rollValue} hit! Winner!`, 'win');
            addMessage(`Bets remain ON for the new come-out roll.`, 'info');
            return;
        }

        if (bets[rollValue] > 0) {
            const betAmount = bets[rollValue];
            const betType = betTypes[rollValue];
            let payout = 0;

            if (betType === 'place') {
                payout = betAmount * PLACE_PAYOUTS[rollValue];
            } else { // buy
                payout = betAmount * BUY_PAYOUTS[rollValue];
                payout -= betAmount * 0.05; // 5% vig
            }
            
            setPointWinnings(prev => prev + payout);
            setShooterWinnings(prev => prev + payout);
            
            const action = strategyTracker[rollValue];
            if (!action) {
                addMessage(`Error: No strategy found for bet on ${rollValue}. Defaulting to COLLECT.`, 'loss');
                setBankroll(prev => prev + payout);
                return;
            }

            addMessage(`Hit on ${rollValue}! Bet was $${betAmount.toFixed(2)}. Action: ${action.toUpperCase()}.`, 'win');

            if (action === 'collect') {
                setBankroll(prev => prev + payout);
                setStrategyTracker(prev => ({ ...prev, [rollValue]: 'press' }));
                addMessage(`Collected $${payout.toFixed(2)}. Next action for ${rollValue} is PRESS.`, 'info');
            } else { // 'press'
                const maxBetLimit = Number(maxBet);
                const newBetAmount = betAmount * 2;

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
                        addMessage(`Pressed bet to max of $${maxBetLimit.toFixed(2)}. Collected $${leftover.toFixed(2)} change.`, 'info');
                    } else {
                        setBankroll(prev => prev + payout);
                        addMessage(`Not enough winnings to press to max. Collecting $${payout.toFixed(2)}.`, 'info');
                    }
                } else {
                    const costToPress = betAmount;
                    const leftover = payout - costToPress;
                    setBets(prev => ({ ...prev, [rollValue]: newBetAmount }));
                    setBankroll(prev => prev + leftover);
                    setStrategyTracker(prev => ({ ...prev, [rollValue]: 'collect' }));

                    let pressMessage = `Pressed bet on ${rollValue} to $${newBetAmount.toFixed(2)}.`;
                    pressMessage += ` Collected $${leftover.toFixed(2)} change.`;
                    pressMessage += ` Next action for ${rollValue} is COLLECT.`;
                    addMessage(pressMessage, 'info');
                }
            }
        }
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
            {initialBets && bets[number] > 0 && (
                 <div className="text-center mt-2">
                    <div className="text-xs text-gray-400">Next Action</div>
                    <div className={`font-bold text-lg ${strategyTracker[number] === 'press' ? 'text-yellow-400' : 'text-green-400'}`}>
                        {strategyTracker[number]?.toUpperCase()}
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
                                                    <input
                                                        id="bankroll"
                                                        type="number"
                                                        value={bankrollInput}
                                                        onChange={(e) => setBankrollInput(e.target.value)}
                                                        placeholder="600"
                                                        disabled={initialBankroll !== null}
                                                        className="bg-gray-700 text-white w-36 text-center rounded-md p-2 pl-7 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-70"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-semibold mb-4 border-b-2 border-gray-700 pb-2">2. Set the Point (Optional)</h2>
                                            <div className="flex flex-wrap gap-3 items-center bg-gray-800 p-4 rounded-lg">
                                                <p className="text-gray-400 mr-2">Start with point ON:</p>
                                                {[4, 5, 6, 8, 9, 10].map(p => (
                                                    <button
                                                        key={p}
                                                        onClick={() => setPoint(p)}
                                                        className={`w-12 h-12 text-xl font-bold rounded-lg transition-colors ${point === p ? 'bg-blue-600 text-white ring-2 ring-blue-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                                    >
                                                        {p}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-semibold mb-4 border-b-2 border-gray-700 pb-2">3. Set Max Bet (Optional)</h2>
                                            <div className="bg-gray-800 p-4 rounded-lg flex items-center gap-4">
                                                <label htmlFor="max-bet" className="text-gray-400">Max bet per number:</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                                    <input
                                                        id="max-bet"
                                                        type="number"
                                                        value={maxBet}
                                                        onChange={(e) => setMaxBet(e.target.value)}
                                                        placeholder="1000"
                                                        className="bg-gray-700 text-white w-36 text-center rounded-md p-2 pl-7 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                                <div>
                                    <h2 className="text-2xl font-semibold mb-4 border-b-2 border-gray-700 pb-2">{initialBankroll === null ? '4.' : '1.'} Select a Chip</h2>
                                    <div className="flex flex-wrap gap-3 bg-gray-800 p-4 rounded-lg">
                                        {CHIP_DENOMINATIONS.map(chip => (
                                            <button
                                                key={chip}
                                                onClick={() => setSelectedChip(chip)}
                                                className={`h-14 w-14 rounded-full font-bold text-lg flex items-center justify-center border-4 transition-all transform hover:scale-110
                                                    ${chip === 0.5 ? 'bg-white text-black border-gray-400' : ''}
                                                    ${chip === 1 ? 'bg-blue-200 text-blue-800 border-blue-400' : ''}
                                                    ${chip === 2 ? 'bg-yellow-200 text-yellow-800 border-yellow-400' : ''}
                                                    ${chip === 5 ? 'bg-red-500 text-white border-red-300' : ''}
                                                    ${chip === 10 ? 'bg-blue-500 text-white border-blue-300' : ''}
                                                    ${chip === 25 ? 'bg-green-500 text-white border-green-300' : ''}
                                                    ${chip === 50 ? 'bg-orange-500 text-white border-orange-300' : ''}
                                                    ${chip === 100 ? 'bg-black text-white border-gray-400' : ''}
                                                    ${selectedChip === chip ? 'ring-4 ring-offset-2 ring-offset-gray-800 ring-yellow-400' : ''}
                                                `}
                                            >
                                                {chip < 1 ? '50¢' : `$${chip}`}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-semibold mb-4 border-b-2 border-gray-700 pb-2">{initialBankroll === null ? '5.' : '2.'} Quick Bets</h2>
                                    <div className="bg-gray-800 p-4 rounded-lg flex items-center flex-wrap gap-2">
                                        <p className="text-gray-400 mr-4">Based on selected chip:</p>
                                        <button onClick={handleBetAcross} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                            Bet Across
                                        </button>
                                        <button onClick={handleBetInside} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                            Bet Inside
                                        </button>
                                        <button onClick={handleBetOutside} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                            Bet Outside
                                        </button>
                                        <button onClick={handleBetPoles} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                            Bet Poles
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}


                        <div>
                             <h2 className="text-2xl font-semibold mb-4 border-b-2 border-gray-700 pb-2">
                                {initialBets === null ? `${initialBankroll === null ? '6.' : '3.'} Place Your Bets` : 'Current Bets'}
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {[4, 5, 6, 8, 9, 10].map(num => <BetInput key={num} number={num} />)}
                            </div>
                        </div>

                        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                            {initialBets === null ? (
                                <>
                                    <button onClick={handleClearAllBets} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-transform transform hover:scale-105 mb-4">
                                        Clear All Bets
                                    </button>
                                    <button
                                        onClick={handleSetInitialBets}
                                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg text-lg transition-transform transform hover:scale-105"
                                    >
                                        {initialBankroll === null ? 'Start Session' : 'Lock In Bets for New Shooter'}
                                    </button>
                                </>
                            ) : (
                                <div>
                                    <h3 className="text-xl font-semibold text-center mb-4">Enter Next Roll</h3>
                                    <div className="flex flex-wrap justify-center gap-3">
                                        {POSSIBLE_ROLLS.map(rollNum => (
                                            <button
                                                key={rollNum}
                                                onClick={() => handleRoll(rollNum)}
                                                className={`w-16 h-16 text-2xl font-bold rounded-lg transition-transform transform hover:scale-110 ${rollNum === 7 ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                                            >
                                                {rollNum}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                             {initialBankroll !== null && (
                                 <button onClick={handleResetGame} className="w-full mt-6 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                                    Reset Session
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg space-y-6">
                        <h2 className="text-2xl font-semibold border-b-2 border-gray-700 pb-2">Shooter Status</h2>
                        
                        <div className="flex flex-col gap-2 text-center">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-gray-700 p-2 rounded-lg">
                                    <div className="text-xs text-gray-400">Bet on Table</div>
                                    <div className="text-lg font-bold text-yellow-400">
                                        {`$${totalBet.toFixed(2)}`}
                                    </div>
                                </div>
                                <div className="bg-gray-700 p-2 rounded-lg">
                                    <div className="text-xs text-gray-400">Point P/L</div>
                                    <div className={`text-lg font-bold ${pointPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                         {`$${pointPL.toFixed(2)}`}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-700 p-2 rounded-lg">
                                <div className="text-xs text-gray-400">Shooter P/L</div>
                                <div className={`text-lg font-bold ${shooterNetPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                     {shooterNetPL >= 0 ? `$${shooterNetPL.toFixed(2)}` : `-$${Math.abs(shooterNetPL).toFixed(2)}`}
                                </div>
                            </div>
                        </div>
                        
                        <div className="text-center bg-gray-700 p-4 rounded-lg">
                             <div className="text-sm text-gray-400">Point</div>
                             <div className={`text-5xl font-bold ${point ? 'text-white' : 'text-gray-500'}`}>
                                {point || 'OFF'}
                            </div>
                        </div>

                        {initialBankroll !== null && (
                             <div className="space-y-4 text-center">
                                <h2 className="text-2xl font-semibold border-b-2 border-gray-700 pb-2">Session Bankroll</h2>
                                <div className="flex flex-col gap-2 text-center">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-gray-700 p-2 rounded-lg">
                                            <div className="text-xs text-gray-400">Starting</div>
                                            <div className="text-lg font-bold text-gray-300">
                                                {`$${initialBankroll.toFixed(2)}`}
                                            </div>
                                        </div>
                                        <div className="bg-gray-700 p-2 rounded-lg">
                                            <div className="text-xs text-gray-400">Current</div>
                                            <div className="text-lg font-bold text-green-400">
                                                {`$${bankroll.toFixed(2)}`}
                                            </div>
                                        </div>
                                    </div>
                                     <div className="bg-gray-700 p-2 rounded-lg">
                                        <div className="text-xs text-gray-400">Session P/L</div>
                                        <div className={`text-lg font-bold ${sessionPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {sessionPL >= 0 ? `$${sessionPL.toFixed(2)}` : `-$${Math.abs(sessionPL).toFixed(2)}`}
                                        </div>
                                    </div>
                                </div>
                             </div>
                        )}

                        <div>
                            <h3 className="text-lg font-semibold mb-2">Log</h3>
                            <div className="h-64 bg-gray-900 rounded-lg p-3 overflow-y-auto flex flex-col-reverse border border-gray-700">
                                {messages.length === 0 ? (
                                    <div className="text-center text-gray-500 h-full flex items-center justify-center">
                                        Awaiting first action...
                                    </div>
                                ) : (
                                    messages.map((msg, index) => (
                                        <div key={index} className="text-sm mb-2">
                                            <span className="text-gray-500 mr-2">{msg.timestamp}</span>
                                            <span className={
                                                msg.type === 'win' ? 'text-green-400' :
                                                msg.type === 'loss' ? 'text-red-400' :
                                                msg.type === 'info' ? 'text-blue-400' :
                                                'text-gray-300'
                                            }>
                                                {msg.text}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


