export interface TenancyRequest {
  id: string;
  listingId: string;
  studentId: string;
  ownerId: string;
  moveInDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenancyPayload {
  listingId: string;
  studentId: string;
  moveInDate: string;
  notes?: string;
}
