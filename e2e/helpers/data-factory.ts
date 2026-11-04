/**
 * Test Data Factory for Group Pre-Order tests.
 * Provides isolated, randomized, and deterministic test payloads.
 */

import { createDynamicReservationInterval } from './date-helpers';

export interface Dish {
  id: string;
  name: string;
  price: number;
  weight: string;
  imageUrl?: string;
}

export interface OrderItem {
  dish: Dish;
  quantity: number;
}

export interface Participant {
  id: string;
  type: 'Owner' | 'Guest';
  name: string;
  isSubmitted: boolean;
  total: number;
  items: OrderItem[];
}

export interface GuestInvite {
  GroupReservationId: string;
  LocationId: string;
  RestaurantName: string;
  LocationAddress: string;
  StartTime: string;
  EndTime: string;
  MaxGuestCount: number;
  TableNumber: number;
  InviterName: string;
}

export interface GroupOrderSnapshot {
  reservationId: string;
  groupId: string;
  inviteToken: string;
  ownerSessionId: string;
  invite: GuestInvite;
  participants: Participant[];
  total: number;
  status: 'Open' | 'Submitted';
}

export const SAMPLE_DISHES: Record<string, Dish> = {
  SPRING_SALAD: {
    id: 'dish-spring-salad',
    name: 'Spring Salad',
    price: 12.0,
    weight: '430 g',
    imageUrl: 'assets/img/dishes/spring-salad.jpg',
  },
  AVOCADO_BOWL: {
    id: 'dish-avocado-bowl',
    name: 'Avocado Pine Nut Bowl',
    price: 14.5,
    weight: '380 g',
    imageUrl: 'assets/img/dishes/avocado-pine-nut-bowl.jpg',
  },
  STRAWBERRY_SALAD: {
    id: 'dish-strawberry-salad',
    name: 'Fresh Strawberry Mint Salad',
    price: 11.0,
    weight: '350 g',
    imageUrl: 'assets/img/dishes/fresh-strawberry-mint-salad.jpg',
  },
  POTATO_LENTIL: {
    id: 'dish-potato-lentil',
    name: 'Roasted Sweet Potato & Lentil Salad',
    price: 13.0,
    weight: '400 g',
    imageUrl: 'assets/img/dishes/roasted-sweet-potato-and-lentil-salad.jpg',
  },
};

export function calculateParticipantTotal(items: OrderItem[]): number {
  return items.reduce((acc, item) => acc + item.dish.price * item.quantity, 0);
}

/**
 * Creates an isolated group order snapshot with dynamic dates and unique IDs.
 */
export function buildTestGroupOrder(options?: {
  reservationId?: string;
  daysAhead?: number;
  maxGuests?: number;
  participants?: Participant[];
  status?: 'Open' | 'Submitted';
}): GroupOrderSnapshot {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const reservationId = options?.reservationId ?? `res-${uniqueSuffix}`;
  const groupId = `grp-${uniqueSuffix}`;
  const inviteToken = `tok-${uniqueSuffix}`;
  const ownerSessionId = `owner-${uniqueSuffix}`;

  const interval = createDynamicReservationInterval(options?.daysAhead ?? 2, 2);

  const defaultParticipants: Participant[] = [
    {
      id: ownerSessionId,
      type: 'Owner',
      name: 'Yevhenii (Owner)',
      isSubmitted: true,
      total: 26.5,
      items: [
        { dish: SAMPLE_DISHES.SPRING_SALAD, quantity: 1 },
        { dish: SAMPLE_DISHES.AVOCADO_BOWL, quantity: 1 },
      ],
    },
    {
      id: `guest-kateryna-${uniqueSuffix}`,
      type: 'Guest',
      name: 'Kateryna',
      isSubmitted: true,
      total: 24.0,
      items: [{ dish: SAMPLE_DISHES.SPRING_SALAD, quantity: 2 }],
    },
    {
      id: `guest-mariia-${uniqueSuffix}`,
      type: 'Guest',
      name: 'Mariia',
      isSubmitted: false,
      total: 24.0,
      items: [
        { dish: SAMPLE_DISHES.STRAWBERRY_SALAD, quantity: 1 },
        { dish: SAMPLE_DISHES.POTATO_LENTIL, quantity: 1 },
      ],
    },
    {
      id: `guest-mariana-${uniqueSuffix}`,
      type: 'Guest',
      name: 'Mariana',
      isSubmitted: false,
      total: 0,
      items: [],
    },
  ];

  const participants = options?.participants ?? defaultParticipants;
  const total = participants.reduce((acc, p) => acc + p.total, 0);

  const invite: GuestInvite = {
    GroupReservationId: groupId,
    LocationId: 'loc-main',
    RestaurantName: 'Green & Tasty',
    LocationAddress: 'Rustaveli Avenue 48',
    StartTime: interval.startTimeIso,
    EndTime: interval.endTimeIso,
    MaxGuestCount: options?.maxGuests ?? 5,
    TableNumber: 7,
    InviterName: 'Yevhenii',
  };

  return {
    reservationId,
    groupId,
    inviteToken,
    ownerSessionId,
    invite,
    participants,
    total,
    status: options?.status ?? 'Open',
  };
}

/**
 * Creates empty group order snapshot (no dishes added yet).
 */
export function buildEmptyGroupOrder(): GroupOrderSnapshot {
  const snapshot = buildTestGroupOrder();
  snapshot.participants = snapshot.participants.map((p) => ({
    ...p,
    items: [],
    total: 0,
    isSubmitted: false,
  }));
  snapshot.total = 0;
  return snapshot;
}
