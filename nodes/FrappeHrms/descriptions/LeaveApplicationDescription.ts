import type { INodeProperties } from 'n8n-workflow';

import {
	approvalOperationsFor,
	documentIdField,
	getManyFields,
	omitFields,
} from './CommonDescription';

const STATUS_OPTIONS = [
	{ name: 'Approved', value: 'Approved' },
	{ name: 'Cancelled', value: 'Cancelled' },
	{ name: 'Open', value: 'Open' },
	{ name: 'Rejected', value: 'Rejected' },
];

/**
 * `Leave Application` fields offered on create as well as update.
 *
 * `company`, `department` and `employee_name` are absent by design: the doctype declares
 * them `read_only` with a `fetch_from` on the employee, so Frappe overwrites whatever is
 * sent. `leave_balance` is computed the same way.
 */
const leaveApplicationFields: INodeProperties[] = [
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		description: 'Motif de la demande',
	},
	{
		displayName: 'Employee',
		name: 'employee',
		type: 'string',
		default: '',
		description: 'Champ « name » de l\'employé, par ex. HR-EMP-00001.',
	},
	{
		displayName: 'Follow via Email',
		name: 'follow_via_email',
		type: 'boolean',
		default: true,
		description: "Whether Frappe should notify the approver by email",
	},
	{
		displayName: 'From Date',
		name: 'from_date',
		type: 'dateTime',
		default: '',
		description: 'Premier jour de congé',
	},
	{
		displayName: 'Half Day',
		name: 'half_day',
		type: 'boolean',
		default: false,
		description: 'Whether the leave covers half a day only',
	},
	{
		displayName: 'Half Day Date',
		name: 'half_day_date',
		type: 'dateTime',
		default: '',
		description: 'Jour concerné par la demi-journée, requis lorsque « Half Day » est actif',
	},
	{
		displayName: 'Leave Approver',
		name: 'leave_approver',
		type: 'string',
		default: '',
		description: "Email de l'utilisateur chargé d'approuver la demande",
	},
	{
		displayName: 'Leave Type',
		name: 'leave_type',
		type: 'string',
		default: '',
		description: 'Lien vers un enregistrement du doctype Leave Type, par ex. Casual Leave ou Sick Leave.',
	},
	{
		displayName: 'Posting Date',
		name: 'posting_date',
		type: 'dateTime',
		default: '',
		description: 'Date de dépôt de la demande. Frappe utilise la date du jour si le champ est vide.',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: STATUS_OPTIONS,
		default: 'Open',
		description:
			'Statut de la demande. Le champ est en permlevel 1 dans Frappe : il faut un rôle habilité (Leave Approver, HR Manager) pour l\'écrire.',
	},
	{
		displayName: 'To Date',
		name: 'to_date',
		type: 'dateTime',
		default: '',
		description: 'Dernier jour de congé',
	},
];

const REQUIRED_ON_CREATE = ['employee', 'leave_type', 'from_date', 'to_date'];

export const leaveApplicationDescription: INodeProperties[] = [
	approvalOperationsFor('leaveApplication', 'leave application'),
	{
		displayName: 'Employee',
		name: 'employee',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['leaveApplication'], operation: ['create'] } },
		description: 'Champ « name » de l\'employé, par ex. HR-EMP-00001.',
	},
	{
		displayName: 'Leave Type',
		name: 'leave_type',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['leaveApplication'], operation: ['create'] } },
		description: 'Lien vers un enregistrement du doctype Leave Type, par ex. Casual Leave ou Sick Leave.',
	},
	{
		displayName: 'From Date',
		name: 'from_date',
		type: 'dateTime',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['leaveApplication'], operation: ['create'] } },
		description: 'Premier jour de congé',
	},
	{
		displayName: 'To Date',
		name: 'to_date',
		type: 'dateTime',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['leaveApplication'], operation: ['create'] } },
		description: 'Dernier jour de congé',
	},
	documentIdField(
		'leaveApplication',
		'Champ « name » de l\'enregistrement Frappe. Pour une demande de congé il ressemble à HR-LAP-2026-00001.',
		['get', 'update', 'delete', 'approve', 'reject'],
	),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['leaveApplication'], operation: ['create'] } },
		options: omitFields(leaveApplicationFields, REQUIRED_ON_CREATE),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: { show: { resource: ['leaveApplication'], operation: ['update'] } },
		options: leaveApplicationFields,
	},
	{
		displayName: 'Approval Options',
		name: 'approvalOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: { resource: ['leaveApplication'], operation: ['approve', 'reject'] },
		},
		options: [
			{
				displayName: 'Leave Approver',
				name: 'leave_approver',
				type: 'string',
				default: '',
				description:
					"Email de l'approbateur à inscrire sur la demande avant de la soumettre. Laisser vide conserve celui déjà présent.",
			},
			{
				displayName: 'Submit',
				name: 'submit',
				type: 'boolean',
				default: true,
				description:
					'Whether to submit the document (docstatus 1) after setting the status. Turn this off to leave the application as a draft carrying the new status.',
			},
		],
	},
	...getManyFields('leaveApplication'),
];
