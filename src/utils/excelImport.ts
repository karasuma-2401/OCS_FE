import * as XLSX from 'xlsx';
import type { ConsignmentItemRow } from '@/components/shop/reception/ConsignmentReceptionModal';
import type { CategoryOption, BrandOption } from '@/api/consignmentApi';

export interface ExcelImportResult {
  items: ConsignmentItemRow[];
  totalRows: number;
  successCount: number;
  warnings: string[];
}

function normalizeVietnamese(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findBestMatch<T extends { id: string; name: string }>(
  rawInput: string,
  options: T[],
): { match: T | null; confidence: 'exact' | 'fuzzy' | 'none' } {
  if (!rawInput.trim() || options.length === 0) {
    return { match: null, confidence: 'none' };
  }

  const normalizedInput = normalizeVietnamese(rawInput);
  if (!normalizedInput) {
    return { match: null, confidence: 'none' };
  }

  const exact = options.find((o) => normalizeVietnamese(o.name) === normalizedInput);
  if (exact) {
    return { match: exact, confidence: 'exact' };
  }

  const inputTokens = normalizedInput.split(' ').filter(Boolean);
  let bestScore = 0;
  let bestItem: T | null = null;

  for (const opt of options) {
    const optNorm = normalizeVietnamese(opt.name);
    const optTokens = optNorm.split(' ').filter(Boolean);

    if (optNorm.includes(normalizedInput) || normalizedInput.includes(optNorm)) {
      return { match: opt, confidence: 'fuzzy' };
    }

    const commonTokens = inputTokens.filter((t) => optTokens.includes(t));
    const score = commonTokens.length / Math.max(inputTokens.length, optTokens.length);
    if (score > bestScore) {
      bestScore = score;
      bestItem = opt;
    }
  }

  if (bestScore >= 0.5 && bestItem) {
    return { match: bestItem, confidence: 'fuzzy' };
  }

  return { match: null, confidence: 'none' };
}

function getBrandTierDefaultRate(tier?: string): number {
  switch (tier) {
    case 'Luxury':
      return 20;
    case 'Commercial':
      return 15;
    case 'LocalBrand':
      return 12;
    case 'NoBrand':
      return 10;
    default:
      return 15;
  }
}

export function downloadReceptionTemplate(): void {
  const sampleData = [
    {
      'Tên sản phẩm (*)': 'Đầm Lụa Hoa Nhí Dáng Dài',
      'Phân loại': 'Đầm & Váy',
      'Size': 'S',
      'Độ mới (%)': 95,
      'Giá niêm yết (VNĐ) (*)': 890000,
      'Thương hiệu': 'Zara',
      'Ghi chú': 'Vải lụa mềm, còn nguyên cúc phụ',
    },
    {
      'Tên sản phẩm (*)': 'Áo Blazer Dạ Tweed Pastel',
      'Phân loại': 'Áo khoác',
      'Size': 'M',
      'Độ mới (%)': 99,
      'Giá niêm yết (VNĐ) (*)': 1450000,
      'Thương hiệu': 'Uniqlo',
      'Ghi chú': 'Nguyên tag mác, chưa mặc',
    },
    {
      'Tên sản phẩm (*)': 'Quần Jeans Ống Suông Vintage',
      'Phân loại': 'Quần & Jeans',
      'Size': '28',
      'Độ mới (%)': 90,
      'Giá niêm yết (VNĐ) (*)': 650000,
      'Thương hiệu': 'Routine',
      'Ghi chú': 'Chất denim dày dặn',
    },
    {
      'Tên sản phẩm (*)': 'Túi Xách Da Kẹp Nách',
      'Phân loại': 'Phụ kiện',
      'Size': 'Freesize',
      'Độ mới (%)': 95,
      'Giá niêm yết (VNĐ) (*)': 750000,
      'Thương hiệu': 'Zara',
      'Ghi chú': 'Khóa kim loại sáng bóng',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  const colKeys = Object.keys(sampleData[0]);
  worksheet['!cols'] = colKeys.map((key) => {
    let maxLen = key.length;
    for (const row of sampleData) {
      const val = String((row as Record<string, unknown>)[key] ?? '');
      if (val.length > maxLen) {
        maxLen = val.length;
      }
    }
    return { wch: Math.max(maxLen + 4, 12) };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tiep_Nhan_Mau');
  XLSX.writeFile(workbook, 'Mau_Tiep_Nhan_Hang_Ky_Gui_OCS.xlsx');
}

export async function parseReceptionExcel(
  file: File,
  categories: CategoryOption[],
  brands: BrandOption[],
  _commissionShop?: number,
): Promise<ExcelImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Tệp Excel không có trang tính (sheet) nào.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
  });

  if (rawRows.length === 0) {
    throw new Error('Tệp Excel không chứa dữ liệu sản phẩm.');
  }

  const items: ConsignmentItemRow[] = [];
  const warnings: string[] = [];

  rawRows.forEach((row: any, idx: number) => {
    const rowNum = idx + 2;
    const name = String(
      row['Tên sản phẩm (*)'] ||
        row['Tên sản phẩm'] ||
        row['Ten san pham'] ||
        row['Product Name'] ||
        row['Name'] ||
        '',
    ).trim();

    if (!name) {
      warnings.push(`Dòng ${rowNum}: Bỏ qua vì thiếu tên sản phẩm.`);
      return;
    }

    const categoryRaw = String(
      row['Phân loại'] || row['Danh mục'] || row['Category'] || '',
    ).trim();

    let matchedCategory = categories[0];
    if (!categoryRaw) {
      warnings.push(`Dòng ${rowNum} (${name}): Chưa có thông tin phân loại, tự động gán vào "${categories[0].name}".`);
    } else {
      const catResult = findBestMatch(categoryRaw, categories);
      if (catResult.match) {
        matchedCategory = catResult.match;
        if (catResult.confidence === 'fuzzy') {
          warnings.push(`Dòng ${rowNum} (${name}): Phân loại "${categoryRaw}" được so khớp gần đúng thành "${catResult.match.name}".`);
        }
      } else {
        warnings.push(`Dòng ${rowNum} (${name}): Phân loại "${categoryRaw}" không tồn tại trong hệ thống, tạm gán vào "${categories[0].name}". Vui lòng kiểm tra lại.`);
      }
    }

    const brandRaw = String(
      row['Thương hiệu'] || row['Brand'] || row['Hang'] || '',
    ).trim();

    const otherBrand = brands.find((b) => b.name === 'Khác') || brands[0];
    let matchedBrand = otherBrand;
    if (!brandRaw) {
      warnings.push(`Dòng ${rowNum} (${name}): Chưa có thông tin thương hiệu, tự động gán vào "${otherBrand.name}".`);
    } else {
      const brandResult = findBestMatch(brandRaw, brands);
      if (brandResult.match) {
        matchedBrand = brandResult.match;
        if (brandResult.confidence === 'fuzzy') {
          warnings.push(`Dòng ${rowNum} (${name}): Thương hiệu "${brandRaw}" được so khớp gần đúng thành "${brandResult.match.name}".`);
        }
      } else {
        matchedBrand = otherBrand;
        warnings.push(`Dòng ${rowNum} (${name}): Thương hiệu "${brandRaw}" không có trong danh sách phân hạng, tự động gán vào "${otherBrand.name}".`);
      }
    }

    const size = String(row['Size'] || row['Kích cỡ'] || 'FreeSize').trim();

    let conditionPercent = 95;
    const condVal = row['Độ mới (%)'] || row['Độ mới'] || row['Condition'];
    if (typeof condVal === 'number' && condVal > 0) {
      conditionPercent = Math.min(100, Math.max(50, Math.round(condVal)));
    } else if (typeof condVal === 'string' && condVal) {
      const match = condVal.match(/\d+/);
      if (match) {
        conditionPercent = Math.min(100, Math.max(50, parseInt(match[0], 10)));
      }
    }

    const conditionLabel =
      conditionPercent >= 99
        ? '99% New Tag'
        : conditionPercent >= 95
          ? '95% Like New'
          : conditionPercent >= 90
            ? '90% Rất tốt'
            : conditionPercent >= 85
              ? '85% Tốt'
              : '80% Đạt';

    const priceVal =
      row['Giá niêm yết (VNĐ) (*)'] ||
      row['Giá niêm yết'] ||
      row['Gia niem yet'] ||
      row['Price'] ||
      '';

    let price = 0;
    if (typeof priceVal === 'number') {
      price = priceVal;
    } else if (typeof priceVal === 'string' && priceVal.trim()) {
      const cleaned = priceVal.replace(/[^\d]/g, '');
      price = cleaned ? parseInt(cleaned, 10) : 0;
    }

    if (price <= 0) {
      warnings.push(`Dòng ${rowNum}: Bỏ qua sản phẩm "${name}" vì giá niêm yết không hợp lệ (${priceVal || 'trống'}). Giá phải là số lớn hơn 0.`);
      return;
    }

    const brandRate =
      matchedBrand?.defaultCommissionRate && matchedBrand.defaultCommissionRate > 0
        ? matchedBrand.defaultCommissionRate
        : getBrandTierDefaultRate(matchedBrand?.tier);
    const itemCustomerRate = Math.max(0, 100 - brandRate);
    const customerPayout = Math.round((price * itemCustomerRate) / 100);

    items.push({
      id: `item-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      size,
      category: matchedCategory?.name || 'Đầm & Váy',
      categoryId: matchedCategory?.id || categories[0]?.id || '',
      brandId: matchedBrand?.id || brands[0]?.id || '',
      brand: matchedBrand?.name || '',
      brandTier: matchedBrand?.tier || 'Commercial',
      commissionRate: brandRate,
      condition: conditionLabel,
      conditionPercent,
      listedPrice: price,
      customerPayout,
      images: [],
    });
  });

  return {
    items,
    totalRows: rawRows.length,
    successCount: items.length,
    warnings,
  };
}
