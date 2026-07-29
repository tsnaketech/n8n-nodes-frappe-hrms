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
			"Décision de l'approbateur. Distincte de « status », que Frappe calcule à partir du docstatus et du paiement.",
	},
	{
		displayName: 'Company',
		name: 'company',
		type: 'string',
		default: '',
		description:
			"Lien vers un enregistrement du doctype Company. Frappe le déduit de l'employé lorsqu'il est laissé vide.",
	},
	{
		displayName: 'Cost Center',
		name: 'cost_center',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Cost Center',
	},
	{
		displayName: 'Employee',
		name: 'employee',
		type: 'string',
		default: '',
		description: 'Champ « name » de l\'employé, par ex. HR-EMP-00001.',
	},
	{
		displayName: 'Expense Approver',
		name: 'expense_approver',
		type: 'string',
		default: '',
		description: "Email de l'utilisateur chargé d'approuver la note de frais",
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
		'Lignes de la note de frais. Au moins une ligne est obligatoire à la création. Sur « Update », les lignes fournies remplacent la table existante.',
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
					description: 'Montant réclamé, dans la devise de la note de frais',
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
					description: 'Détail de la dépense',
				},
				{
					displayName: 'Expense Date',
					name: 'expense_date',
					type: 'dateTime',
					default: '',
					description: 'Date de la dépense',
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
						'Montant validé par l\'approbateur. Frappe le recopie du montant réclamé si le champ est vide.',
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
		description: 'Champ « name » de l\'employé, par ex. HR-EMP-00001.',
	},
	documentIdField(
		'expenseClaim',
		'Champ « name » de l\'enregistrement Frappe. Pour une note de frais il ressemble à HR-EXP-2026-00001.',
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
