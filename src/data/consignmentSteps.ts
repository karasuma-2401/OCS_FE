import { Check, PackageCheck, Recycle, Shirt } from 'lucide-react';

export const consignmentSteps = [
  { number: '01', title: 'Chọn và chuẩn bị', description: 'Chọn quần áo còn nguyên vẹn, đã giặt sạch, không rách hỏng hoặc ố màu.', icon: Shirt },
  { number: '02', title: 'Mang đồ đến OCS', description: 'Mang những món đồ bạn muốn ký gửi đến cửa hàng để được tiếp nhận.', icon: PackageCheck },
  { number: '03', title: 'Kiểm tra và thỏa thuận', description: 'Cùng cửa hàng kiểm tra tình trạng, thống nhất giá bán và thông tin ký gửi.', icon: Check },
  { number: '04', title: 'Theo dõi hành trình', description: 'Theo dõi tình trạng bán hàng và việc quyết toán các món đồ ký gửi.', icon: Recycle },
];
