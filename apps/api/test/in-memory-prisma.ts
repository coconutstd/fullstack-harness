import { Prisma } from '@prisma/client';

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

function project(user: StoredUser, select?: Record<string, boolean>) {
  if (!select) return { ...user };
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(select)) {
    if (select[key]) out[key] = (user as unknown as Record<string, unknown>)[key];
  }
  return out;
}

/**
 * 실제 DB 없이 e2e 를 돌리기 위한 PrismaService 대체.
 * UNIQUE(email) 위반을 실제 Prisma 처럼 P2002 로 던져 409 매핑 경로를 실행 검증한다.
 */
export class InMemoryPrisma {
  private readonly byId = new Map<string, StoredUser>();
  private readonly byEmail = new Map<string, StoredUser>();
  private seq = 0;

  user = {
    create: async ({
      data,
      select,
    }: {
      data: { email: string; passwordHash: string };
      select?: Record<string, boolean>;
    }) => {
      if (this.byEmail.has(data.email)) {
        throw new Prisma.PrismaClientKnownRequestError(
          'Unique constraint failed on the fields: (`email`)',
          { code: 'P2002', clientVersion: '5.22.0', meta: { target: ['email'] } },
        );
      }
      const now = new Date();
      const user: StoredUser = {
        id: `clx_test_${++this.seq}`,
        email: data.email,
        passwordHash: data.passwordHash,
        createdAt: now,
        updatedAt: now,
      };
      this.byId.set(user.id, user);
      this.byEmail.set(user.email, user);
      return project(user, select);
    },

    findUnique: async ({
      where,
      select,
    }: {
      where: { id?: string; email?: string };
      select?: Record<string, boolean>;
    }) => {
      let found: StoredUser | undefined;
      if (where.id != null) found = this.byId.get(where.id);
      else if (where.email != null) found = this.byEmail.get(where.email);
      return found ? project(found, select) : null;
    },
  };

  // PrismaService 의 라이프사이클 훅(onModuleInit 등) 호출을 무해하게 흡수.
  async onModuleInit() {}
  async onModuleDestroy() {}
  async $connect() {}
  async $disconnect() {}
}
