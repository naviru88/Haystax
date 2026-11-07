export interface TenancyRequest {
  id: string;
  listingId: string;
  tenantId: string;
  ownerId?: string;
  moveInDate: string;
  endDate?: string;
  status: 'submitted' | 'pending' | 'approved' | 'confirmed' | 'rejected' | 'cancelled' | 'active';
  message?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateTenancyPayload {
  listingId: string;
  tenantId?: string;
  moveInDate: string;
  endDate?: string;
  notes?: string;
}
