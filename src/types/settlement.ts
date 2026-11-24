export type SettlementStatus =
  | 'Pending'           // Chờ xác nhận / Chờ duyệt chi
  | 'Approved'          // Đã duyệt chi · Chờ thanh toán
  | 'PaymentRecorded'   // Đã ghi nhận chuyển khoản · Chờ hoàn tất
  | 'Completed'         // Đã hoàn tất quyết toán
  | 'Rejected';         // Đã từ chối duyệt chi

export type SettlementPaymentMethod = 'BankTransfer' | 'Cash';

export interface SettlementProductItem {
  id: string;
  barcode: string;
  name: string;
  size: string;
  categoryName: string;
  brandName: string;
  listedPrice: number;
  soldPrice: number;
  commissionRate: number; // e.g. 15 (%)
  commissionAmount: number;
  soldAt: string | null;
  status: 'Sold' | 'Returned' | 'InStock';
}

export interface SettlementFeeItem {
  id: string;
  name: string;
  amount: number;
  description?: string;
}

export interface SettlementDocument {
  id: string;
  fileName: string;
  fileType: 'image' | 'pdf';
  fileSize: number;
  dataUrl: string;
  uploadedAt: string;
  uploadedByName: string;
  documentType: 'TransferReceipt' | 'SettlementSheet' | 'Other';
}

export interface SettlementApprovalInfo {
  approvedAt: string | null;
  approvedByEmployeeId: string | null;
  approvedByEmployeeName: string | null;
  rejectedAt: string | null;
  rejectedByEmployeeId: string | null;
  rejectedByEmployeeName: string | null;
  rejectionReason: string | null;
  managerNote: string | null;
}

export interface SettlementPaymentInfo {
  paidAt: string | null;
  paidByEmployeeId: string | null;
  paidByEmployeeName: string | null;
  paymentMethod: SettlementPaymentMethod;
  bankTransactionReference: string | null;
  transferNote: string | null;
  bankCode: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountHolderName: string | null;
}

export interface SettlementContract {
  id: string;
  settlementNumber: string;
  contractId: string;
  contractNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerIdentity?: string | null;
  bankCode: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolderName: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
  status: SettlementStatus;
  
  // Financial breakdown
  totalRevenue: number;        // Tổng doanh thu từ các sản phẩm đã bán
  commissionRate: number;      // Tỷ lệ hoa hồng trung bình / thỏa thuận (%)
  commissionAmount: number;    // Tiền hoa hồng cửa hàng giữ lại
  fees: number;                // Tổng các loại phí khấu trừ
  feeDetails: SettlementFeeItem[];
  netPayout: number;           // Số tiền cần trả cho người gửi = totalRevenue - commissionAmount - fees
  
  // Products count
  soldItemCount: number;
  totalItemCount: number;
  products: SettlementProductItem[];

  // Approval and Payment logs
  approval: SettlementApprovalInfo;
  payment: SettlementPaymentInfo;
  
  // Attached documents
  documents: SettlementDocument[];
  notes?: string | null;
}

export interface SettlementFilterParams {
  query?: string;
  status?: SettlementStatus | 'all';
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface ApproveSettlementPayload {
  managerNote?: string;
}

export interface RejectSettlementPayload {
  rejectionReason: string;
}

export interface RecordTransferPayload {
  paymentMethod: SettlementPaymentMethod;
  bankTransactionReference?: string;
  transferDate?: string;
  transferNote?: string;
  bankCode?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolderName?: string;
  receiptDocument?: {
    fileName: string;
    fileType: 'image' | 'pdf';
    fileSize: number;
    dataUrl: string;
  };
}
