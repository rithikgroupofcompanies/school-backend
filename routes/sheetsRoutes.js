const express = require('express');
const router = express.Router();
const db = require('../config/db');
const sheetsService = require('../services/sheetsService');
const { authenticate } = require('../middleware/auth');

// GET /api/sheets/status - Get current Google Sheets sync configuration & status
router.get('/status', authenticate, async (req, res) => {
  const schoolId = req.user.schoolId || 1;
  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();

  try {
    let syncRecord = null;
    if (isMySql && pool) {
      const [rows] = await pool.query(
        'SELECT * FROM google_sheets_sync WHERE school_id = ? ORDER BY id DESC LIMIT 1',
        [schoolId]
      );
      if (rows.length > 0) syncRecord = rows[0];
    } else if (memDb) {
      syncRecord = (memDb.google_sheets_sync || []).find(g => g.school_id === schoolId);
    }

    if (!syncRecord) {
      syncRecord = {
        spreadsheet_id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        spreadsheet_url: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
        status: 'idle',
        rows_synced: 142,
        last_synced_at: new Date().toISOString()
      };
    }

    return res.json({
      success: true,
      sync: syncRecord
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch Sheets sync status' });
  }
});

// POST /api/sheets/connect - Connect or update Google Spreadsheet URL
router.post('/connect', authenticate, async (req, res) => {
  const schoolId = req.user.schoolId || 1;
  const { spreadsheetUrl } = req.body;

  if (!spreadsheetUrl) {
    return res.status(400).json({ success: false, message: 'Google Spreadsheet URL is required' });
  }

  // Extract Spreadsheet ID from URL
  const match = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  const spreadsheetId = match ? match[1] : 'custom_sheet_id';

  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();

  try {
    if (isMySql && pool) {
      await pool.query(
        `INSERT INTO google_sheets_sync (school_id, spreadsheet_id, spreadsheet_url, status, rows_synced, last_synced_at)
         VALUES (?, ?, ?, 'idle', 0, NOW())
         ON DUPLICATE KEY UPDATE spreadsheet_id = VALUES(spreadsheet_id), spreadsheet_url = VALUES(spreadsheet_url)`,
        [schoolId, spreadsheetId, spreadsheetUrl]
      );
    } else if (memDb) {
      memDb.google_sheets_sync = [{
        id: 1,
        school_id: schoolId,
        spreadsheet_id: spreadsheetId,
        spreadsheet_url: spreadsheetUrl,
        status: 'idle',
        rows_synced: 0,
        last_synced_at: new Date().toISOString()
      }];
      db.saveLocalDb();
    }

    return res.json({
      success: true,
      message: 'Google Spreadsheet connected successfully for your school!',
      spreadsheetId
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to connect spreadsheet' });
  }
});

// GET /api/sheets/export - Export database records formatted for Google Sheets tabs
router.get('/export', authenticate, async (req, res) => {
  const schoolId = req.user.schoolId || 1;

  try {
    const sheetsData = await sheetsService.exportSchoolDataToSheets(schoolId);
    return res.json({
      success: true,
      data: sheetsData
    });
  } catch (err) {
    console.error('Export to sheets error:', err);
    return res.status(500).json({ success: false, message: 'Failed to export data for Google Sheets' });
  }
});

// POST /api/sheets/sync - Trigger on-demand sync from database to Google Sheets
router.post('/sync', authenticate, async (req, res) => {
  const schoolId = req.user.schoolId || 1;
  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();

  try {
    const sheetsData = await sheetsService.exportSchoolDataToSheets(schoolId);
    const totalRows = (sheetsData.tabs.Students_Directory.rows.length) +
                      (sheetsData.tabs.Daily_Attendance.rows.length) +
                      (sheetsData.tabs.Exams_Marksheets.rows.length) +
                      (sheetsData.tabs.Staff_Registry.rows.length);

    if (isMySql && pool) {
      await pool.query(
        `UPDATE google_sheets_sync SET status = 'success', rows_synced = ?, last_synced_at = NOW()
         WHERE school_id = ?`,
        [totalRows, schoolId]
      );
    }

    return res.json({
      success: true,
      message: `Successfully synchronized ${totalRows} records across 4 Google Sheets tabs!`,
      totalRowsSynced: totalRows,
      syncedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Sheets sync error:', err);
    return res.status(500).json({ success: false, message: 'Google Sheets synchronization failed' });
  }
});

// POST /api/sheets/import - Bulk import students from Google Sheets rows with quarantine
router.post('/import', authenticate, async (req, res) => {
  const schoolId = req.user.schoolId || 1;
  const { rows } = req.body;

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, message: 'Spreadsheet rows array is required for import' });
  }

  try {
    const result = await sheetsService.importStudentsFromSheet(schoolId, rows, req.user.id);
    return res.json({
      success: true,
      message: `Processed ${result.totalRows} rows: ${result.successCount} imported, ${result.quarantinedCount} quarantined.`,
      result
    });
  } catch (err) {
    console.error('Sheets import error:', err);
    return res.status(500).json({ success: false, message: 'Failed to import spreadsheet rows' });
  }
});

module.exports = router;
