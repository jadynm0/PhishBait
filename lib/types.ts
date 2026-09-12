export interface VictimPersona {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  ssnOrId: string;
  creditCard: {
    number: string;
    exp: string;
    cvv: string;
    label: string; // which well-known test card this came from
  };
  notes: string;
}

export type SwarmStatus =
  | "booting"
  | "navigating"
  | "filling"
  | "submitted"
  | "failed"
  | "blocked";

export interface SwarmNode {
  sessionId: string;
  debugUrl: string;
  personaName: string;
  status: SwarmStatus;
}

export interface LaunchRequestBody {
  targetUrl: string;
  fleetCount?: number;
}

export interface LaunchResponseBody {
  sessions: SwarmNode[];
  targetUrl: string;
  warning?: string;
}
