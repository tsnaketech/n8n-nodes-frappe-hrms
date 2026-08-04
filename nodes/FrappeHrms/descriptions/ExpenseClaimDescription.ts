import type { INodeProperties } from 'n8n-workflow';

import { documentIdField, getManyFields, omitFields, operationsFor } from './CommonDescription';

/** `Expense Claim` fields offered on create as well as update. */
const expenseClaimFields: INodeProperties[] = [
	{
		displayName: 'Approval Status',
		name: 'approval_status',
		type: 'options',
		options: [
			{ name: 'Approved', value: 'Approved' },
			{ name: 'Cancelled', value: 'Cancelled' },
			{ name: 'Draft', value: 'Draft' },
			{ name: 'Rejected', value: 'Rejected' },
		],
		default: 'Draft',
		description:
			'The approver decision. Distinct from "status", which Frappe computes from the docstatus and the payment.',
	},
	{
		displayName: 'Company',
		name: 'company',
		type: 'string',
		default: '',
		description:
			'Link to a Company doctype record. Frappe infers it from the employee when left empty.',
	},
	{
		displayName: 'Cost Center',
		name: 'cost_center',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Cost Center',
	},
	{
		displayName: 'Currency',
		name: 'currency',
		type: 'string',
		default: '',
		description:
			'Link to a Currency doctype record. Mandatory since Frappe HR v16, but Frappe reads it from the employee salary_currency: leave it empty unless the claim is in another currency.',
	},
	{
		displayName: 'Employee',
		name: 'employee',
		type: 'string',
		default: '',
		description: 'The "name" field of the employee, e.g. HR-EMP-00001',
	},
	{
		displayName: 'Expense Approver',
		name: 'expense_approver',
		type: 'string',
		default: '',
		description: 'Email of the user responsible for approving the expense claim',
	},
	{
		displayName: 'Exchange Rate',
		name: 'exchange_rate',
		type: 'number',
		default: 1,
		description:
			'Conversion rate to the company currency. Mandatory since Frappe HR v16: the node sends 1 when the field is left empty, which is the correct rate as long as the claim is in the company currency. Set it for any other currency.',
	},
	{
		displayName: 'Is Paid',
		name: 'is_paid',
		type: 'boolean',
		default: false,
		description: 'Whether the expense was already paid by the company',
	},
	{
		displayName: 'Mode of Payment',
		name: 'mode_of_payment',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Mode of Payment',
	},
	{
		displayName: 'Payable Account',
		name: 'payable_account',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Account',
	},
	{
		displayName: 'Posting Date',
		name: 'posting_date',
		type: 'dateTime',
		default: '',
		description: 'Date de comptabilisation. Frappe utilise la date du jour si le champ est vide.',
	},
	{
		displayName: 'Project',
		name: 'project',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Project',
	},
	{
		displayName: 'Task',
		name: 'task',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Task',
	},
];

/**
 * Lines of the `expenses` child table (`Expense Claim Detail`).
 *
 * Frappe refuses an expense claim without at least one line: the table is `reqd` on the
 * parent doctype, and `expense_type` and `amount` are `reqd` on each row.
 */
const expensesField: INodeProperties = {
	displayName: 'Expenses',
	name: 'expenses',
	type: 'fixedCollection',
	typeOptions: { multipleValues: true },
	placeholder: 'Add expense',
	default: {},
	displayOptions: { show: { resource: ['expenseClaim'], operation: ['create', 'update'] } },
	description:
		'Expense claim rows. At least one row is mandatory on creation. On "Update", the rows provided replace the existing table.',
	options: [
		{
			name: 'expense',
			displayName: 'Expense',
			values: [
				{
					displayName: 'Amount',
					name: 'amount',
					type: 'number',
					default: 0,
					required: true,
					description: 'Claimed amount, in the currency of the expense claim',
				},
				{
					displayName: 'Cost Center',
					name: 'cost_center',
					type: 'string',
					default: '',
					description: 'Lien vers un enregistrement du doctype Cost Center',
				},
				{
					displayName: 'Description',
					name: 'description',
					type: 'string',
					typeOptions: { rows: 2 },
					default: '',
					description: 'Expense details',
				},
				{
					displayName: 'Expense Date',
					name: 'expense_date',
					type: 'dateTime',
					default: '',
				},
				{
					displayName: 'Expense Type',
					name: 'expense_type',
					type: 'string',
					default: '',
					required: true,
					description: 'Lien vers un enregistrement du doctype Expense Claim Type, par ex. Travel ou Food.',
				},
				{
					displayName: 'Sanctioned Amount',
					name: 'sanctioned_amount',
					type: 'number',
					default: 0,
					description:
						'Amount sanctioned by the approver. Frappe copies it from the claimed amount when the field is empty.',
				},
			],
		},
	],
};

export const expenseClaimDescription: INodeProperties[] = [
	operationsFor('expenseClaim', 'expense claim'),
	{
		displayName: 'Employee',
		name: 'employee',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['expenseClaim'], operation: ['create'] } },
		description: 'The "name" field of the employee, e.g. HR-EMP-00001',
	},
	documentIdField(
		'expenseClaim',
		'The Frappe record "name" field. For an expense claim it looks like HR-EXP-2026-00001.',
	),
	expensesField,
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['expenseClaim'], operation: ['create'] } },
		options: omitFields(expenseClaimFields, ['employee']),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['expenseClaim'], operation: ['update'] } },
		options: expenseClaimFields,
	},
	...getManyFields('expenseClaim'),
];
