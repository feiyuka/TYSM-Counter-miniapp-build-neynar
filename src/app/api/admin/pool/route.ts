import { NextRequest, NextResponse } from 'next/server';
import { topUpPool, setPoolTotal } from '@/db/actions/claim-actions';
import { privateConfig } from '@/config/private-config';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-notify-secret');
  if (secret !== privateConfig.notifySecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, amount } = body;

    if (!amount || isNaN(Number(amount))) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (action === 'topup') {
      const newTotal = await topUpPool(Number(amount));
      return NextResponse.json({ success: true, newTotal });
    }

    if (action === 'set') {
      const newTotal = await setPoolTotal(Number(amount));
      return NextResponse.json({ success: true, newTotal });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[admin/pool] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
