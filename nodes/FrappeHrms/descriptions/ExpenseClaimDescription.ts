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
		displayName: 'Company Name or ID',
		name: 'company',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getCompanies' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Cost Center Name or ID',
		name: 'cost_center',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getCostCenters' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Currency Name or ID',
		name: 'currency',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getCurrencies' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Employee',
		name: 'employee',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'The "name" field of the employee, e.g. HR-EMP-00001',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchEmployee',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'HR-EMP-00001',
			},
		],
	},
	{
		displayName: 'Expense Approver',
		name: 'expense_approver',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Email of the user responsible for approving the expense claim',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchUser',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'agent@example.com',
			},
		],
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
		displayName: 'Mode of Payment Name or ID',
		name: 'mode_of_payment',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getModesOfPayment' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Payable Account',
		name: 'payable_account',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Link to an Account record',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchAccount',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'Debtors - ACME',
			},
		],
	},
	{
		displayName: 'Posting Date',
		name: 'posting_date',
		type: 'dateTime',
		default: '',
		description: 'Accounting date. Frappe uses today when the field is empty.',
	},
	{
		displayName: 'Project',
		name: 'project',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Link to a Project record',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchProject',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'PROJ-0001',
			},
		],
	},
	{
		displayName: 'Task',
		name: 'task',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Link to a Task record',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchTask',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'TASK-2026-00001',
			},
		],
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
					displayName: 'Cost Center Name or ID',
					name: 'cost_center',
					type: 'options',
					typeOptions: { loadOptionsMethod: 'getCostCenters' },
					default: '',
					description:
						'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
					description: 'Link to an Expense Claim Type record, e.g. Travel or Food',
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

/**
 * Fields exposed at the top level on create, outside the collection.
 *
 * The node imports this list to know which parameters to read there, so the fields
 * drawn here and the fields sent cannot drift apart.
 */
export const EXPENSE_CLAIM_REQUIRED_ON_CREATE = ['employee'];

export const expenseClaimDescription: INodeProperties[] = [
	operationsFor('expenseClaim', 'expense claim'),
	{
		displayName: 'Employee',
		name: 'employee',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: { show: { resource: ['expenseClaim'], operation: ['create'] } },
		description: 'The "name" field of the employee, e.g. HR-EMP-00001',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchEmployee',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'HR-EMP-00001',
			},
		],
	},
	documentIdField(
		'expenseClaim',
		'The Frappe record "name" field. For an expense claim it looks like HR-EXP-2026-00001.',
		undefined,
		'HR-EXP-2026-00001',
	),
	expensesField,
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['expenseClaim'], operation: ['create'] } },
		options: omitFields(expenseClaimFields, EXPENSE_CLAIM_REQUIRED_ON_CREATE),
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
