export interface Profile {
  id: number;
  name: string;
  pin_hash: string | null;
  created_at: number;
}

export interface Deck {
  id: number;
  profile_id: number;
  title: string;
  description: string | null;
  card_direction: 'front_to_back' | 'back_to_front';
  created_at: number;
}

export interface Card {
  id: number;
  deck_id: number;
  front: string;
  back: string;
  created_at: number;
}

export interface CardStats {
  id: number;
  card_id: number;
  profile_id: number;
  ease_factor: number;
  interval_days: number;
  due_date: number;
  total_reviews: number;
  correct_count: number;
  current_streak: number;
  last_reviewed: number | null;
}

export interface ReviewLog {
  id: number;
  card_id: number;
  profile_id: number;
  result: 0 | 1;
  interval_before: number;
  interval_after: number;
  reviewed_at: number;
}
