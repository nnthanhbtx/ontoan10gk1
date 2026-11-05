import { LeaderboardEntry } from '../types/exam';

export const GOOGLE_SHEET_URL_STORAGE_KEY = 'math10_google_sheet_webapp_url_v1';
export const GOOGLE_SHEET_AUTO_SYNC_STORAGE_KEY = 'math10_google_sheet_auto_sync_v1';

export const formatDurationVi = (seconds: number): string => {
  const safeSec = Math.max(1, Math.floor(seconds || 0));
  const mins = Math.floor(safeSec / 60);
  const secs = safeSec % 60;
  return `${mins}p ${secs < 10 ? '0' : ''}${secs}s`;
};

/**
 * Mã nguồn Google Apps Script (Mã.gs) chuẩn để dán trực tiếp vào trình biên tập Apps Script của Google Sheet
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * MÃ KẾT NỐI ỨNG DỤNG KHẢO THÍ TOÁN 10 VỚI GOOGLE SHEET
 * Hướng dẫn: Xoá dòng "function myFunction() {}" mặc định, dán toàn bộ mã này vào tệp Mã.gs
 * Sau đó nhấn Lưu (Ctrl + S) -> Triển khai -> Tùy chọn triển khai mới -> Ứng dụng web (Quyền truy cập: Bất kỳ ai)
 */

const SHEET_NAME = 'KetQuaThiToan10';

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];

  // Nếu trang tính chưa có dòng tiêu đề thì tự động khởi tạo tiêu đề chuẩn
  if (sheet.getLastRow() === 0) {
    const headers = [
      'STT',
      'Thời gian nộp bài',
      'Họ và tên học sinh',
      'Lớp',
      'Đề thi',
      'Điểm Phần I (3.0đ)',
      'Điểm Phần II (2.0đ)',
      'Điểm Phần III (2.0đ)',
      'Điểm Phần IV (3.0đ)',
      'Tổng điểm (10đ)',
      'Thời gian làm bài',
      'Xếp loại',
      'Số giây',
      'Mã bài làm'
    ];
    sheet.appendRow(headers);

    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#0b1739');
    headerRange.setFontColor('#ffffff');
    headerRange.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Nhận dữ liệu điểm thi từ App gửi lên (POST)
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const sheet = getOrCreateSheet();
    const rawData = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const payload = JSON.parse(rawData);
    const action = payload.action || 'append_score';

    // 1. Kiểm tra kết nối và khởi tạo bảng
    if (action === 'test_connection') {
      return jsonResponse({
        status: 'success',
        message: 'Đã kết nối thành công với Google Sheet: ' + SpreadsheetApp.getActiveSpreadsheet().getName(),
        sheetName: sheet.getName(),
        totalRows: Math.max(0, sheet.getLastRow() - 1)
      });
    }

    // 2. Ghi thêm 1 kết quả vừa nộp bài
    if (action === 'append_score' && payload.entry) {
      const item = payload.entry;
      const nextIndex = Math.max(1, sheet.getLastRow());
      const submittedTime = item.submittedAtFormatted || Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');

      sheet.appendRow([
        nextIndex,
        submittedTime,
        item.studentName || 'Học sinh Lớp 10',
        item.className || '10A1',
        'Đề ' + (item.examTitle || '03'),
        Number(item.part1Score || 0),
        Number(item.part2Score || 0),
        Number(item.part3Score || 0),
        Number(item.part4Score || 0),
        Number(item.totalScore || 0),
        item.durationFormatted || '',
        item.rank || '',
        Number(item.durationSeconds || 0),
        item.id || ('id-' + new Date().getTime())
      ]);

      return jsonResponse({
        status: 'success',
        message: 'Đã lưu kết quả của học sinh ' + item.studentName + ' vào Google Sheet.'
      });
    }

    // 3. Đồng bộ hàng loạt từ Bảng xếp hạng (tránh trùng lặp theo Mã bài làm)
    if (action === 'sync_all' && Array.isArray(payload.entries)) {
      const lastRow = sheet.getLastRow();
      const existingIds = new Set();

      if (lastRow > 1) {
        const idValues = sheet.getRange(2, 14, lastRow - 1, 1).getValues();
        for (let i = 0; i < idValues.length; i++) {
          if (idValues[i][0]) existingIds.add(String(idValues[i][0]).trim());
        }
      }

      let addedCount = 0;
      payload.entries.forEach(function(item) {
        const entryId = String(item.id || '');
        if (!entryId || !existingIds.has(entryId)) {
          const nextIndex = Math.max(1, sheet.getLastRow());
          const submittedTime = item.submittedAtFormatted || Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');
          sheet.appendRow([
            nextIndex,
            submittedTime,
            item.studentName || 'Học sinh Lớp 10',
            item.className || '10A1',
            'Đề ' + (item.examTitle || '03'),
            Number(item.part1Score || 0),
            Number(item.part2Score || 0),
            Number(item.part3Score || 0),
            Number(item.part4Score || 0),
            Number(item.totalScore || 0),
            item.durationFormatted || '',
            item.rank || '',
            Number(item.durationSeconds || 0),
            entryId || ('id-' + new Date().getTime())
          ]);
          if (entryId) existingIds.add(entryId);
          addedCount++;
        }
      });

      return jsonResponse({
        status: 'success',
        addedCount: addedCount,
        message: 'Đã đồng bộ thêm ' + addedCount + ' kết quả mới lên Google Sheet.'
      });
    }

    return jsonResponse({ status: 'error', message: 'Yêu cầu không hợp lệ.' });
  } catch (err) {
    return jsonResponse({ status: 'error', message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Tải danh sách điểm từ Google Sheet về App (GET)
function doGet(e) {
  try {
    const sheet = getOrCreateSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return jsonResponse({ status: 'success', entries: [] });
    }

    const data = sheet.getRange(2, 1, lastRow - 1, 14).getValues();
    const entries = data.map(function(row, idx) {
      const rawExamTitle = String(row[4] || '03').replace(/^Đề\\s*/i, '').trim();
      return {
        id: String(row[13] || ('sheet-row-' + (idx + 2))),
        submittedAt: String(row[1] || new Date().toISOString()),
        studentName: String(row[2] || 'Học sinh'),
        className: String(row[3] || '10A1'),
        examId: 'de-so-' + rawExamTitle.padStart(2, '0'),
        examTitle: rawExamTitle || '03',
        part1Score: Number(row[5] || 0),
        part2Score: Number(row[6] || 0),
        part3Score: Number(row[7] || 0),
        part4Score: Number(row[8] || 0),
        totalScore: Number(row[9] || 0),
        durationSeconds: Number(row[12] || 1200),
        rank: String(row[11] || 'Khá')
      };
    });

    return jsonResponse({
      status: 'success',
      sheetName: sheet.getName(),
      entries: entries
    });
  } catch (err) {
    return jsonResponse({ status: 'error', message: String(err) });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;

export function getSavedGoogleSheetUrl(): string {
  try {
    return (localStorage.getItem(GOOGLE_SHEET_URL_STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function saveGoogleSheetUrl(url: string): void {
  try {
    localStorage.setItem(GOOGLE_SHEET_URL_STORAGE_KEY, url.trim());
  } catch {
    // ignore
  }
}

export function getSavedAutoSyncSheet(): boolean {
  try {
    const val = localStorage.getItem(GOOGLE_SHEET_AUTO_SYNC_STORAGE_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function saveAutoSyncSheet(enabled: boolean): void {
  try {
    localStorage.setItem(GOOGLE_SHEET_AUTO_SYNC_STORAGE_KEY, String(enabled));
  } catch {
    // ignore
  }
}

const formatEntryPayload = (entry: LeaderboardEntry) => {
  const dt = new Date(entry.submittedAt || Date.now());
  const submittedAtFormatted = dt.toLocaleString('vi-VN', {
    hour12: false,
  });
  return {
    ...entry,
    submittedAtFormatted,
    durationFormatted: formatDurationVi(entry.durationSeconds),
  };
};

export async function testGoogleSheetConnection(
  webAppUrl: string
): Promise<{ ok: boolean; message: string }> {
  const cleanUrl = webAppUrl.trim();
  if (!cleanUrl || !cleanUrl.startsWith('https://script.google.com/')) {
    return {
      ok: false,
      message:
        'URL không hợp lệ. URL Web App phải bắt đầu bằng https://script.google.com/macros/s/.../exec',
    };
  }

  try {
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ action: 'test_connection' }),
    });

    const data = await res.json();
    if (data && data.status === 'success') {
      return {
        ok: true,
        message:
          data.message ||
          'Kết nối thành công! Trang tính Google Sheet đã sẵn sàng nhận điểm thi.',
      };
    }
    return {
      ok: false,
      message: data?.message || 'Không nhận được phản hồi hợp lệ từ Google Apps Script.',
    };
  } catch {
    return {
      ok: false,
      message:
        'Không thể kết nối tới URL này. Hãy kiểm tra lại bước Triển khai -> Quyền truy cập: "Bất kỳ ai" (Anyone) và đảm bảo URL kết thúc bằng /exec.',
    };
  }
}

export async function sendEntryToGoogleSheet(
  webAppUrl: string,
  entry: LeaderboardEntry
): Promise<{ ok: boolean; message: string }> {
  const cleanUrl = webAppUrl.trim();
  if (!cleanUrl) {
    return { ok: false, message: 'Chưa cấu hình URL Google Sheet.' };
  }

  try {
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'append_score',
        entry: formatEntryPayload(entry),
      }),
    });

    const data = await res.json();
    if (data && data.status === 'success') {
      return {
        ok: true,
        message: data.message || 'Đã gửi điểm thi lên Google Sheet thành công!',
      };
    }
    return {
      ok: false,
      message: data?.message || 'Gửi điểm lên Google Sheet chưa thành công.',
    };
  } catch {
    // Fallback mode no-cors in case of strict browser redirect policy
    try {
      await fetch(cleanUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'append_score',
          entry: formatEntryPayload(entry),
        }),
      });
      return {
        ok: true,
        message: 'Đã gửi dữ liệu bài thi tới Google Sheet!',
      };
    } catch {
      return {
        ok: false,
        message: 'Lỗi mạng khi gửi dữ liệu lên Google Sheet.',
      };
    }
  }
}

export async function syncAllEntriesToGoogleSheet(
  webAppUrl: string,
  entries: LeaderboardEntry[]
): Promise<{ ok: boolean; message: string }> {
  const cleanUrl = webAppUrl.trim();
  if (!cleanUrl) {
    return { ok: false, message: 'Vui lòng dán URL Web App Google Sheet trước khi đồng bộ.' };
  }

  try {
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'sync_all',
        entries: entries.map(formatEntryPayload),
      }),
    });

    const data = await res.json();
    if (data && data.status === 'success') {
      return {
        ok: true,
        message:
          data.message || `Đã đồng bộ ${entries.length} kết quả lên Google Sheet thành công!`,
      };
    }
    return {
      ok: false,
      message: data?.message || 'Đồng bộ dữ liệu chưa thành công.',
    };
  } catch {
    return {
      ok: false,
      message:
        'Không thể đồng bộ. Vui lòng kiểm tra lại URL Web App (kết thúc bằng /exec) và quyền truy cập "Bất kỳ ai".',
    };
  }
}

export async function fetchEntriesFromGoogleSheet(
  webAppUrl: string
): Promise<{ ok: boolean; entries?: LeaderboardEntry[]; message: string }> {
  const cleanUrl = webAppUrl.trim();
  if (!cleanUrl) {
    return { ok: false, message: 'Vui lòng dán URL Web App Google Sheet trước khi tải dữ liệu.' };
  }

  try {
    const res = await fetch(cleanUrl, {
      method: 'GET',
    });
    const data = await res.json();
    if (data && data.status === 'success' && Array.isArray(data.entries)) {
      const validRanks = new Set([
        'Xuất sắc',
        'Giỏi',
        'Khá',
        'Trung bình',
        'Cần cố gắng',
      ]);
      const normalized: LeaderboardEntry[] = data.entries.map((item: any, idx: number) => ({
        id: String(item.id || `sheet-${idx}-${Date.now()}`),
        studentName: String(item.studentName || 'Học sinh Lớp 10'),
        className: String(item.className || '10A1'),
        examId: String(item.examId || 'de-so-03'),
        examTitle: String(item.examTitle || '03'),
        totalScore: Number(item.totalScore || 0),
        part1Score: Number(item.part1Score || 0),
        part2Score: Number(item.part2Score || 0),
        part3Score: Number(item.part3Score || 0),
        part4Score: Number(item.part4Score || 0),
        durationSeconds: Number(item.durationSeconds || 1200),
        rank: validRanks.has(item.rank) ? item.rank : 'Khá',
        submittedAt: String(item.submittedAt || new Date().toISOString()),
      }));

      return {
        ok: true,
        entries: normalized,
        message: `Đã tải thành công ${normalized.length} kết quả học sinh từ Google Sheet!`,
      };
    }
    return {
      ok: false,
      message: data?.message || 'Không đọc được danh sách kết quả từ Google Sheet.',
    };
  } catch {
    return {
      ok: false,
      message:
        'Không thể tải dữ liệu từ Google Sheet. Hãy kiểm tra URL Web App và quyền truy cập "Bất kỳ ai".',
    };
  }
}
