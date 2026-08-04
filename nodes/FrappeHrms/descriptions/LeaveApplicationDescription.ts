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
		description: 'The "name" field of the employee, e.g. HR-EMP-00001',
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
		description: 'First day of leave',
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
		description: 'Day the half day falls on, required when "Half Day" is on',
	},
	{
		displayName: 'Leave Approver',
		name: 'leave_approver',
		type: 'string',
		default: '',
		description: 'Email of the user responsible for approving the application',
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
		description: 'Date the application was filed. Frappe uses today when the field is empty.',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: STATUS_OPTIONS,
		default: 'Open',
		description:
			'Application status. The field sits at permlevel 1 in Frappe: an authorised role (Leave Approver, HR Manager) is required to write it.',
	},
	{
		displayName: 'To Date',
		name: 'to_date',
		type: 'dateTime',
		default: '',
		description: 'Last day of leave',
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
		description: 'The "name" field of the employee, e.g. HR-EMP-00001',
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
		description: 'First day of leave',
	},
	{
		displayName: 'To Date',
		name: 'to_date',
		type: 'dateTime',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['leaveApplication'], operation: ['create'] } },
		description: 'Last day of leave',
	},
	documentIdField(
		'leaveApplication',
		'The Frappe record "name" field. For a leave application it looks like HR-LAP-2026-00001.',
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
					'Email of the approver to set on the application before submitting it. Leaving it empty keeps the one already there.',
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
