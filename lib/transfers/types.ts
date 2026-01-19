// ============================================
// SidelineHQ Transfer System
// Types
// ============================================

export interface TransferListing {
  id: string;
  player_id: string;
  team_id: string;
  asking_price: number | null; // null = "Taking Offers"
  listed_at: string;
  status: 'active' | 'sold' | 'withdrawn' | 'expired';
  sold_to_team_id: string | null;
  sold_price: number | null;
  sold_at: string | null;
  // Joined data
  player?: {
    id: string;
    first_name: string;
    last_name: string;
    position: string;
    overall: number;
    age: number;
  };
  team?: {
    id: string;
    name: string;
    division: number;
  };
}

export interface TransferOffer {
  id: string;
  listing_id: string;
  from_team_id: string;
  offer_amount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
  responded_at: string | null;
  // Joined data
  from_team?: {
    id: string;
    name: string;
    division: number;
  };
  listing?: TransferListing;
}