import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

interface ProfileData {
  age?: number | null;
  religion?: string | null;
  sect?: string | null;
  nationalityPrimary?: string | null;
  residenceCountry?: string | null;
  region?: string | null;
  educationLevel?: string | null;
  maritalStatus?: string | null;
  smoking?: string | null;
  childrenCount?: number | null;
  wantChildren?: boolean | null;
  height?: number | null;
  jobStatus?: string | null;
  interests?: string[];
  mahrMin?: number | null;
  mahrMax?: number | null;
  dowryMin?: number | null;
  dowryMax?: number | null;
}

const WEIGHTS = {
  religion: 15,
  sect: 10,
  age: 12,
  country: 8,
  city: 10,
  education: 7,
  maritalStatus: 8,
  smoking: 6,
  children: 5,
  height: 3,
  jobStatus: 4,
  interests: 7,
  mahrRange: 5,
};

@Injectable()
export class CompatibilityService {
  constructor(private readonly prisma: PrismaService) {}

  /** Calculate compatibility score between two users (0-100) */
  async calculateScore(userId1: string, userId2: string): Promise<number> {
    const [p1, p2] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { userId: userId1 } }),
      this.prisma.userProfile.findUnique({ where: { userId: userId2 } }),
    ]);

    if (!p1 || !p2) return 0;
    return this.computeScore(p1 as ProfileData, p2 as ProfileData);
  }

  /** Score two profiles without DB access (for batch use) */
  computeScore(p1: ProfileData, p2: ProfileData): number {
    let totalWeight = 0;
    let earnedScore = 0;

    // Religion — exact match
    if (p1.religion && p2.religion) {
      totalWeight += WEIGHTS.religion;
      if (p1.religion.toLowerCase() === p2.religion.toLowerCase()) {
        earnedScore += WEIGHTS.religion;
      }
    }

    // Sect — exact match
    if (p1.sect && p2.sect) {
      totalWeight += WEIGHTS.sect;
      if (p1.sect.toLowerCase() === p2.sect.toLowerCase()) {
        earnedScore += WEIGHTS.sect;
      }
    }

    // Age — closer = higher score
    if (p1.age && p2.age) {
      totalWeight += WEIGHTS.age;
      const diff = Math.abs(p1.age - p2.age);
      if (diff <= 2) earnedScore += WEIGHTS.age;
      else if (diff <= 5) earnedScore += WEIGHTS.age * 0.7;
      else if (diff <= 10) earnedScore += WEIGHTS.age * 0.4;
      else earnedScore += WEIGHTS.age * 0.1;
    }

    // Country — same country
    if (p1.residenceCountry && p2.residenceCountry) {
      totalWeight += WEIGHTS.country;
      if (p1.residenceCountry.toLowerCase() === p2.residenceCountry.toLowerCase()) {
        earnedScore += WEIGHTS.country;
      }
    }

    // City/Region — same city
    if (p1.region && p2.region) {
      totalWeight += WEIGHTS.city;
      if (p1.region.toLowerCase() === p2.region.toLowerCase()) {
        earnedScore += WEIGHTS.city;
      }
    }

    // Education level
    if (p1.educationLevel && p2.educationLevel) {
      totalWeight += WEIGHTS.education;
      if (p1.educationLevel.toLowerCase() === p2.educationLevel.toLowerCase()) {
        earnedScore += WEIGHTS.education;
      } else {
        earnedScore += WEIGHTS.education * 0.3; // partial match
      }
    }

    // Marital status
    if (p1.maritalStatus && p2.maritalStatus) {
      totalWeight += WEIGHTS.maritalStatus;
      if (p1.maritalStatus.toLowerCase() === p2.maritalStatus.toLowerCase()) {
        earnedScore += WEIGHTS.maritalStatus;
      }
    }

    // Smoking compatibility
    if (p1.smoking && p2.smoking) {
      totalWeight += WEIGHTS.smoking;
      if (p1.smoking.toLowerCase() === p2.smoking.toLowerCase()) {
        earnedScore += WEIGHTS.smoking;
      }
    }

    // Children preference
    if (p1.wantChildren !== null && p1.wantChildren !== undefined &&
        p2.wantChildren !== null && p2.wantChildren !== undefined) {
      totalWeight += WEIGHTS.children;
      if (p1.wantChildren === p2.wantChildren) {
        earnedScore += WEIGHTS.children;
      }
    }

    // Height — within 15cm = full, within 25cm = partial
    if (p1.height && p2.height) {
      totalWeight += WEIGHTS.height;
      const heightDiff = Math.abs(p1.height - p2.height);
      if (heightDiff <= 15) earnedScore += WEIGHTS.height;
      else if (heightDiff <= 25) earnedScore += WEIGHTS.height * 0.5;
    }

    // Job status
    if (p1.jobStatus && p2.jobStatus) {
      totalWeight += WEIGHTS.jobStatus;
      if (p1.jobStatus.toLowerCase() === p2.jobStatus.toLowerCase()) {
        earnedScore += WEIGHTS.jobStatus;
      }
    }

    // Shared interests
    if (p1.interests?.length && p2.interests?.length) {
      totalWeight += WEIGHTS.interests;
      const set1 = new Set(p1.interests.map(i => i.toLowerCase()));
      const shared = p2.interests.filter(i => set1.has(i.toLowerCase())).length;
      const total = new Set([...p1.interests, ...p2.interests]).size;
      if (total > 0) {
        earnedScore += WEIGHTS.interests * (shared / total);
      }
    }

    // Mahr range overlap
    if (p1.mahrMin != null && p1.mahrMax != null && p2.mahrMin != null && p2.mahrMax != null) {
      totalWeight += WEIGHTS.mahrRange;
      const overlapStart = Math.max(p1.mahrMin, p2.mahrMin);
      const overlapEnd = Math.min(p1.mahrMax, p2.mahrMax);
      if (overlapStart <= overlapEnd) {
        earnedScore += WEIGHTS.mahrRange;
      } else {
        // Check how far apart the ranges are
        const gap = overlapStart - overlapEnd;
        const avgRange = ((p1.mahrMax - p1.mahrMin) + (p2.mahrMax - p2.mahrMin)) / 2;
        if (avgRange > 0 && gap < avgRange) {
          earnedScore += WEIGHTS.mahrRange * 0.3;
        }
      }
    }

    if (totalWeight === 0) return 50; // Not enough data, return neutral
    return Math.round((earnedScore / totalWeight) * 100);
  }

  /** Get compatibility score and include it in discovery results */
  async getScoreForPair(userId1: string, userId2: string) {
    const score = await this.calculateScore(userId1, userId2);
    return { userId1, userId2, compatibilityScore: score };
  }
}
