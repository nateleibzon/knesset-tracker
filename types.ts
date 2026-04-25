
export enum Tag {
  Passed = 'Passed',
  Removed = 'Removed',
  Proposed = 'Proposed',
}

export enum InitiatorType {
  Government = 'Government',
  Private = 'Private',
}

export enum BlocType {
  Coalition = 'Coalition',
  Opposition = 'Opposition',
}

export enum PlatformAlignment {
  Aligned = 'Aligned',       // Matches platform
  Conflicting = 'Conflicting', // Contradicts platform
  Neutral = 'Neutral'        // Unrelated
}

// Raw API Response Shapes
export interface KNS_Status {
  StatusID: number;
  StatusDesc: string;
}

export interface KNS_Bill {
  ID: number;
  Name: string;
  StatusID: number;
  KnessetNum: number;
  IsGovernmentBill: boolean;
  PublicationDate: string | null; // ISO string
  LastUpdatedDate: string; // ISO string
  Summary: string | null;
  Explanation: string | null;
  LawID: number | null;
  DocID: number | null;
}

export interface KNS_BillInitiator {
  BillID: number;
  PersonID: number;
}

export interface KNS_Person {
  PersonID: number;
  FullName: string;
}

export interface KNS_Mk {
  PersonID: number;
  CurrentFactionID: number | null;
}

export interface KNS_Faction {
  FactionID: number;
  Name: string;
}

export interface KNS_BillHistory {
  BillID: number;
  EventDate: string;
  StageDesc: string;
  CommitteeName: string | null;
  Notes: string | null;
}

// App Internal Model

export interface Initiator {
  id: number;
  name: string;
  party: string | null;
  role: string | null; // e.g., 'חבר כנסת'
}

export interface AIAnalysis {
  currentSituation: string;
  proposedChange: string;
  beneficiaryPopulation: string; // Who benefits from the law
  isLoading?: boolean;
}

export interface BillModel {
  id: number;
  name: string;
  statusId: number;
  statusDesc: string; // Denormalized for easier access
  knessetNum: number;
  isGovernment: boolean;
  publicationDate: string | null;
  lastUpdatedDate: string;
  summary: string;
  explanation: string;
  lawId: number | null;
  docId: number | null;
  
  // Computed
  tag: Tag;
  initiatorType: InitiatorType;
  officialUrl: string;
  displaySummary: string;
  initiators: Initiator[];
  initiatorIds: number[];
  initiatorNames: string[]; // Populated after join
  
  // Political
  isCoalition: boolean;
  platformAlignment: PlatformAlignment; // New field

  // AI
  aiAnalysis?: AIAnalysis;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface FilterConfig {
  tag?: Tag | 'All';
  initiatorType?: InitiatorType | 'All';
  blocType?: BlocType | 'All';
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  onlyFavorites?: boolean;
  onlyReminders?: boolean;
  partyName?: string; // NEW: Support filtering by party
}

export interface FilterState {
  tags: Tag[];
  initiatorTypes: InitiatorType[];
  knessetNum: number | null;
  searchText: string;
  dateRangeStart: Date | null; // For simplicity, mostly handled as "last 12 months" in defaults
}

export interface Party {
  id: number; // mapped to FactionID roughly
  name: string;
  description: string;
  agenda: string[]; // Bullet points
  website: string;
  color: string;
  logoChar: string;
  supportKeywords: string[]; // Keywords that indicate alignment
  opposeKeywords: string[];  // Keywords that indicate conflict
}

export interface PartyStats {
  party: Party;
  totalProposed: number;
  totalPassed: number;
  loyaltyScore: number; // 0-100
  billsForAligned: BillModel[];
  billsAgainstConflicting: BillModel[];
  billsForConflicting: BillModel[];
  billsAgainstAligned: BillModel[];
}
