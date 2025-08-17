"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSVGenerator = void 0;
class CSVGenerator {
    /**
     * Generate CSV content from work order data
     * @param workOrders Array of work orders to export
     * @param columns Optional array of column keys to include (defaults to all columns)
     * @returns CSV content as string
     */
    static generateWorkOrderCSV(workOrders, columns) {
        if (workOrders.length === 0) {
            return 'No data available';
        }
        const selectedColumns = this.getSelectedColumns(columns);
        const headerRow = this.generateHeaderRow(selectedColumns);
        const dataRows = this.generateDataRows(workOrders, selectedColumns);
        return [headerRow, ...dataRows].join('\n');
    }
    /**
     * Get columns to include in the CSV export
     */
    static getSelectedColumns(columnKeys) {
        if (!columnKeys) {
            return this.DEFAULT_COLUMNS;
        }
        return this.DEFAULT_COLUMNS.filter(col => columnKeys.includes(col.key));
    }
    /**
     * Generate CSV header row
     */
    static generateHeaderRow(columns) {
        return columns.map(col => this.escapeCSVField(col.label)).join(',');
    }
    /**
     * Generate CSV data rows
     */
    static generateDataRows(workOrders, columns) {
        return workOrders.map(workOrder => {
            return columns.map(col => {
                const value = workOrder[col.key];
                return this.formatCSVValue(value);
            }).join(',');
        });
    }
    /**
     * Format a value for CSV output
     */
    static formatCSVValue(value) {
        if (value === null || value === undefined) {
            return '';
        }
        // Format dates to ISO string
        if (value instanceof Date) {
            return this.escapeCSVField(value.toISOString());
        }
        return this.escapeCSVField(String(value));
    }
    /**
     * Escape field for CSV by wrapping in quotes if necessary
     */
    static escapeCSVField(field) {
        // If field contains comma, newline, or quote, wrap in quotes and escape quotes
        if (field.includes(',') || field.includes('\n') || field.includes('"')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    }
    /**
     * Get available columns for UI purposes
     */
    static getAvailableColumns() {
        return [...this.DEFAULT_COLUMNS];
    }
}
exports.CSVGenerator = CSVGenerator;
CSVGenerator.DEFAULT_COLUMNS = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Title' },
    { key: 'description', label: 'Description' },
    { key: 'category', label: 'Category' },
    { key: 'reason', label: 'Reason' },
    { key: 'location', label: 'Location' },
    { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status' },
    { key: 'reportedAt', label: 'Reported At' },
    { key: 'startedAt', label: 'Started At' },
    { key: 'completedAt', label: 'Completed At' },
    { key: 'solution', label: 'Solution' },
    { key: 'faultCode', label: 'Fault Code' },
    { key: 'assetCode', label: 'Asset Code' },
    { key: 'assetName', label: 'Asset Name' },
    { key: 'createdBy', label: 'Created By' },
    { key: 'assignedTo', label: 'Assigned To' },
    { key: 'resolutionDescription', label: 'Resolution Description' },
];
