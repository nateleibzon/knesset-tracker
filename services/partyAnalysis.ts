
import { BillModel, Party, PlatformAlignment, PartyStats, Tag } from '../types';
import { PARTIES_DATA } from './partyData';

// --- Logic Helpers ---

// Check if any keyword exists in text
const matchesKeywords = (text: string, keywords: string[]): boolean => {
    if (!keywords || keywords.length === 0) return false;
    const lowerText = text.toLowerCase();
    return keywords.some(k => lowerText.includes(k.toLowerCase()));
};

// Advanced Analysis: Semantic + Political Fallback
export const analyzeAlignment = (bill: BillModel, party: Party): PlatformAlignment => {
    // 1. Semantic Check (Ideological)
    const text = (bill.name + " " + bill.summary + " " + (bill.explanation || "")).replace(/[^\u0590-\u05FF ]/g, ""); // Clean text

    const supports = matchesKeywords(text, party.supportKeywords);
    const opposes = matchesKeywords(text, party.opposeKeywords);

    if (supports && !opposes) return PlatformAlignment.Aligned;
    if (opposes && !supports) return PlatformAlignment.Conflicting;
    if (supports && opposes) return PlatformAlignment.Conflicting; // Mixed signals usually mean conflict/complexity
    
    // 2. Political Heuristic Fallback
    const coalitionIds = [1, 3, 4, 5]; 
    const isPartyCoalition = coalitionIds.includes(party.id);

    if (bill.isCoalition) {
        return isPartyCoalition ? PlatformAlignment.Aligned : PlatformAlignment.Conflicting;
    } else {
        return !isPartyCoalition ? PlatformAlignment.Aligned : PlatformAlignment.Conflicting;
    }
};

// Simulate Vote logic (Coalition/Opposition discipline + Ideology)
// 1 = For, -1 = Against
const simulateVote = (partyId: number, bill: BillModel, alignment: PlatformAlignment): number => {
    const coalitionIds = [1, 3, 4, 5]; 
    const isPartyCoalition = coalitionIds.includes(partyId);

    const isRebelling = alignment === PlatformAlignment.Conflicting && Math.random() < 0.15; // 15% chance to break discipline

    let baseVote = 0; 

    if (bill.isGovernment) {
        baseVote = isPartyCoalition ? 1 : -1;
    } else {
        if (bill.isCoalition) {
            baseVote = isPartyCoalition ? 1 : -1;
        } else {
            baseVote = isPartyCoalition ? -1 : 1;
        }
    }

    if (isRebelling) {
        return baseVote * -1;
    }
    return baseVote;
};

export const calculateAllPartyStats = (bills: BillModel[]): PartyStats[] => {
    const stats: PartyStats[] = [];

    PARTIES_DATA.forEach(party => {
        const data: PartyStats = {
            party,
            totalProposed: 0,
            totalPassed: 0,
            loyaltyScore: 0,
            billsForAligned: [],
            billsAgainstConflicting: [],
            billsForConflicting: [],
            billsAgainstAligned: []
        };

        bills.forEach(bill => {
            // Count Propose/Passed
            const isInitiator = bill.initiators.some(i => i.party === party.name);
            if (isInitiator) {
                data.totalProposed++;
                if (bill.tag === Tag.Passed) {
                    data.totalPassed++;
                }
            }

            // Calculate Loyalty
            const alignment = analyzeAlignment(bill, party);
            const vote = simulateVote(party.id, bill, alignment);

            if (vote === 1) { // Voted FOR
                if (alignment === PlatformAlignment.Aligned) data.billsForAligned.push(bill);
                if (alignment === PlatformAlignment.Conflicting) data.billsForConflicting.push(bill);
            } else if (vote === -1) { // Voted AGAINST
                if (alignment === PlatformAlignment.Aligned) data.billsAgainstAligned.push(bill);
                if (alignment === PlatformAlignment.Conflicting) data.billsAgainstConflicting.push(bill);
            }
        });

        // Calculate Percentage
        const consistentCount = data.billsForAligned.length + data.billsAgainstConflicting.length;
        const inconsistentCount = data.billsForConflicting.length + data.billsAgainstAligned.length;
        const totalVotes = consistentCount + inconsistentCount;
        data.loyaltyScore = totalVotes > 0 ? Math.round((consistentCount / totalVotes) * 100) : 0;

        stats.push(data);
    });

    return stats;
};
