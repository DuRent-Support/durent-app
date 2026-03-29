export type CrewSkills = Record<string, unknown> | unknown[];

export interface Crew {
  crew_id: string;
  name: string;
  description: string;
  images: string[];
  price: number;
  skills: CrewSkills;
  created_at?: string;
}
