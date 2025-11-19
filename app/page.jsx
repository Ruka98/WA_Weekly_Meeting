'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'iwmi_team_members';
const roles = [
  'Serious Presentation',
  'Semi-Serious Presentation',
  'New Tool / Paper Demo'
];

const getLinesFromText = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const pickUniqueIndices = (length, count) => {
  const indices = new Set();
  while (indices.size < Math.min(count, length)) {
    indices.add(Math.floor(Math.random() * length));
  }
  return [...indices];
};

export default function Home() {
  const [teamText, setTeamText] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [shuffleNames, setShuffleNames] = useState([]);
  const [activeIndices, setActiveIndices] = useState([]);
  const [countdown, setCountdown] = useState(5);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showSelection, setShowSelection] = useState(false);
  const [winners, setWinners] = useState(['...', '...', '...']);
  const [notification, setNotification] = useState('');
  const [showNotification, setShowNotification] = useState(false);

  const shuffleIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const revealTimeoutRef = useRef(null);
  const notificationTimeoutRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (shuffleIntervalRef.current) {
      clearInterval(shuffleIntervalRef.current);
      shuffleIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
  }, []);

  const parsedLines = useMemo(() => getLinesFromText(teamText), [teamText]);
  const canStart = parsedLines.length >= 3 && !isSelecting;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setTeamMembers(parsed);
          setTeamText(parsed.join('\n'));
        }
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [clearTimers]);

  const persistTeam = useCallback((names) => {
    setTeamMembers(names);
    if (typeof window !== 'undefined') {
      if (names.length) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const notify = useCallback((message) => {
    setNotification(message);
    setShowNotification(true);
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    notificationTimeoutRef.current = setTimeout(() => {
      setShowNotification(false);
    }, 2200);
  }, []);

  const saveTeam = useCallback(() => {
    const names = parsedLines;
    persistTeam(names);
    setTeamText(names.join('\n'));
    notify('Saved');
  }, [parsedLines, persistTeam, notify]);

  const sortTeam = useCallback(() => {
    if (!parsedLines.length) return;
    const sorted = [...parsedLines].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
    persistTeam(sorted);
    setTeamText(sorted.join('\n'));
    notify('Sorted A–Z');
  }, [parsedLines, persistTeam, notify]);

  const clearTeam = useCallback(() => {
    if (!teamText.trim() && !teamMembers.length) return;
    if (typeof window !== 'undefined' && !window.confirm('Clear all names?')) {
      return;
    }
    clearTimers();
    setIsSelecting(false);
    setShuffleNames([]);
    setActiveIndices([]);
    setCountdown(5);
    persistTeam([]);
    setTeamText('');
    setWinners(['...', '...', '...']);
    setShowSelection(false);
    notify('Cleared');
  }, [clearTimers, notify, persistTeam, teamMembers.length, teamText]);

  const revealWinners = (names) => {
    const randomized = [...names].sort(() => Math.random() - 0.5);
    const topThree = randomized.slice(0, 3);
    setWinners(topThree);
    setShowSelection(true);
    setIsSelecting(false);
  };

  const startSelection = () => {
    const names = parsedLines;
    if (names.length < 3) {
      notify('Need at least 3 names');
      return;
    }

    persistTeam(names);
    setTeamText(names.join('\n'));
    setShuffleNames(names);
    setShowSelection(false);
    setCountdown(5);
    setActiveIndices([]);
    setIsSelecting(true);

    clearTimers();

    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    shuffleIntervalRef.current = window.setInterval(() => {
      setActiveIndices(pickUniqueIndices(names.length, 3));
    }, 150);

    revealTimeoutRef.current = window.setTimeout(() => {
      clearTimers();
      revealWinners(names);
    }, 5000);
  };

  const nameCountLabel = parsedLines.length === 1 ? '1 name' : `${parsedLines.length} names`;

  return (
    <>
      <header>
        <div className="header-dots" />
        <div className="header-inner">
          <Image src="/assets/iwmi.png" alt="IWMI Logo" className="logo-left" width={300} height={120} priority />
          <div className="title-group">
            <h1>IWMI Water Accounting</h1>
            <p>Random Presenter Selector – Weekly Meeting</p>
          </div>
          <Image src="/assets/siwa.png" alt="SIWA+ Logo" className="logo-right" width={300} height={140} priority />
        </div>
      </header>

      <main className="container">
        <section className="card">
          <h2>Team List Editor</h2>
          <p className="desc">
            Type all team members here, <strong>one name per line</strong>. Data is saved in your browser (local “db”) on
            this device.
          </p>

          <textarea
            id="teamTextBox"
            value={teamText}
            onChange={(event) => setTeamText(event.target.value)}
            placeholder={'Example:\nAlice\nBob\nCharlie'}
          />

          <div className="button-row">
            <button type="button" className="btn btn-primary" onClick={saveTeam}>
              Save / Update Team
            </button>
            <button type="button" className="btn btn-outline" onClick={sortTeam}>
              Sort A–Z
            </button>
            <button type="button" className="btn btn-danger" onClick={clearTeam}>
              Clear All
            </button>
          </div>

          <p id="teamCount" className="count">
            {nameCountLabel}
          </p>
        </section>

        <section className="card selection-area">
          <h2>Random Presenter Selection</h2>
          <p className="desc" style={{ fontSize: 15, maxWidth: 520, margin: '0 auto 16px' }}>
            Picks 3 random people from the list above for:<br />
            Serious Presentation • Semi-Serious • New Tool / Paper Demo
          </p>

          <button type="button" className="start-btn" onClick={startSelection} disabled={!canStart}>
            Start Selection
          </button>

          {isSelecting && (
            <div id="shuffleAnimation">
              <div className="countdown">{countdown}</div>
              <div className="shuffle-container">
                {shuffleNames.map((name, index) => (
                  <div key={`${name}-${index}`} className={`shuffle-card${activeIndices.includes(index) ? ' active' : ''}`}>
                    {name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {showSelection && (
            <div id="selectionAnimation" className="selection-animation">
              {roles.map((role, idx) => (
                <div key={role} className="winner-card">
                  <div className="role-badge">{role}</div>
                  <div className="winner-name">{winners[idx] ?? '...'}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <div className={`notification${showNotification ? ' show' : ''}`}>{notification}</div>
    </>
  );
}
