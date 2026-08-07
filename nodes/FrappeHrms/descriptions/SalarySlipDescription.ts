import type { INodeProperties } from 'n8n-workflow';

import { documentIdField, getManyFields, readOperationsFor } from './CommonDescription';

/**
 * `Salary Slip` is exposed read-only.
 *
 * The doctype is produced by the payroll run (`Payroll Entry`), which computes every
 * earning, deduction and tax line from the salary structure. Creating or editing a slip
 * through the REST API would either be overwritten by the next run or produce a document
 * inconsistent with its own child tables.
 */
export const salarySlipDescription: INodeProperties[] = [
	readOperationsFor('salarySlip', 'salary slip'),
	documentIdField(
		'salarySlip',
		'The Frappe record "name" field. For a salary slip it looks like Sal Slip/HR-EMP-00001/00001.',
		['get'],
		'Sal Slip/HR-EMP-00001/00001',
	),
	...getManyFields('salarySlip'),
];
