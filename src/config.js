// ============================================================================
//  CẤU HÌNH KHẢO SÁT  -  sửa các giá trị dưới đây trước khi dùng
// ============================================================================

// 1. API_URL: Dán Web App URL từ Apps Script (sau khi Deploy → New deployment)
export const API_URL =
  'https://script.google.com/macros/s/AKfycbyj8MjDthIGBC_7IbSQ0yVbE2L0kQ1WEiRAW-c-P5M9b7ZtASVinjhEGMr7DCnIfRwj1Q/exec';

// 2. Role của nhóm đang khảo sát
export const ROLE = 'Developer';

// 3. Tuần/giai đoạn khảo sát (hiển thị ở header)
export const SURVEY_PERIOD = '18/3 - 18/4/2026';

// 4. Danh sách dự án (dropdown chọn ở form)
export const PROJECTS = [
  'Javis Sale',
  'Javis Biz',
  'P2P Lending',
  'Internal Tools',
];

// 5. Danh sách task hàng ngày của role này
export const TASKS = [
  'Đọc hiểu requirement / spec',
  'Code feature mới',
  'Viết unit test',
  'Review Pull Request',
  'Fix bug / Debug production',
  'Viết technical documentation',
  'Refactor code',
  'Thiết kế giải pháp / chọn architecture',
  'Query/optimize database',
  'Setup CI/CD, deploy',
  'Họp daily / planning / retro',
  'Research công nghệ mới',
  'Viết testcase',
  'Tạo test design',
  'Excute test',
];

// 6. AI Tools cho chọn (có thể thêm bớt)
export const AI_TOOLS = [
  'Claude',
  'ChatGPT',
  'Gemini',
  'Visily',
  'Figma AI',
  'GitHub Copilot',
  'Cursor',
];

// 7. Màu chủ đạo
export const PRIMARY = '#534AB7';
export const PRIMARY_LIGHT = '#EDEBFA';
