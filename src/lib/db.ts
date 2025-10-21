import { prisma } from './prisma';

export async function createUser(data: {
  email: string;
  password: string;
  name?: string;
  role: "ADMIN" | "STUDENT";
}) {
  return prisma.user.create({
    data
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email }
  });
}

export async function createLostItem(data: {
  title: string;
  description: string;
  category: string;
  location?: string;
  lostDate: Date;
  imageUrl?: string;
  userId: string;
}) {
  return prisma.lostItem.create({
    data
  });
}

export async function createFoundItem(data: {
  title: string;
  description: string;
  category: string;
  location: string;
  foundDate: Date;
  imageUrl?: string;
  userId: string;
}) {
  return prisma.foundItem.create({
    data
  });
}

export async function searchLostItems(query: string) {
  return prisma.lostItem.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
        { location: { contains: query, mode: 'insensitive' } }
      ]
    },
    include: {
      reportedBy: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });
}

export async function searchFoundItems(query: string) {
  return prisma.foundItem.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
        { location: { contains: query, mode: 'insensitive' } }
      ]
    },
    include: {
      reportedBy: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });
}