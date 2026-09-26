export type ApiHealthResponse = {
  success: boolean;
  message: string;
};

export type NavigationItem = {
  label: string;
  path: string;
  icon: string;
};

export type FinanceMethod = "CASH" | "BANK_TRANSFER" | "CARD" | "UPI" | "OTHER";
export type SettlementParty = "AGENT" | "OPERATOR";
export type NotificationPreferences = {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
};
export type AgencyBranding = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  brandColor: string;
  logoUrl: string | null;
  currency: string;
  defaultFare: number | string;
};
export type SubscriptionContract = {
  id: string;
  agencyId: string;
  planName: string;
  requestedPlanName: string | null;
  requestedPrice: number | string | null;
  status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  price: number | string;
  currency: string;
  trialEndsAt: string | null;
  periodEndsAt: string | null;
};
export type FinanceSettingsContract = {
  agencyId?: string;
  gstRate: number | string;
  gstAfterDiscount: boolean;
  commissionType: "FIXED" | "PERCENTAGE";
  commissionValue: number | string;
  tiers: {
    hoursBeforeDeparture: number | string;
    feePercent: number | string;
  }[];
};
export type FinanceReportFilters = {
  from?: string;
  to?: string;
  agencyId?: string;
  branchId?: string;
  agentId?: string;
  tripId?: string;
};
export type FinanceReportResponse = {
  totals: {
    bookings: number;
    revenue: number | string;
    refunds: number | string;
    cancellations: number;
    commission: number;
    occupancyPercent: number;
  };
  bookings: {
    id: string;
    pnr: string;
    status: string;
    totalAmount: number | string;
    taxAmount: number | string;
    commissionAmount: number | string;
    createdAt: string;
    cancellation: {
      eligibleRefund: number | string;
      feeAmount: number | string;
    } | null;
    refunds: { amount: number | string }[];
  }[];
};
