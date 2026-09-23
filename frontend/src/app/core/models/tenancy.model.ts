export interface TenancyRequest {
  id: string;
  listingId: string;
  tenantId: string;
  ownerId: string;
  moveInDate: string;
  status: 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'active';
  message?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateTenancyPayload {
  listingId: string;
  tenantId: string;
  moveInDate: string;
  notes?: string;
}
