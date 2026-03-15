'use client';

import { useState } from 'react';
import { topUpPool, setPoolTotal } from '@/db/actions/claim-actions';

export function PoolForm({ currentPool, totalClaimed }: { currentPool: number; totalClaimed: number }) {
  const [addAmount, setAddAmount] = useState('');
  const [setAmount, setSetAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const remaining = currentPool - totalClaimed;

  async function handleTopUp() {
    const amount = Number(addAmount);
    if (!amount || amount <= 0) return setMessage('Masukkan jumlah yang valid');
    setLoading(true);
    try {
      const newTotal = await topUpPool(amount);
      setMessage(`✅ Pool berhasil ditambah! Total pool sekarang: ${newTotal.toLocaleString()} TYSM`);
      setAddAmount('');
    } catch {
      setMessage('❌ Gagal top up pool');
    }
    setLoading(false);
  }

  async function handleSetPool() {
    const amount = Number(setAmount);
    if (!amount || amount <= 0) return setMessage('Masukkan jumlah yang valid');
    setLoading(true);
    try {
      const newTotal = await setPoolTotal(amount);
      setMessage(`✅ Pool diset ke ${newTotal.toLocaleString()} TYSM`);
      setSetAmount('');
    } catch {
      setMessage('❌ Gagal set pool');
    }
    setLoading(false);
  }

  return (
    <div>
      {/* Pool Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
        <PoolStat label="Total Pool" value={currentPool.toLocaleString()} color="#FFD700" />
        <PoolStat label="Sudah Diklaim" value={totalClaimed.toLocaleString()} color="#f87171" />
        <PoolStat label="Sisa Pool" value={remaining.toLocaleString()} color={remaining < 10000 ? '#f87171' : '#4ade80'} />
      </div>

      {remaining < 10000 && (
        <div style={{ background: '#2a1010', border: '1px solid #f87171', borderRadius: '8px', padding: '10px', marginBottom: '16px', fontSize: '12px', color: '#f87171' }}>
          ⚠️ Pool hampir habis! Sisa kurang dari 10,000 TYSM. Segera top up.
        </div>
      )}

      {/* Top Up Form */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '6px' }}>
          Tambah ke Pool (Top Up)
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="number"
            value={addAmount}
            onChange={(e) => setAddAmount(e.target.value)}
            placeholder="contoh: 500000"
            style={{
              flex: 1, background: '#0A0A0A', border: '1px solid #333', borderRadius: '8px',
              padding: '10px 12px', color: '#fff', fontSize: '14px', outline: 'none',
            }}
          />
          <button
            onClick={handleTopUp}
            disabled={loading}
            style={{
              background: '#FFD700', color: '#000', border: 'none', borderRadius: '8px',
              padding: '10px 16px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '...' : 'Top Up'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
          {[100000, 500000, 1000000].map((preset) => (
            <button
              key={preset}
              onClick={() => setAddAmount(String(preset))}
              style={{
                background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px',
                padding: '4px 10px', color: '#aaa', fontSize: '11px', cursor: 'pointer',
              }}
            >
              +{(preset / 1000).toFixed(0)}K
            </button>
          ))}
        </div>
      </div>

      {/* Set Pool Form */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '6px' }}>
          Set Pool ke Jumlah Tertentu
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="number"
            value={setAmount}
            onChange={(e) => setSetAmount(e.target.value)}
            placeholder="contoh: 2000000"
            style={{
              flex: 1, background: '#0A0A0A', border: '1px solid #333', borderRadius: '8px',
              padding: '10px 12px', color: '#fff', fontSize: '14px', outline: 'none',
            }}
          />
          <button
            onClick={handleSetPool}
            disabled={loading}
            style={{
              background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '8px',
              padding: '10px 16px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '...' : 'Set'}
          </button>
        </div>
      </div>

      {message && (
        <div style={{
          background: message.startsWith('✅') ? '#0f2a1a' : '#2a0f0f',
          border: `1px solid ${message.startsWith('✅') ? '#4ade80' : '#f87171'}`,
          borderRadius: '8px', padding: '10px 12px', fontSize: '13px',
          color: message.startsWith('✅') ? '#4ade80' : '#f87171',
        }}>
          {message}
        </div>
      )}
    </div>
  );
}

function PoolStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#0A0A0A', border: '1px solid #222', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
      <div style={{ fontSize: '16px', fontWeight: 'bold', color }}>{value}</div>
      <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{label}</div>
    </div>
  );
}
