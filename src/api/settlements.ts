import { apiClient } from './client';
import type {
  SettlementContract,
  SettlementFilterParams,
  ApproveSettlementPayload,
  RejectSettlementPayload,
  RecordTransferPayload,
  SettlementDocument,
} from '@/types/settlement';

const SETTLEMENT_STORAGE_KEY = 'ocs_settlements_mock_store';

export function calculateNetPayout(totalRevenue: number, commissionAmount: number, fees: number): number {
  return Math.max(0, totalRevenue - commissionAmount - fees);
}

export function formatVnd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 ₫';
  return `${new Intl.NumberFormat('vi-VN').format(amount)} ₫`;
}

// Initial realistic seed data
const INITIAL_SETTLEMENTS: SettlementContract[] = [
  {
    id: 'stl-001',
    settlementNumber: 'QT-2026-001',
    contractId: 'ctr-001',
    contractNumber: 'HD-2026-0042',
    customerId: 'cus-101',
    customerName: 'Nguyễn Thị Bích Phượng',
    customerPhone: '0912345678',
    customerEmail: 'bichphuong.nguyen@gmail.com',
    customerIdentity: '001198012345',
    bankCode: 'VCB',
    bankName: 'Vietcombank',
    bankAccountNumber: '0071001234567',
    bankAccountHolderName: 'NGUYEN THI BICH PHUONG',
    periodStart: '2026-10-01T08:00:00.000Z',
    periodEnd: '2026-10-31T17:00:00.000Z',
    createdAt: '2026-11-02T09:30:00.000Z',
    updatedAt: '2026-11-02T09:30:00.000Z',
    status: 'Pending',
    totalRevenue: 4250000,
    commissionRate: 15,
    commissionAmount: 637500,
    fees: 50000,
    feeDetails: [
      { id: 'fee-1', name: 'Phí kiểm định & gắn mã bảo mật', amount: 30000 },
      { id: 'fee-2', name: 'Phí lưu kho đồ quá hạn nhẹ', amount: 20000 },
    ],
    netPayout: 3562500,
    soldItemCount: 3,
    totalItemCount: 4,
    products: [
      {
        id: 'prd-101',
        barcode: 'OCS261001',
        name: 'Đầm hoa nhí tay bồng Zara',
        size: 'M',
        categoryName: 'Đầm & Váy',
        brandName: 'Zara',
        listedPrice: 1200000,
        soldPrice: 1200000,
        commissionRate: 15,
        commissionAmount: 180000,
        soldAt: '2026-10-12T14:20:00.000Z',
        status: 'Sold',
      },
      {
        id: 'prd-102',
        barcode: 'OCS261002',
        name: 'Áo blazer dạ tweed Routine',
        size: 'S',
        categoryName: 'Áo khoác',
        brandName: 'Routine',
        listedPrice: 1850000,
        soldPrice: 1850000,
        commissionRate: 15,
        commissionAmount: 277500,
        soldAt: '2026-10-18T16:45:00.000Z',
        status: 'Sold',
      },
      {
        id: 'prd-103',
        barcode: 'OCS261003',
        name: 'Quần jeans ống suông Uniqlo',
        size: '28',
        categoryName: 'Quần & Jeans',
        brandName: 'Uniqlo',
        listedPrice: 1200000,
        soldPrice: 1200000,
        commissionRate: 15,
        commissionAmount: 180000,
        soldAt: '2026-10-25T11:10:00.000Z',
        status: 'Sold',
      },
      {
        id: 'prd-104',
        barcode: 'OCS261004',
        name: 'Túi xách kẹp nách mini',
        size: 'Freesize',
        categoryName: 'Phụ kiện',
        brandName: 'Khác',
        listedPrice: 450000,
        soldPrice: 0,
        commissionRate: 15,
        commissionAmount: 0,
        soldAt: null,
        status: 'Returned',
      },
    ],
    approval: {
      approvedAt: null,
      approvedByEmployeeId: null,
      approvedByEmployeeName: null,
      rejectedAt: null,
      rejectedByEmployeeId: null,
      rejectedByEmployeeName: null,
      rejectionReason: null,
      managerNote: null,
    },
    payment: {
      paidAt: null,
      paidByEmployeeId: null,
      paidByEmployeeName: null,
      paymentMethod: 'BankTransfer',
      bankTransactionReference: null,
      transferNote: null,
      bankCode: 'VCB',
      bankName: 'Vietcombank',
      bankAccountNumber: '0071001234567',
      bankAccountHolderName: 'NGUYEN THI BICH PHUONG',
    },
    documents: [],
    notes: 'Kỳ ký gửi tháng 10/2026. 1 sản phẩm đã hoàn trả khách ngày 31/10.',
  },
  {
    id: 'stl-002',
    settlementNumber: 'QT-2026-002',
    contractId: 'ctr-002',
    contractNumber: 'HD-2026-0055',
    customerId: 'cus-102',
    customerName: 'Trần Minh Đức',
    customerPhone: '0988776655',
    customerEmail: 'duc.tm@outlook.com',
    customerIdentity: '025095000123',
    bankCode: 'MB',
    bankName: 'MBBank',
    bankAccountNumber: '098877665599',
    bankAccountHolderName: 'TRAN MINH DUC',
    periodStart: '2026-10-15T08:00:00.000Z',
    periodEnd: '2026-11-15T17:00:00.000Z',
    createdAt: '2026-11-16T10:00:00.000Z',
    updatedAt: '2026-11-17T14:30:00.000Z',
    status: 'Approved',
    totalRevenue: 6800000,
    commissionRate: 20,
    commissionAmount: 1360000,
    fees: 40000,
    feeDetails: [
      { id: 'fee-3', name: 'Phí làm sạch & hấp thơm đồ cao cấp', amount: 40000 },
    ],
    netPayout: 5400000,
    soldItemCount: 2,
    totalItemCount: 2,
    products: [
      {
        id: 'prd-201',
        barcode: 'OCS262001',
        name: 'Áo khoác len Cashmere Chanel',
        size: 'L',
        categoryName: 'Áo khoác',
        brandName: 'Chanel',
        listedPrice: 4800000,
        soldPrice: 4800000,
        commissionRate: 20,
        commissionAmount: 960000,
        soldAt: '2026-10-29T15:00:00.000Z',
        status: 'Sold',
      },
      {
        id: 'prd-202',
        barcode: 'OCS262002',
        name: 'Giày bốt da lộn cổ thấp',
        size: '41',
        categoryName: 'Phụ kiện',
        brandName: 'Khác',
        listedPrice: 2000000,
        soldPrice: 2000000,
        commissionRate: 20,
        commissionAmount: 400000,
        soldAt: '2026-11-05T18:20:00.000Z',
        status: 'Sold',
      },
    ],
    approval: {
      approvedAt: '2026-11-17T14:30:00.000Z',
      approvedByEmployeeId: 'emp-mgr-01',
      approvedByEmployeeName: 'Quản lý Trần Hữu Toàn',
      rejectedAt: null,
      rejectedByEmployeeId: null,
      rejectedByEmployeeName: null,
      rejectionReason: null,
      managerNote: 'Đã duyệt toàn bộ đồ hiệu, khách hàng VIP đối soát chuẩn xác.',
    },
    payment: {
      paidAt: null,
      paidByEmployeeId: null,
      paidByEmployeeName: null,
      paymentMethod: 'BankTransfer',
      bankTransactionReference: null,
      transferNote: null,
      bankCode: 'MB',
      bankName: 'MBBank',
      bankAccountNumber: '098877665599',
      bankAccountHolderName: 'TRAN MINH DUC',
    },
    documents: [],
    notes: 'Quản lý đã duyệt chi. Kế toán chuẩn bị lệnh chuyển khoản MBBank.',
  },
  {
    id: 'stl-003',
    settlementNumber: 'QT-2026-003',
    contractId: 'ctr-003',
    contractNumber: 'HD-2026-0060',
    customerId: 'cus-103',
    customerName: 'Hoàng Lê Diệu Linh',
    customerPhone: '0903112233',
    customerEmail: 'dieulinh.hoang@gmail.com',
    customerIdentity: '031195004455',
    bankCode: 'TCB',
    bankName: 'Techcombank',
    bankAccountNumber: '19033445566778',
    bankAccountHolderName: 'HOANG LE DIEU LINH',
    periodStart: '2026-10-01T08:00:00.000Z',
    periodEnd: '2026-10-31T17:00:00.000Z',
    createdAt: '2026-11-01T11:00:00.000Z',
    updatedAt: '2026-11-03T16:45:00.000Z',
    status: 'PaymentRecorded',
    totalRevenue: 2850000,
    commissionRate: 15,
    commissionAmount: 427500,
    fees: 25000,
    feeDetails: [
      { id: 'fee-4', name: 'Phí gắn tag niêm phong', amount: 25000 },
    ],
    netPayout: 2397500,
    soldItemCount: 2,
    totalItemCount: 3,
    products: [
      {
        id: 'prd-301',
        barcode: 'OCS263001',
        name: 'Váy xếp ly dáng dài Uniqlo',
        size: 'M',
        categoryName: 'Đầm & Váy',
        brandName: 'Uniqlo',
        listedPrice: 1350000,
        soldPrice: 1350000,
        commissionRate: 15,
        commissionAmount: 202500,
        soldAt: '2026-10-15T10:00:00.000Z',
        status: 'Sold',
      },
      {
        id: 'prd-302',
        barcode: 'OCS263002',
        name: 'Áo sơ mi lụa tơ tằm Routine',
        size: 'S',
        categoryName: 'Áo khoác',
        brandName: 'Routine',
        listedPrice: 1500000,
        soldPrice: 1500000,
        commissionRate: 15,
        commissionAmount: 225000,
        soldAt: '2026-10-21T14:30:00.000Z',
        status: 'Sold',
      },
    ],
    approval: {
      approvedAt: '2026-11-02T10:15:00.000Z',
      approvedByEmployeeId: 'emp-mgr-01',
      approvedByEmployeeName: 'Quản lý Trần Hữu Toàn',
      rejectedAt: null,
      rejectedByEmployeeId: null,
      rejectedByEmployeeName: null,
      rejectionReason: null,
      managerNote: 'Số liệu khớp, duyệt chi.',
    },
    payment: {
      paidAt: '2026-11-03T16:45:00.000Z',
      paidByEmployeeId: 'emp-staff-02',
      paidByEmployeeName: 'Kế toán Lê Quỳnh Mai',
      paymentMethod: 'BankTransfer',
      bankTransactionReference: 'FT261103987123',
      transferNote: 'THANH TOAN QUYET TOAN HD-2026-0060',
      bankCode: 'TCB',
      bankName: 'Techcombank',
      bankAccountNumber: '19033445566778',
      bankAccountHolderName: 'HOANG LE DIEU LINH',
    },
    documents: [
      {
        id: 'doc-001',
        fileName: 'UNC_FT261103987123.jpg',
        fileType: 'image',
        fileSize: 245000,
        dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%23f4f6f8"/><rect x="20" y="20" width="560" height="360" rx="8" fill="white" stroke="%23cbd5e1" stroke-width="2"/><text x="40" y="60" font-family="sans-serif" font-size="18" font-weight="bold" fill="%231e293b">GIẤY BÁO CÓ / ỦY NHIỆM CHI TECHCOMBANK</text><text x="40" y="100" font-family="sans-serif" font-size="14" fill="%2364748b">Mã giao dịch: FT261103987123</text><text x="40" y="130" font-family="sans-serif" font-size="14" fill="%2364748b">Người thụ hưởng: HOANG LE DIEU LINH</text><text x="40" y="160" font-family="sans-serif" font-size="14" fill="%2364748b">Số tài khoản: 19033445566778</text><text x="40" y="190" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23059669">Số tiền: 2.397.500 VND</text><text x="40" y="220" font-family="sans-serif" font-size="14" fill="%2364748b">Trạng thái: Giao dịch thành công lúc 16:45:12 03/11/2026</text></svg>',
        uploadedAt: '2026-11-03T16:46:00.000Z',
        uploadedByName: 'Kế toán Lê Quỳnh Mai',
        documentType: 'TransferReceipt',
      },
    ],
    notes: 'Đã chuyển khoản thành công, đã tải ủy nhiệm chi, chờ kế toán trưởng xác nhận hoàn tất.',
  },
  {
    id: 'stl-004',
    settlementNumber: 'QT-2026-004',
    contractId: 'ctr-004',
    contractNumber: 'HD-2026-0031',
    customerId: 'cus-104',
    customerName: 'Phạm Thanh Thảo',
    customerPhone: '0977889900',
    customerEmail: 'thao.pt@gmail.com',
    customerIdentity: '012399001122',
    bankCode: 'ACB',
    bankName: 'ACB',
    bankAccountNumber: '234567899',
    bankAccountHolderName: 'PHAM THANH THAO',
    periodStart: '2026-09-15T08:00:00.000Z',
    periodEnd: '2026-10-15T17:00:00.000Z',
    createdAt: '2026-10-16T09:00:00.000Z',
    updatedAt: '2026-10-18T11:20:00.000Z',
    status: 'Completed',
    totalRevenue: 5100000,
    commissionRate: 15,
    commissionAmount: 765000,
    fees: 0,
    feeDetails: [],
    netPayout: 4335000,
    soldItemCount: 3,
    totalItemCount: 3,
    products: [
      {
        id: 'prd-401',
        barcode: 'OCS264001',
        name: 'Váy dạ hội đuôi cá Zara',
        size: 'M',
        categoryName: 'Đầm & Váy',
        brandName: 'Zara',
        listedPrice: 2100000,
        soldPrice: 2100000,
        commissionRate: 15,
        commissionAmount: 315000,
        soldAt: '2026-09-28T19:00:00.000Z',
        status: 'Sold',
      },
      {
        id: 'prd-402',
        barcode: 'OCS264002',
        name: 'Chân váy chữ A Routine',
        size: 'S',
        categoryName: 'Đầm & Váy',
        brandName: 'Routine',
        listedPrice: 1200000,
        soldPrice: 1200000,
        commissionRate: 15,
        commissionAmount: 180000,
        soldAt: '2026-10-02T13:40:00.000Z',
        status: 'Sold',
      },
      {
        id: 'prd-403',
        barcode: 'OCS264003',
        name: 'Áo măng tô dạ Uniqlo',
        size: 'L',
        categoryName: 'Áo khoác',
        brandName: 'Uniqlo',
        listedPrice: 1800000,
        soldPrice: 1800000,
        commissionRate: 15,
        commissionAmount: 270000,
        soldAt: '2026-10-09T17:15:00.000Z',
        status: 'Sold',
      },
    ],
    approval: {
      approvedAt: '2026-10-16T14:00:00.000Z',
      approvedByEmployeeId: 'emp-mgr-01',
      approvedByEmployeeName: 'Quản lý Trần Hữu Toàn',
      rejectedAt: null,
      rejectedByEmployeeId: null,
      rejectedByEmployeeName: null,
      rejectionReason: null,
      managerNote: 'Duyệt chi đầy đủ.',
    },
    payment: {
      paidAt: '2026-10-17T10:00:00.000Z',
      paidByEmployeeId: 'emp-staff-01',
      paidByEmployeeName: 'Kế toán Lê Quỳnh Mai',
      paymentMethod: 'BankTransfer',
      bankTransactionReference: 'ACB991203912',
      transferNote: 'CHI TRA TIEN KY GUI HD-2026-0031',
      bankCode: 'ACB',
      bankName: 'ACB',
      bankAccountNumber: '234567899',
      bankAccountHolderName: 'PHAM THANH THAO',
    },
    documents: [
      {
        id: 'doc-002',
        fileName: 'BienLai_ACB_HD0031.png',
        fileType: 'image',
        fileSize: 189000,
        dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%23f8fafc"/><rect x="20" y="20" width="560" height="360" rx="8" fill="white" stroke="%23cbd5e1" stroke-width="2"/><text x="40" y="60" font-family="sans-serif" font-size="18" font-weight="bold" fill="%230284c7">NGÂN HÀNG Á CHÂU - ACB BIÊN LAI CHUYỂN TIỀN</text><text x="40" y="100" font-family="sans-serif" font-size="14" fill="%2364748b">Số tham chiếu: ACB991203912</text><text x="40" y="130" font-family="sans-serif" font-size="14" fill="%2364748b">Người thụ hưởng: PHAM THANH THAO</text><text x="40" y="160" font-family="sans-serif" font-size="14" fill="%2364748b">Số tài khoản: 234567899</text><text x="40" y="190" font-family="sans-serif" font-size="14" font-weight="bold" fill="%2316a34a">Số tiền: 4.335.000 VND</text><text x="40" y="220" font-family="sans-serif" font-size="14" fill="%2364748b">Đã hoàn tất thanh toán và gửi tin nhắn SMS cho khách</text></svg>',
        uploadedAt: '2026-10-17T10:05:00.000Z',
        uploadedByName: 'Kế toán Lê Quỳnh Mai',
        documentType: 'TransferReceipt',
      },
    ],
    notes: 'Khách hàng đã nhận đủ tiền và xác nhận hài lòng.',
  },
  {
    id: 'stl-005',
    settlementNumber: 'QT-2026-005',
    contractId: 'ctr-005',
    contractNumber: 'HD-2026-0072',
    customerId: 'cus-105',
    customerName: 'Vũ Quốc Huy',
    customerPhone: '0945678123',
    customerEmail: 'huyvq@gmail.com',
    customerIdentity: '024190008899',
    bankCode: 'VPB',
    bankName: 'VPBank',
    bankAccountNumber: '98765432109',
    bankAccountHolderName: 'VU QUOC HUY',
    periodStart: '2026-10-20T08:00:00.000Z',
    periodEnd: '2026-11-20T17:00:00.000Z',
    createdAt: '2026-11-21T08:30:00.000Z',
    updatedAt: '2026-11-21T15:00:00.000Z',
    status: 'Rejected',
    totalRevenue: 3200000,
    commissionRate: 15,
    commissionAmount: 480000,
    fees: 150000,
    feeDetails: [
      { id: 'fee-5', name: 'Phí vận chuyển giao trả đồ', amount: 150000 },
    ],
    netPayout: 2570000,
    soldItemCount: 1,
    totalItemCount: 2,
    products: [
      {
        id: 'prd-501',
        barcode: 'OCS265001',
        name: 'Áo khoác gió thể thao Uniqlo',
        size: 'XL',
        categoryName: 'Áo khoác',
        brandName: 'Uniqlo',
        listedPrice: 3200000,
        soldPrice: 3200000,
        commissionRate: 15,
        commissionAmount: 480000,
        soldAt: '2026-11-08T11:00:00.000Z',
        status: 'Sold',
      },
    ],
    approval: {
      approvedAt: null,
      approvedByEmployeeId: null,
      approvedByEmployeeName: null,
      rejectedAt: '2026-11-21T15:00:00.000Z',
      rejectedByEmployeeId: 'emp-mgr-01',
      rejectedByEmployeeName: 'Quản lý Trần Hữu Toàn',
      rejectionReason: 'Phí giao trả đồ 150.000đ chưa có hóa đơn xác nhận của đơn vị vận chuyển. Cần đính kèm biên nhận ship trước khi duyệt chi.',
      managerNote: 'Yêu cầu kế toán kiểm tra lại chứng từ phí.',
    },
    payment: {
      paidAt: null,
      paidByEmployeeId: null,
      paidByEmployeeName: null,
      paymentMethod: 'BankTransfer',
      bankTransactionReference: null,
      transferNote: null,
      bankCode: 'VPB',
      bankName: 'VPBank',
      bankAccountNumber: '98765432109',
      bankAccountHolderName: 'VU QUOC HUY',
    },
    documents: [],
    notes: 'Bị từ chối do thiếu chứng từ phí vận chuyển.',
  },
  {
    id: 'stl-006',
    settlementNumber: 'QT-2026-006',
    contractId: 'ctr-006',
    contractNumber: 'HD-2026-0088',
    customerId: 'cus-106',
    customerName: 'Đặng Ngọc Mai',
    customerPhone: '0934567890',
    customerEmail: 'ngocmai.dang@yahoo.com',
    customerIdentity: '079198002341',
    bankCode: 'ICB',
    bankName: 'VietinBank',
    bankAccountNumber: '101889988776',
    bankAccountHolderName: 'DANG NGOC MAI',
    periodStart: '2026-10-25T08:00:00.000Z',
    periodEnd: '2026-11-25T17:00:00.000Z',
    createdAt: '2026-11-22T14:00:00.000Z',
    updatedAt: '2026-11-22T14:00:00.000Z',
    status: 'Pending',
    totalRevenue: 8500000,
    commissionRate: 18,
    commissionAmount: 1530000,
    fees: 60000,
    feeDetails: [
      { id: 'fee-6', name: 'Phí hấp thơm bảo quản đồ len dạ', amount: 60000 },
    ],
    netPayout: 6910000,
    soldItemCount: 4,
    totalItemCount: 4,
    products: [
      {
        id: 'prd-601',
        barcode: 'OCS266001',
        name: 'Set vest công sở nữ Routine',
        size: 'M',
        categoryName: 'Áo khoác',
        brandName: 'Routine',
        listedPrice: 3200000,
        soldPrice: 3200000,
        commissionRate: 18,
        commissionAmount: 576000,
        soldAt: '2026-11-02T16:00:00.000Z',
        status: 'Sold',
      },
      {
        id: 'prd-602',
        barcode: 'OCS266002',
        name: 'Đầm xòe lụa satin Zara',
        size: 'S',
        categoryName: 'Đầm & Váy',
        brandName: 'Zara',
        listedPrice: 2100000,
        soldPrice: 2100000,
        commissionRate: 18,
        commissionAmount: 378000,
        soldAt: '2026-11-06T14:40:00.000Z',
        status: 'Sold',
      },
      {
        id: 'prd-603',
        barcode: 'OCS266003',
        name: 'Quần tây baggy Uniqlo',
        size: 'M',
        categoryName: 'Quần & Jeans',
        brandName: 'Uniqlo',
        listedPrice: 1400000,
        soldPrice: 1400000,
        commissionRate: 18,
        commissionAmount: 252000,
        soldAt: '2026-11-12T10:15:00.000Z',
        status: 'Sold',
      },
      {
        id: 'prd-604',
        barcode: 'OCS266004',
        name: 'Khăn choàng lụa tơ tằm',
        size: 'Freesize',
        categoryName: 'Phụ kiện',
        brandName: 'Khác',
        listedPrice: 1800000,
        soldPrice: 1800000,
        commissionRate: 18,
        commissionAmount: 324000,
        soldAt: '2026-11-19T11:30:00.000Z',
        status: 'Sold',
      },
    ],
    approval: {
      approvedAt: null,
      approvedByEmployeeId: null,
      approvedByEmployeeName: null,
      rejectedAt: null,
      rejectedByEmployeeId: null,
      rejectedByEmployeeName: null,
      rejectionReason: null,
      managerNote: null,
    },
    payment: {
      paidAt: null,
      paidByEmployeeId: null,
      paidByEmployeeName: null,
      paymentMethod: 'BankTransfer',
      bankTransactionReference: null,
      transferNote: null,
      bankCode: 'ICB',
      bankName: 'VietinBank',
      bankAccountNumber: '101889988776',
      bankAccountHolderName: 'DANG NGOC MAI',
    },
    documents: [],
    notes: 'Toàn bộ 4/4 sản phẩm đã bán hết trước hạn hợp đồng. Đề xuất duyệt chi sớm.',
  },
];

function getStoredSettlements(): SettlementContract[] {
  if (typeof window === 'undefined') return INITIAL_SETTLEMENTS;
  try {
    const raw = localStorage.getItem(SETTLEMENT_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SETTLEMENT_STORAGE_KEY, JSON.stringify(INITIAL_SETTLEMENTS));
      return INITIAL_SETTLEMENTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(SETTLEMENT_STORAGE_KEY, JSON.stringify(INITIAL_SETTLEMENTS));
      return INITIAL_SETTLEMENTS;
    }
    return parsed;
  } catch {
    return INITIAL_SETTLEMENTS;
  }
}

function saveStoredSettlements(items: SettlementContract[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTLEMENT_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage quota or private mode fallback
  }
}

export const settlementsApi = {
  async list(params?: SettlementFilterParams, signal?: AbortSignal): Promise<SettlementContract[]> {
    try {
      // Attempt backend call first
      const res = await apiClient.get<SettlementContract[]>('/settlements', {
        params,
        signal,
      });
      if (Array.isArray(res.data) && res.data.length > 0) {
        saveStoredSettlements(res.data);
        return res.data;
      }
    } catch {
      // Gracefully fall back to local store
    }

    const items = getStoredSettlements();
    let filtered = [...items];

    if (params?.status && params.status !== 'all') {
      filtered = filtered.filter((i) => i.status === params.status);
    }

    if (params?.query && params.query.trim()) {
      const q = params.query.trim().toLocaleLowerCase('vi-VN');
      filtered = filtered.filter(
        (i) =>
          i.settlementNumber.toLocaleLowerCase('vi-VN').includes(q) ||
          i.contractNumber.toLocaleLowerCase('vi-VN').includes(q) ||
          i.customerName.toLocaleLowerCase('vi-VN').includes(q) ||
          i.customerPhone.includes(q) ||
          i.bankAccountNumber.includes(q) ||
          (i.payment.bankTransactionReference &&
            i.payment.bankTransactionReference.toLocaleLowerCase('vi-VN').includes(q))
      );
    }

    if (params?.startDate) {
      const start = new Date(params.startDate).getTime();
      filtered = filtered.filter((i) => new Date(i.createdAt).getTime() >= start);
    }

    if (params?.endDate) {
      const end = new Date(params.endDate).getTime();
      filtered = filtered.filter((i) => new Date(i.createdAt).getTime() <= end);
    }

    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getById(id: string, signal?: AbortSignal): Promise<SettlementContract> {
    try {
      const res = await apiClient.get<SettlementContract>(`/settlements/${encodeURIComponent(id)}`, { signal });
      if (res.data) return res.data;
    } catch {
      // Fallback
    }

    const items = getStoredSettlements();
    const found = items.find((i) => i.id === id || i.settlementNumber === id);
    if (!found) throw new Error('Không tìm thấy bản ghi quyết toán');
    return found;
  },

  async approve(
    id: string,
    payload: ApproveSettlementPayload,
    approver?: { id?: string; fullName?: string }
  ): Promise<SettlementContract> {
    try {
      const res = await apiClient.post<SettlementContract>(`/settlements/${encodeURIComponent(id)}/approve`, payload);
      if (res.data) {
        const items = getStoredSettlements().map((item) => (item.id === id ? res.data : item));
        saveStoredSettlements(items);
        return res.data;
      }
    } catch {
      // Fallback
    }

    const items = getStoredSettlements();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Không tìm thấy bản ghi quyết toán');

    const updated: SettlementContract = {
      ...items[idx],
      status: 'Approved',
      updatedAt: new Date().toISOString(),
      approval: {
        ...items[idx].approval,
        approvedAt: new Date().toISOString(),
        approvedByEmployeeId: approver?.id || 'emp-current',
        approvedByEmployeeName: approver?.fullName || 'Quản lý cửa hàng',
        rejectedAt: null,
        rejectedByEmployeeId: null,
        rejectedByEmployeeName: null,
        rejectionReason: null,
        managerNote: payload.managerNote?.trim() || 'Đã duyệt chi thanh toán.',
      },
    };

    items[idx] = updated;
    saveStoredSettlements(items);
    return updated;
  },

  async reject(
    id: string,
    payload: RejectSettlementPayload,
    rejecter?: { id?: string; fullName?: string }
  ): Promise<SettlementContract> {
    if (!payload.rejectionReason?.trim()) {
      throw new Error('Vui lòng nhập lý do từ chối duyệt chi.');
    }

    try {
      const res = await apiClient.post<SettlementContract>(`/settlements/${encodeURIComponent(id)}/reject`, payload);
      if (res.data) {
        const items = getStoredSettlements().map((item) => (item.id === id ? res.data : item));
        saveStoredSettlements(items);
        return res.data;
      }
    } catch {
      // Fallback
    }

    const items = getStoredSettlements();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Không tìm thấy bản ghi quyết toán');

    const updated: SettlementContract = {
      ...items[idx],
      status: 'Rejected',
      updatedAt: new Date().toISOString(),
      approval: {
        ...items[idx].approval,
        approvedAt: null,
        approvedByEmployeeId: null,
        approvedByEmployeeName: null,
        rejectedAt: new Date().toISOString(),
        rejectedByEmployeeId: rejecter?.id || 'emp-current',
        rejectedByEmployeeName: rejecter?.fullName || 'Quản lý cửa hàng',
        rejectionReason: payload.rejectionReason.trim(),
      },
    };

    items[idx] = updated;
    saveStoredSettlements(items);
    return updated;
  },

  async recordTransfer(
    id: string,
    payload: RecordTransferPayload,
    payer?: { id?: string; fullName?: string }
  ): Promise<SettlementContract> {
    try {
      const res = await apiClient.post<SettlementContract>(`/settlements/${encodeURIComponent(id)}/payment`, payload);
      if (res.data) {
        const items = getStoredSettlements().map((item) => (item.id === id ? res.data : item));
        saveStoredSettlements(items);
        return res.data;
      }
    } catch {
      // Fallback
    }

    const items = getStoredSettlements();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Không tìm thấy bản ghi quyết toán');

    const now = new Date().toISOString();
    const newDocs = [...items[idx].documents];
    if (payload.receiptDocument) {
      newDocs.push({
        id: `doc-${Date.now()}`,
        fileName: payload.receiptDocument.fileName,
        fileType: payload.receiptDocument.fileType,
        fileSize: payload.receiptDocument.fileSize,
        dataUrl: payload.receiptDocument.dataUrl,
        uploadedAt: now,
        uploadedByName: payer?.fullName || 'Kế toán cửa hàng',
        documentType: 'TransferReceipt',
      });
    }

    const updated: SettlementContract = {
      ...items[idx],
      status: 'PaymentRecorded',
      updatedAt: now,
      payment: {
        paidAt: payload.transferDate || now,
        paidByEmployeeId: payer?.id || 'emp-payer',
        paidByEmployeeName: payer?.fullName || 'Kế toán cửa hàng',
        paymentMethod: payload.paymentMethod,
        bankTransactionReference: payload.bankTransactionReference?.trim() || null,
        transferNote: payload.transferNote?.trim() || `Thanh toan quyet toan ${items[idx].settlementNumber}`,
        bankCode: payload.bankCode || items[idx].bankCode,
        bankName: payload.bankName || items[idx].bankName,
        bankAccountNumber: payload.bankAccountNumber || items[idx].bankAccountNumber,
        bankAccountHolderName: payload.bankAccountHolderName || items[idx].bankAccountHolderName,
      },
      documents: newDocs,
    };

    items[idx] = updated;
    saveStoredSettlements(items);
    return updated;
  },

  async complete(
    id: string,
    completer?: { id?: string; fullName?: string }
  ): Promise<SettlementContract> {
    try {
      const res = await apiClient.post<SettlementContract>(`/settlements/${encodeURIComponent(id)}/complete`);
      if (res.data) {
        const items = getStoredSettlements().map((item) => (item.id === id ? res.data : item));
        saveStoredSettlements(items);
        return res.data;
      }
    } catch {
      // Fallback
    }

    const items = getStoredSettlements();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Không tìm thấy bản ghi quyết toán');

    const updated: SettlementContract = {
      ...items[idx],
      status: 'Completed',
      updatedAt: new Date().toISOString(),
      notes: `${items[idx].notes || ''}\nĐã hoàn tất đối soát và xác nhận thanh toán lúc ${new Date().toLocaleString('vi-VN')} bởi ${completer?.fullName || 'Quản trị viên'}`.trim(),
    };

    items[idx] = updated;
    saveStoredSettlements(items);
    return updated;
  },

  async addDocument(
    id: string,
    doc: Omit<SettlementDocument, 'id' | 'uploadedAt'>
  ): Promise<SettlementContract> {
    const items = getStoredSettlements();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('Không tìm thấy bản ghi quyết toán');

    const newDoc: SettlementDocument = {
      ...doc,
      id: `doc-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
    };

    const updated: SettlementContract = {
      ...items[idx],
      updatedAt: new Date().toISOString(),
      documents: [...items[idx].documents, newDoc],
    };

    items[idx] = updated;
    saveStoredSettlements(items);
    return updated;
  },

  async removeDocument(settlementId: string, documentId: string): Promise<SettlementContract> {
    const items = getStoredSettlements();
    const idx = items.findIndex((i) => i.id === settlementId);
    if (idx === -1) throw new Error('Không tìm thấy bản ghi quyết toán');

    const updated: SettlementContract = {
      ...items[idx],
      updatedAt: new Date().toISOString(),
      documents: items[idx].documents.filter((d) => d.id !== documentId),
    };

    items[idx] = updated;
    saveStoredSettlements(items);
    return updated;
  },

  resetStore(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SETTLEMENT_STORAGE_KEY, JSON.stringify(INITIAL_SETTLEMENTS));
    }
  },
};
