import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/neynar-db-sdk/db';
import { userStreaks } from '@/db/schema';
import { desc, ilike, or, sql } from 'drizzle-orm';

const CREATOR_FID = Number(process.env.NEXT_PUBLIC_USER_FID ?? 0);
const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const fidHeader = req.headers.get('x-fid');
  const fid = Number(fidHeader ?? 0);

  if (!fid || fid !== CREATOR_FID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? 1));
  const search = searchParams.get('search') ?? '';
  const offset = (page - 1) * PAGE_SIZE;

  try {
    const baseQuery = db.select().from(userStreaks);

    let users;
    let totalResult;

    if (search) {
      users = await baseQuery
        .where(ilike(userStreaks.username, `%${search}%`))
        .orderBy(desc(userStreaks.tysmBalance))
        .limit(PAGE_SIZE)
        .offset(offset);

      totalResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(userStreaks)
        .where(ilike(userStreaks.username, `%${search}%`));
    } else {
      users = await baseQuery
        .orderBy(desc(userStreaks.tysmBalance))
        .limit(PAGE_SIZE)
        .offset(offset);

      totalResult = await db.select({ count: sql<number>`COUNT(*)` }).from(userStreaks);
    }

    const total = Number(totalResult[0]?.count ?? 0);

    return NextResponse.json({
      users,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (err) {
    console.error('[admin/users] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
